import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { preferValidateOverRefine } from '../../eslint/rules/prefer-validate-over-refine.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('prefer-validate-over-refine', preferValidateOverRefine, {
  valid: [
    // --- Callee is not `refine` -------------------------------------------
    // superRefine is never flagged (issue emission validate cannot express)
    { code: 'z.superRefine((arr, ctx) => { ctx.addIssue({}); })' },
    // bare superRefine identifier
    { code: 'superRefine((arr, ctx) => {})' },
    // unrelated function with a convertible-looking shape
    { code: 'somethingElse((o) => o.a === o.b)' },
    // member call whose property is not `refine`
    { code: 'z.validate((o) => o.a === o.b)' },
    // computed member callee -> getCalleeName returns null
    { code: "z['refine']((o) => o.a === o.b)" },
    // callee is itself a call (factory) -> no identifier name
    { code: 'getRefiner()((o) => o.a === o.b)' },

    // --- Predicate not provably a sync boolean ----------------------------
    // (async predicates are advised toward validateAsync; see invalid cases)
    // superRefine with an async predicate -> callee is not refine, never flagged
    { code: 'z.superRefine(async (arr, ctx) => { await check(arr); })' },
    // computed-member refine with an async predicate -> no identifier callee name
    { code: "z['refine'](async (obj) => await check(obj))" },
    // ctx (second) param -> superRefine semantics
    { code: 'z.refine((arr, ctx) => { ctx.addIssue({}); })' },
    // ctx param on a function expression
    { code: 'z.refine(function (arr, ctx) {}, { error: "x" })' },
    // predicate passed by reference -> cannot prove sync boolean
    { code: 'z.refine(myPredicate)' },
    { code: 'z.refine(myPredicate, { error: "x" })' },
    // no arguments at all -> predicate undefined
    { code: 'z.refine()' },

    // --- Options object uses keys validate cannot forward -----------------
    // raw `when` payload access -> not convertible
    { code: 'z.refine((o) => ok(o), { when: (p) => p.value })' },
    { code: 'z.refine((o) => ok(o), { when: (p) => p.value, error: "x" })' },
    // custom params beyond a message
    { code: 'z.refine((o) => ok(o), { params: { code: "custom" } })' },
    // abort flag is refine-only
    { code: 'z.refine((o) => ok(o), { abort: true })' },
    // mixed: one forwardable + one blocked key
    { code: 'z.refine((o) => ok(o), { path: ["a"], abort: true })' },
    // computed key in options object
    { code: 'z.refine((o) => ok(o), { [dynamic]: 1 })' },
    // spread inside options object (not a plain Property)
    { code: 'z.refine((o) => ok(o), { ...rest, error: "x" })' },
    // non-Identifier key (string-literal key) -> blocked
    { code: 'z.refine((o) => ok(o), { "error": "x" })' },
    // options is an identifier, not an object literal
    { code: 'z.refine((o) => ok(o), opts)' },
    // options already a bare error string (refine signature; left alone)
    { code: 'z.refine((o) => ok(o), "mismatch")' },

    // --- Arity / spread guards --------------------------------------------
    // more than two arguments
    { code: 'z.refine((o) => ok(o), { error: "x" }, extra)' },
    // spread element in the argument list
    { code: 'z.refine(...args)' },
    { code: 'z.refine((o) => ok(o), ...rest)' },
  ],
  invalid: [
    // --- Async predicate: advisory toward validateAsync, never fixed ------
    {
      code: 'z.refine(async (obj) => await check(obj))',
      // No `output` -> asserts the rule does NOT autofix this case.
      errors: [
        {
          messageId: 'preferValidateAsync',
          data: { refineName: 'z.refine', asyncName: 'z.validateAsync' },
        },
      ],
    },
    // async function expression
    {
      code: 'z.refine(async function (obj) { return await check(obj); })',
      errors: [{ messageId: 'preferValidateAsync' }],
    },
    // async predicate with refine-only options -> still advised (async wins)
    {
      code: 'z.refine(async (o) => ok(o), { when: (p) => p.value })',
      errors: [{ messageId: 'preferValidateAsync' }],
    },
    // async predicate with a ctx param -> async footgun still reported
    {
      code: 'z.refine(async (o, ctx) => { await ctx.check(o); })',
      errors: [{ messageId: 'preferValidateAsync' }],
    },
    // bare (non-member) async refine import -> validateAsync without namespace
    {
      code: 'refine(async (obj) => await check(obj))',
      errors: [
        {
          messageId: 'preferValidateAsync',
          data: { refineName: 'refine', asyncName: 'validateAsync' },
        },
      ],
    },
    // aliased namespace object is preserved in the advisory names
    {
      code: 'schema.refine(async (obj) => await check(obj))',
      errors: [
        {
          messageId: 'preferValidateAsync',
          data: { refineName: 'schema.refine', asyncName: 'schema.validateAsync' },
        },
      ],
    },

    // --- No options object: callee rename only ----------------------------
    {
      code: 'z.refine((o) => o.a === o.b)',
      output: 'z.validate((o) => o.a === o.b)',
      errors: [
        {
          messageId: 'preferValidate',
          data: { refineName: 'z.refine', validateName: 'z.validate' },
        },
      ],
    },
    // function-expression predicate, single param, sync
    {
      code: 'z.refine(function (o) { return o.a === o.b; })',
      output: 'z.validate(function (o) { return o.a === o.b; })',
      errors: [{ messageId: 'preferValidate' }],
    },
    // zero-param predicate is still convertible (arity <= 1)
    {
      code: 'z.refine(() => true)',
      output: 'z.validate(() => true)',
      errors: [{ messageId: 'preferValidate' }],
    },

    // --- only `error` -> collapse to the string overload ------------------
    {
      code: "z.refine((o) => o.a === o.b, { error: 'mismatch' })",
      output: "z.validate((o) => o.a === o.b, 'mismatch')",
      errors: [{ messageId: 'preferValidate' }],
    },
    // error value can be any expression, copied verbatim
    {
      code: 'z.refine((o) => ok(o), { error: messages.mismatch })',
      output: 'z.validate((o) => ok(o), messages.mismatch)',
      errors: [{ messageId: 'preferValidate' }],
    },

    // --- forwardable multi-key object: keep options, rename callee --------
    {
      code: "z.refine((o) => ok(o), { path: ['a'], error: 'x' })",
      output: "z.validate((o) => ok(o), { path: ['a'], error: 'x' })",
      errors: [{ messageId: 'preferValidate' }],
    },
    // only `path` (no error) -> object kept, not collapsed
    {
      code: "z.refine((o) => ok(o), { path: ['a'] })",
      output: "z.validate((o) => ok(o), { path: ['a'] })",
      errors: [{ messageId: 'preferValidate' }],
    },

    // --- bare (non-member) refine import ----------------------------------
    {
      code: 'refine((o) => o.a === o.b)',
      output: 'validate((o) => o.a === o.b)',
      errors: [
        {
          messageId: 'preferValidate',
          data: { refineName: 'refine', validateName: 'validate' },
        },
      ],
    },
    {
      code: "refine((o) => ok(o), { error: 'x' })",
      output: "validate((o) => ok(o), 'x')",
      errors: [{ messageId: 'preferValidate' }],
    },

    // --- aliased namespace object (member object text is preserved) -------
    {
      code: "schema.refine((o) => ok(o), { error: 'x' })",
      output: "schema.validate((o) => ok(o), 'x')",
      errors: [
        {
          messageId: 'preferValidate',
          data: { refineName: 'schema.refine', validateName: 'schema.validate' },
        },
      ],
    },
  ],
});
