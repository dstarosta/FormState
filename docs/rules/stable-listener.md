# stable-listener

Enforces stable listener references passed to `useListener()`.

**Severity (recommended config):** error

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
useListener(function({ type, data }) {
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

Disable this rule only if you intentionally want the listener to be replaced on every render and have accounted for any subscription gaps.
