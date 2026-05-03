# stable-listener

Enforces stable listener references passed to `useListener()`.

**Severity:** error

## Why

`useListener()` subscribes to form state changes for the lifetime of the component. When the listener is an inline arrow function or function expression, a new function reference is created on every render. This causes the hook to unsubscribe and resubscribe on every render — producing unnecessary churn, potential event gaps, and in some cases missed events between the unsubscribe and the next subscribe.

Wrap the listener with `useCallback()` or define it outside the component.

## Rule Details

The rule fires when `useListener()` or any member-expression form (e.g. `formHooks.useListener()`) is called with an inline `ArrowFunctionExpression` or `FunctionExpression` as its first argument.

### ❌ Incorrect

```jsx
// Inline arrow — unsubscribes and resubscribes on every render
useListener(() => {
  console.log('form changed');
});

// Inline function expression — same problem
useListener(function ({ type, data }) {
  handleChange(type, data);
});

// Member expression form — still flagged
formHooks.useListener(() => {
  sync();
});
```

### ✅ Correct

```jsx
// useCallback — stable reference across renders
const onStateChange = useCallback((event) => {
  sync(event);
}, []);

useListener(onStateChange);

// Defined outside the component — always stable
function handleFormChange(event) {
  analytics.track(event);
}

function MyForm() {
  useListener(handleFormChange);
}
```

## When Not to Use It

If you are using the **React Compiler**, it automatically memoizes inline functions and gives them stable references — the same effect as wrapping manually with `useCallback`. In that case this rule will flag code that is already correct at runtime and can be disabled.
