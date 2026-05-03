# use-form-schema

Enforces using FormState's `form*` schema helpers instead of raw Zod primitives in form schemas.

**Severity:** warn  
**Fixable:** yes — ESLint's `--fix` flag replaces the primitive automatically.

## Why

FormState extends the `z` object with form-specific helpers — `z.formString()`, `z.formNumber()`, `z.formBoolean()`, `z.formDate()`, and `z.formArray()`. These configure each field with the correct blank-value and optionality semantics that HTML form inputs require. Using a raw Zod primitive like `z.string()` directly will cause type mismatches, incorrect validation, and fields that do not clear or reset as expected.

| Raw Zod               | FormState helper          | Required by default |
| --------------------- | ------------------------- | :-----------------: |
| `z.string()`          | `z.formString()`          |         no          |
| `z.number()`          | `z.formNumber()`          |         no          |
| `z.boolean()`         | `z.formBoolean()`         |         no          |
| `z.date()`            | `z.formDate()`            |         no          |
| `z.array(z.string())` | `z.formArray(z.string())` |         yes         |

`z.formString()`, `z.formNumber()`, `z.formBoolean()`, and `z.formDate()` are **optional by default** — pass `{ required: true }` to require the field. `z.formArray()` is required by default.

`z.array(z.object(...))` and `z.array(z.array(...))` are exempt because the outer `z.formArray()` wraps the inner complex type without needing a separate helper.

## Rule Details

The rule fires when a primitive is used directly as a property value inside any `z.*()` call that takes an object of field definitions.

### ❌ Incorrect

```jsx
import { z } from 'form-state';

const schema = z.object({
  name: z.string(), // ← z.formString({ required: true })
  age: z.number(), // ← z.formNumber({ required: true })
  active: z.boolean(), // ← z.formBoolean({ required: true })
  tags: z.array(z.string()), // ← z.formArray(z.string())
});
```

### ✅ Correct

```jsx
import { z } from 'form-state';

const schema = z.object({
  name: z.formString({ required: true }),
  age: z.formNumber({ required: true }),
  active: z.formBoolean({ required: true }),
  tags: z.formArray(z.string()),

  // Optional fields - { required: false } by default
  nickname: z.formString(),

  // z.object() inside z.array() is fine — use z.formArray() on the outside
  addresses: z.formArray(z.object({ city: z.formString({ required: true }) })),
});
```

## Auto-fix

Running `eslint --fix` replaces each flagged primitive and inserts `{ required: true }` for non-array helpers to match Zod's default required semantics:

```
z.string()  →  z.formString({ required: true })
z.number()  →  z.formNumber({ required: true })
z.boolean() →  z.formBoolean({ required: true })
z.date()    →  z.formDate({ required: true })
z.array()   →  z.formArray()
```

All chained calls (e.g. `.min(3)`, `.describe('...')`) are preserved.
