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

// Prepends an `import { z } from 'form-state'` so a member-call snippet like
// `z.refine(...)` is rooted in a form-state binding (the rule's precondition).
const fs = (code) => `import { z } from 'form-state';\n${code}`;
// Same, but for the bare `refine`/`validate` import path.
const fsBare = (code) => `import { refine, validate, validateAsync } from 'form-state';\n${code}`;

ruleTester.run('prefer-validate-over-refine', preferValidateOverRefine, {
  valid: [
    // --- Not rooted in a form-state import --------------------------------
    // `z` imported from zod, not form-state -> out of scope
    { code: "import { z } from 'zod';\nz.refine((o) => o.a === o.b)" },
    // `z` imported from a zod subpath -> still out of scope
    { code: "import { z } from 'zod/v4';\nz.refine((o) => o.a === o.b)" },
    // arbitrary built schema (local binding, not an import) -> out of scope
    { code: 'const schema = build();\nschema.refine((o) => o.a === o.b)' },
    // bare `refine` with no import at all -> unresolved, out of scope
    { code: 'refine((o) => o.a === o.b)' },
    // bare `refine` imported from elsewhere -> out of scope
    { code: "import { refine } from 'other';\nrefine((o) => o.a === o.b)" },
    // package whose name merely starts with form-state -> not a subpath, out of scope
    { code: "import { z } from 'form-state-extras';\nz.refine((o) => o.a === o.b)" },
    // member object is a form-state import but used as a plain call elsewhere;
    // here the object `other` is a non-form-state import
    { code: "import { other } from 'form-helpers';\nother.refine((o) => o.a === o.b)" },
    // member object is itself a member expression (not a bare Identifier) ->
    // we don't resolve nested objects, so out of scope
    { code: fs('z.schema.refine((o) => o.a === o.b)') },

    // --- Callee is not `refine` (form-state rooted) -----------------------
    // superRefine is never flagged (issue emission validate cannot express)
    { code: fs('z.superRefine((arr, ctx) => { ctx.addIssue({}); })') },
    // unrelated function with a convertible-looking shape
    { code: fs('somethingElse((o) => o.a === o.b)') },
    // member call whose property is not `refine`
    { code: fs('z.validate((o) => o.a === o.b)') },
    // computed member callee -> getCalleeName returns null
    { code: fs("z['refine']((o) => o.a === o.b)") },
    // callee is itself a call (factory) -> no identifier name
    { code: fs('getRefiner()((o) => o.a === o.b)') },

    // --- Predicate not provably a sync boolean ----------------------------
    // (async predicates are advised toward validateAsync; see invalid cases)
    // superRefine with an async predicate -> callee is not refine, never flagged
    { code: fs('z.superRefine(async (arr, ctx) => { await check(arr); })') },
    // computed-member refine with an async predicate -> no identifier callee name
    { code: fs("z['refine'](async (obj) => await check(obj))") },
    // ctx (second) param -> superRefine semantics
    { code: fs('z.refine((arr, ctx) => { ctx.addIssue({}); })') },
    // ctx param on a function expression
    { code: fs('z.refine(function (arr, ctx) {}, { error: "x" })') },
    // predicate passed by reference -> cannot prove sync boolean
    { code: fs('z.refine(myPredicate)') },
    { code: fs('z.refine(myPredicate, { error: "x" })') },
    // no arguments at all -> predicate undefined
    { code: fs('z.refine()') },

    // --- Options object uses keys validate cannot forward -----------------
    // raw `when` payload access -> not convertible
    { code: fs('z.refine((o) => ok(o), { when: (p) => p.value })') },
    { code: fs('z.refine((o) => ok(o), { when: (p) => p.value, error: "x" })') },
    // custom params beyond a message
    { code: fs('z.refine((o) => ok(o), { params: { code: "custom" } })') },
    // abort flag is refine-only
    { code: fs('z.refine((o) => ok(o), { abort: true })') },
    // mixed: one forwardable + one blocked key
    { code: fs('z.refine((o) => ok(o), { path: ["a"], abort: true })') },
    // computed key in options object
    { code: fs('z.refine((o) => ok(o), { [dynamic]: 1 })') },
    // spread inside options object (not a plain Property)
    { code: fs('z.refine((o) => ok(o), { ...rest, error: "x" })') },
    // non-Identifier key (string-literal key) -> blocked
    { code: fs('z.refine((o) => ok(o), { "error": "x" })') },
    // options is an identifier, not an object literal
    { code: fs('z.refine((o) => ok(o), opts)') },
    // options already a bare error string (refine signature; left alone)
    { code: fs('z.refine((o) => ok(o), "mismatch")') },

    // --- Arity / spread guards --------------------------------------------
    // more than two arguments
    { code: fs('z.refine((o) => ok(o), { error: "x" }, extra)') },
    // spread element in the argument list
    { code: fs('z.refine(...args)') },
    { code: fs('z.refine((o) => ok(o), ...rest)') },
  ],
  invalid: [
    // --- Async predicate: advisory toward validateAsync, never fixed ------
    {
      code: fs('z.refine(async (obj) => await check(obj))'),
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
      code: fs('z.refine(async function (obj) { return await check(obj); })'),
      errors: [{ messageId: 'preferValidateAsync' }],
    },
    // async predicate with refine-only options -> still advised (async wins)
    {
      code: fs('z.refine(async (o) => ok(o), { when: (p) => p.value })'),
      errors: [{ messageId: 'preferValidateAsync' }],
    },
    // async predicate with a ctx param -> async footgun still reported
    {
      code: fs('z.refine(async (o, ctx) => { await ctx.check(o); })'),
      errors: [{ messageId: 'preferValidateAsync' }],
    },
    // bare (non-member) async refine import -> validateAsync without namespace
    {
      code: fsBare('refine(async (obj) => await check(obj))'),
      errors: [
        {
          messageId: 'preferValidateAsync',
          data: { refineName: 'refine', asyncName: 'validateAsync' },
        },
      ],
    },
    // aliased form-state namespace object is preserved in the advisory names
    {
      code: "import { z as schema } from 'form-state';\nschema.refine(async (obj) => await check(obj))",
      errors: [
        {
          messageId: 'preferValidateAsync',
          data: { refineName: 'schema.refine', asyncName: 'schema.validateAsync' },
        },
      ],
    },

    // --- No options object: callee rename only ----------------------------
    {
      code: fs('z.refine((o) => o.a === o.b)'),
      output: fs('z.validate((o) => o.a === o.b)'),
      errors: [
        {
          messageId: 'preferValidate',
          data: { refineName: 'z.refine', validateName: 'z.validate' },
        },
      ],
    },
    // function-expression predicate, single param, sync
    {
      code: fs('z.refine(function (o) { return o.a === o.b; })'),
      output: fs('z.validate(function (o) { return o.a === o.b; })'),
      errors: [{ messageId: 'preferValidate' }],
    },
    // zero-param predicate is still convertible (arity <= 1)
    {
      code: fs('z.refine(() => true)'),
      output: fs('z.validate(() => true)'),
      errors: [{ messageId: 'preferValidate' }],
    },

    // --- only `error` -> collapse to the string overload ------------------
    {
      code: fs("z.refine((o) => o.a === o.b, { error: 'mismatch' })"),
      output: fs("z.validate((o) => o.a === o.b, 'mismatch')"),
      errors: [{ messageId: 'preferValidate' }],
    },
    // error value can be any expression, copied verbatim
    {
      code: fs('z.refine((o) => ok(o), { error: messages.mismatch })'),
      output: fs('z.validate((o) => ok(o), messages.mismatch)'),
      errors: [{ messageId: 'preferValidate' }],
    },

    // --- forwardable multi-key object: keep options, rename callee --------
    {
      code: fs("z.refine((o) => ok(o), { path: ['a'], error: 'x' })"),
      output: fs("z.validate((o) => ok(o), { path: ['a'], error: 'x' })"),
      errors: [{ messageId: 'preferValidate' }],
    },
    // only `path` (no error) -> object kept, not collapsed
    {
      code: fs("z.refine((o) => ok(o), { path: ['a'] })"),
      output: fs("z.validate((o) => ok(o), { path: ['a'] })"),
      errors: [{ messageId: 'preferValidate' }],
    },

    // --- bare (non-member) refine import ----------------------------------
    {
      code: fsBare('refine((o) => o.a === o.b)'),
      output: fsBare('validate((o) => o.a === o.b)'),
      errors: [
        {
          messageId: 'preferValidate',
          data: { refineName: 'refine', validateName: 'validate' },
        },
      ],
    },
    {
      code: fsBare("refine((o) => ok(o), { error: 'x' })"),
      output: fsBare("validate((o) => ok(o), 'x')"),
      errors: [{ messageId: 'preferValidate' }],
    },

    // --- aliased form-state namespace object (member text preserved) ------
    {
      code: "import { z as schema } from 'form-state';\nschema.refine((o) => ok(o), { error: 'x' })",
      output: "import { z as schema } from 'form-state';\nschema.validate((o) => ok(o), 'x')",
      errors: [
        {
          messageId: 'preferValidate',
          data: { refineName: 'schema.refine', validateName: 'schema.validate' },
        },
      ],
    },

    // --- form-state subpath export ---------------------------------------
    {
      code: "import { z } from 'form-state/schema';\nz.refine((o) => o.a === o.b)",
      output: "import { z } from 'form-state/schema';\nz.validate((o) => o.a === o.b)",
      errors: [{ messageId: 'preferValidate' }],
    },

    // --- dogfooding: relative import into the library's own `src` ---------
    {
      code: "import { z } from '../src';\nz.refine((o) => o.a === o.b)",
      output: "import { z } from '../src';\nz.validate((o) => o.a === o.b)",
      errors: [{ messageId: 'preferValidate' }],
    },
  ],
});
