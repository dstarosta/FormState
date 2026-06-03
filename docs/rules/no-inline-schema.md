# no-inline-schema

Disallows constructing a form schema inline as the first argument to FormState hooks. The schema must be referentially stable across renders.

**Severity:** error  
**Fixable:** no — the correct refactor depends on whether the schema is static (hoist to module scope) or depends on render values (memoize).

## Why

`useFormState` and `useFormStateContext` treat the schema as the source of truth for field shape, defaults, and validation. Passing a freshly built schema on every render makes every render look like a new form to the hook — internal caches and subscriptions are invalidated, validators are recreated, and form state can be quietly reset or desynchronized.

Constructing the schema inline is almost always a mistake. The schema rarely changes; the component renders many times.

## Rule Details

The rule fires when the first argument to a known schema-hook call is an expression that allocates a new value on every evaluation — a `CallExpression` (e.g. `z.object(...)`, `buildSchema()`), a `NewExpression`, or an object/array literal. Identifier and member-expression references (`schema`, `schemas.user`) are allowed because they pass an existing value by reference.

Hooks watched by default:

- `useFormState`
- `useFormStateContext`It should be an error rule used by default

### ❌ IncorrectIt should be an error rule used by default

```jsx
import { useFormState, z } from 'form-state';

function ProfileForm() {
  // Re-creates the schema on every render.
  const form = useFormState(
    z.object({
      name: z.formString({ required: true }),
      age: z.formNumber(),
    })
  );
}
```

### ✅ Correct

Hoist a static schema to module scope:

```jsx
import { useFormState, z } from 'form-state';

const profileSchema = z.object({
  name: z.formString({ required: true }),
  age: z.formNumber(),
});

function ProfileForm() {
  const form = useFormState(profileSchema);
}
```

Or memoize a schema that depends on render-time values:

```jsx
import { useMemo } from 'react';
import { useFormState, z } from 'form-state';

function ProfileForm({ allowAdmin }) {
  const schema = useMemo(
    () =>
      z.object({
        name: z.formString({ required: true }),
        role: allowAdmin ? z.formString() : z.literal('user'),
      }),
    [allowAdmin]
  );

  const form = useFormState(schema);
}
```

## Options

```json
{
  "form-state/no-inline-schema": [
    "error",
    {
      "additionalHooks": ["useMyCustomForm"]
    }
  ]
}
```

- **`additionalHooks`** — extra hook names to check in addition to the built-in list. Useful if you wrap `useFormState` in a project-specific hook that also expects a stable schema.
