# prefer-validate-over-refine

Recommends `z.validate()` over `z.refine()` (and `z.validateAsync()` over an async `z.refine()`) when the `refine` call only uses features the wrapper also supports.

**Severity:** warn  
**Fixable:** ✅ for the synchronous `validate` case when the conversion is mechanical (no `when` clause); the async `validateAsync` advisory is **not** auto-fixable.

## Why

`z.validate()` is a thin wrapper around `z.refine()` that exists for the common case: validating the whole object with a single boolean predicate. Preferring it keeps form validation on a **single stage** — the same pass that runs the schema's field-level checks — instead of layering a second, refine-only stage on top.

`z.refine()` is strictly more powerful, so reach for it only when you actually need something `validate` cannot express: access to the raw `when` payload (including `payload.value`), custom issue `code`/`params`, `abort`, or `superRefine`-style multi-issue emission. When the `refine` block uses none of those, `validate` says the same thing more directly.

## Rule Details

The rule is **conservative**: it only fires when the `refine` call is mechanically equivalent to a `validate` call, so it never produces a misleading suggestion. All of the following must hold:

- The `z` (or bare `refine`) must be imported from `form-state`. The rule does not touch `refine` calls on a plain zod schema or any other value.
- The callee is `refine` (`z.refine` or a bare `refine` import) — never `superRefine`.
- The predicate is an inline arrow or function expression that is **synchronous** and declares **at most one parameter** (a second `ctx` parameter signals `superRefine`-style issue emission, which `validate` cannot express). An **async** predicate is handled by a separate advisory — see [Async predicates](#async-predicates) below.
- The options object, if present, uses **only** `path` and `error`. Any other key — `when`, `params`, `abort`, a spread, or a computed/string-literal key — leaves the call untouched.

A `when` clause specifically blocks the rule: `validate`'s `condition` callback receives _formatted_ errors (`ZodValidationError[]`), not the raw `refine` `when` payload, so the two are not interchangeable by a simple swap.

### Autofix

The fix applies only when the conversion is unambiguous:

| Before                                      | After                                         |
| ------------------------------------------- | --------------------------------------------- |
| `z.refine(fn)`                              | `z.validate(fn)`                              |
| `z.refine(fn, { error: 'msg' })`            | `z.validate(fn, 'msg')`                       |
| `z.refine(fn, { path: ['a'], error: 'm' })` | `z.validate(fn, { path: ['a'], error: 'm' })` |

Calls that include a `when` clause are reported **without** a fix, since the rewrite is not mechanical.

### ❌ Incorrect

```js
import { z } from 'form-state';

const schema = z.object({
  password: z.formString({ required: true }),
  confirm: z.formString({ required: true }),
});

// A whole-object boolean check with just an error message — this is exactly
// what z.validate is for.
const withMatch = schema.check(
  z.refine((data) => data.password === data.confirm, {
    path: ['confirm'],
    error: 'Passwords must match.',
  })
);
```

### ✅ Correct

```js
import { z } from 'form-state';

const withMatch = schema.check(
  z.validate((data) => data.password === data.confirm, {
    path: ['confirm'],
    error: 'Passwords must match.',
  })
);
```

### Async predicates

When the `refine` predicate is **async**, the rule emits a distinct, **non-fixable** advisory pointing you at `z.validateAsync()`. A raw async `refine` resolves a promise but bypasses the form's async-validation lifecycle — `validateAsync()` is what registers debouncing, `skipWhen`, `submitOnly`, and the `asyncValidating` state the form relies on.

This is deliberately **not** auto-fixed: unlike the synchronous case, the swap is not a mechanical rename. `validateAsync` has different runtime defaults (for example, `skipWhen` defaults to deep equality, so the predicate won't re-run on an unchanged value), so the conversion changes behavior and must be done deliberately.

```js
// ❌ Async predicate on raw refine — skips the async-validation lifecycle
schema.check(z.refine(async (data) => await isUniqueEmail(data.email), 'Email is taken.'));

// ✅ validateAsync — debounced, lifecycle-aware
schema.check(z.validateAsync(async (data) => await isUniqueEmail(data.email), 'Email is taken.'));
```

## When Not to Use It

You should keep this rule on. It is conservative by construction: the synchronous suggestion already skips every `refine` call that uses a refine-only capability — a `when` clause, custom issue params, `abort`, or a `ctx` parameter — so whenever it fires, the call genuinely could be `validate`, and `validate` is the default you want for whole-object checks. The async advisory is similarly narrow: it only points out that a raw async `refine` should almost certainly be `validateAsync`. There is no "I rely on refine here" exception at a flagged call, because the rule does not flag calls that legitimately need raw `refine`.
