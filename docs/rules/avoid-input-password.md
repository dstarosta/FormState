# avoid-input-password

Enforces using `<SecureInput>` instead of `<input type="password">` inside forms with an `action` or `onSubmit` handler.

**Severity:** warn

## Why

`<input type="password">` stores the typed value in the DOM. Browser extensions routinely scan the DOM to capture credential data, and the value is exposed in DevTools, `FormData` serialization, and clipboard operations (copy/cut/paste/undo). `SecureInput` keeps the value in a React ref — it never appears in the DOM, in `FormData`, or in browser autofill inspection surfaces.

## Rule Details

The rule fires when an `<input type="password">` is a descendant of a `<form>` or `<Form>` element that has an `action={...}` or `onSubmit={...}` prop with a function value.

### ❌ Incorrect

```jsx
<form action={handleSubmit}>
  <input type="password" name="password" />
</form>

<Form action={handleSubmit}>
  <input type="password" name="password" />
</Form>

<form onSubmit={handleSubmit}>
  <input type="password" name="password" />
</form>
```

### ✅ Correct

```jsx
import { SecureInput } from 'form-state';

<form action={handleSubmit}>
  <SecureInput name="password" />
</form>;

{
  /* Forms without a handler are not flagged */
}
<form>
  <input type="password" name="password" />
</form>;
```

## When Not to Use It

Disable this rule if you are not using `SecureInput` and have addressed password-value exposure through another mechanism.
