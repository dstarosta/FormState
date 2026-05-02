# stable-debounced-callback

Enforces stable callback references in `change()` calls that use `debounceIntervalMs`.

**Severity (recommended config):** error

## Why

When `debounceIntervalMs` is set, `change()` debounces the provided `callback` so it fires once after the specified quiet period. If `callback` is an inline arrow function or function expression, a new function reference is created on every render. The debouncer compares references to determine whether the callback changed — a new reference resets the timer, which means the callback may never fire as long as the component is re-rendering.

Wrap the callback with `useCallback()` or define it outside the component to give it a stable reference.

## Rule Details

The rule fires when `change()` or `formActions.change()` (any member-expression form) is called with an options object that contains `debounceIntervalMs`, and the `callback` property in that object is an inline `ArrowFunctionExpression` or `FunctionExpression`.

### ❌ Incorrect

```jsx
// Inline arrow — new reference every render, debounce timer resets
formActions.change('query', value, {
  debounceIntervalMs: 300,
  callback: () => saveToServer(),
});

// Inline function expression — same problem
formActions.change('query', value, {
  debounceIntervalMs: 300,
  callback: function() { saveToServer(); },
});
```

### ✅ Correct

```jsx
// useCallback — stable reference
const handleChange = useCallback(() => {
  saveToServer();
}, []);

formActions.change('query', value, {
  debounceIntervalMs: 300,
  callback: handleChange,
});

// Defined outside the component — always stable
function saveAfterChange() {
  saveToServer();
}

formActions.change('query', value, {
  debounceIntervalMs: 300,
  callback: saveAfterChange,
});
```
