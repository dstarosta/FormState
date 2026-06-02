import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { noInlineSchema } from '../../eslint/rules/no-inline-schema.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-inline-schema', noInlineSchema, {
  valid: [
    // Schema declared at module scope and passed by reference
    {
      code: `
        const schema = z.object({ name: z.formString() });
        function Form() { useFormState(schema); }
      `,
    },
    // Memoized schema
    {
      code: `
        function Form() {
          const schema = useMemo(() => z.object({ name: z.formString() }), []);
          useFormState(schema);
        }
      `,
    },
    // useDeepMemo'd schema
    {
      code: `
        function Form() {
          const schema = useDeepMemo(() => z.object({ name: z.formString() }), [type]);
          useFormState(schema);
        }
      `,
    },
    // Identifier argument
    { code: 'useFormState(schema)' },
    { code: 'useFormStateContext(ctxSchema)' },
    // Member expression argument (e.g., schemas.user)
    { code: 'useFormState(schemas.user)' },
    // No arguments
    { code: 'useFormState()' },
    // Unrelated hook
    { code: 'useState(z.object({ name: z.formString() }))' },
    // Unrelated function with the same call shape
    { code: 'createForm(z.object({ name: z.formString() }))' },
    // Conditional reference is still a reference, not an inline construction
    { code: 'useFormState(cond ? a : b)' },
    // Callee is itself a call expression (factory pattern) — no hook name to match
    { code: 'getHook()(z.object({ name: z.formString() }))' },
  ],
  invalid: [
    {
      code: 'useFormState(z.object({ name: z.formString() }))',
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useFormState' } }],
    },
    {
      code: 'useFormStateContext(z.object({ id: z.formNumber() }))',
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useFormStateContext' } }],
    },
    // z.strictObject — same call shape, same rebuild-per-render problem
    {
      code: 'useFormState(z.strictObject({ name: z.formString() }))',
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useFormState' } }],
    },
    {
      code: 'useFormStateContext(z.strictObject({ id: z.formNumber() }))',
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useFormStateContext' } }],
    },
    // Member-expression hook reference
    {
      code: 'FormState.useFormState(z.object({ name: z.formString() }))',
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useFormState' } }],
    },
    // Any call expression as the first arg is treated as inline construction
    {
      code: 'useFormState(buildSchema())',
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useFormState' } }],
    },
    // Object / array literal
    {
      code: 'useFormState({ name: z.formString() })',
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useFormState' } }],
    },
    {
      code: 'useFormState([1, 2, 3])',
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useFormState' } }],
    },
    // Inside a component body
    {
      code: `
        function Form() {
          useFormState(z.object({ name: z.formString() }));
        }
      `,
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useFormState' } }],
    },
    // additionalHooks option extends the set
    {
      code: 'useMyForm(z.object({ x: z.formString() }))',
      options: [{ additionalHooks: ['useMyForm'] }],
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useMyForm' } }],
    },
    // TS as-expression should not hide the inline call
    {
      code: 'useFormState(z.object({ name: z.formString() }) as any)',
      languageOptions: {
        parser: await import('@typescript-eslint/parser'),
      },
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useFormState' } }],
    },
    // TS satisfies expression
    {
      code: 'useFormState(z.object({ name: z.formString() }) satisfies Schema)',
      languageOptions: {
        parser: await import('@typescript-eslint/parser'),
      },
      errors: [{ messageId: 'inlineSchema', data: { hook: 'useFormState' } }],
    },
  ],
});
