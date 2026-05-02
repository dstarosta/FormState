# use-form-schema

Enforces using FormState's `form*` schema helpers instead of raw Zod primitives in form schemas.

**Severity (recommended config):** warn  
**Fixable:** yes — ESLint's `--fix` flag replaces the primitive automatically.

## Why

FormState ships wrapper helpers for Zod's primitive types — `formString`, `formNumber`, `formBoolean`, `formDate`, and `formArray` — exported from `'form-state'` alongside `z`. These wrappers configure each field with the correct blank-value and optionality semantics that HTML form inputs require. Using a raw Zod primitive like `z.string()` directly will cause type mismatches, incorrect validation, and fields that do not clear or reset as expected.

| Raw Zod | FormState helper |
|---------|-----------------|
| `z.string()` | `formString()` |
| `z.number()` | `formNumber()` |
| `z.boolean()` | `formBoolean()` |
| `z.date()` | `formDate()` |
| `z.array(z.string())` | `formArray(z.string())` |

The rule only fires when the primitive is used directly as a property value inside a `z.object()`, `z.strictObject()`, `z.default()`, `z.catch()`, `z.catchAll()`, `z.optional()`, `z.nonoptional()`, `z.nullable()`, or `z.nullish()` call — i.e., in places where a field definition is expected.

`z.array(z.object(...))` and `z.array(z.array(...))` are exempt because the outer `formArray` wraps the inner complex type without needing a separate helper.

## Rule Details

### ❌ Incorrect

```jsx
import { z } from 'form-state';

const schema = z.object({
  name: z.string(),       // ← should be formString()
  age: z.number(),        // ← should be formNumber()
  active: z.boolean(),    // ← should be formBoolean()
  tags: z.array(z.string()), // ← should be formArray(z.string())
});
```

### ✅ Correct

```jsx
import { z, formString, formNumber, formBoolean, formArray } from 'form-state';

const schema = z.object({
  name: formString(),
  age: formNumber(),
  active: formBoolean(),
  tags: formArray(z.string()),

  // z.object() inside z.array() is fine — use formArray on the outside
  addresses: formArray(z.object({ city: formString() })),
});
```

## Auto-fix

Running `eslint --fix` replaces each flagged primitive name in-place:

```
z.string()  →  formString()
z.number()  →  formNumber()
z.boolean() →  formBoolean()
z.date()    →  formDate()
z.array()   →  formArray()
```

The fix only changes the method name — all chained calls (e.g. `.min(3)`, `.describe('...')`) are preserved.
