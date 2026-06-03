import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { noNestedGroup } from '../../eslint/rules/no-nested-group.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-nested-group', noNestedGroup, {
  valid: [
    // Root-level group on an object schema property.
    {
      code: `const schema = z.object({
        email: z.group(z.formString(), 'contact-info'),
        phone: z.group(z.formString(), 'contact-info'),
        name: z.formString(),
      });`,
    },
    // Root-level group on a strictObject schema property.
    {
      code: `const schema = z.strictObject({
        email: z.group(z.formString(), 'contact-info'),
      });`,
    },
    // Root-level group whose wrapped schema is itself chained.
    {
      code: `const schema = z.object({
        email: z.group(z.formString({ required: true }).with(z.describe('Email')), 'contact-info'),
      });`,
    },
    // Group inside a memoized schema is still root-level (useMemo is not a container).
    {
      code: `const schema = useMemo(() => z.object({
        email: z.group(z.formString(), 'contact-info'),
      }), []);`,
    },
    // No group calls at all.
    {
      code: `const schema = z.object({ name: z.formString() });`,
    },
    // A function named "group" unrelated to schemas, with no enclosing containers.
    {
      code: `group('a');`,
    },
    // Root-level group wrapped by z.catch() — catch is not a container.
    {
      code: `const schema = z.object({
        email: z.catch(z.group(z.formString(), 'contact-info'), ''),
      });`,
    },
    // Root-level group wrapped by z.default().
    {
      code: `const schema = z.object({
        email: z.default(z.group(z.formString(), 'contact-info'), ''),
      });`,
    },
    // Root-level group followed by a .catch() method call.
    {
      code: `const schema = z.object({
        email: z.group(z.formString(), 'contact-info').catch(''),
      });`,
    },
    // Root-level group followed by chained .with()/.catch() methods.
    {
      code: `const schema = z.object({
        email: z.group(z.formString(), 'contact-info').with(z.describe('Email')).catch(''),
      });`,
    },
    // A standalone `.catch()`/`.group()` member chain with no schema container.
    {
      code: `const x = something.catch(handler);`,
    },
    // Computed member callee — getCalleeName cannot resolve a name (returns null),
    // so the call is neither a group nor a container.
    {
      code: `const schema = z['object']({
        email: z.group(z.formString(), 'contact-info'),
      });`,
    },
    // Callee is itself a call expression (factory) — no resolvable callee name.
    {
      code: `const schema = makeZ().object({
        email: z.group(z.formString(), 'contact-info'),
      });`,
    },
  ],
  invalid: [
    // Group on a property of a nested object schema.
    {
      code: `const schema = z.object({
        info: z.object({
          email: z.group(z.formString(), 'contact-info'),
        }),
      });`,
      errors: [{ messageId: 'nestedGroup' }],
    },
    // Group on an array element schema.
    {
      code: `const schema = z.object({
        tags: z.array(z.group(z.formString(), 'contact-info')),
      });`,
      errors: [{ messageId: 'nestedGroup' }],
    },
    // Group on a formArray element schema (the library's array constructor).
    {
      code: `const schema = z.object({
        tags: z.formArray(z.group(z.formString(), 'contact-info')),
      });`,
      errors: [{ messageId: 'nestedGroup' }],
    },
    // Group on a deeply nested property.
    {
      code: `const schema = z.object({
        a: z.object({
          b: z.object({
            c: z.group(z.formString(), 'g'),
          }),
        }),
      });`,
      errors: [{ messageId: 'nestedGroup' }],
    },
    // Group inside an array of objects.
    {
      code: `const schema = z.object({
        people: z.array(z.object({
          email: z.group(z.formString(), 'contact-info'),
        })),
      });`,
      errors: [{ messageId: 'nestedGroup' }],
    },
    // Member-expression group call (z.group) nested.
    {
      code: `const schema = z.object({
        info: z.object({
          email: z.group(z.formString(), 'g'),
        }),
      });`,
      errors: [{ messageId: 'nestedGroup' }],
    },
    // A nested object wrapped in z.catch() must still be flagged — the modifier
    // does not hide the nesting.
    {
      code: `const schema = z.object({
        info: z.catch(z.object({
          email: z.group(z.formString(), 'g'),
        }), {}),
      });`,
      errors: [{ messageId: 'nestedGroup' }],
    },
    // An array element group followed by a .catch() method is still nested.
    {
      code: `const schema = z.object({
        tags: z.array(z.group(z.formString(), 'g')).catch([]),
      });`,
      errors: [{ messageId: 'nestedGroup' }],
    },
  ],
});
