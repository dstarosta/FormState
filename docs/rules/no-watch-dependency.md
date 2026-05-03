# no-watch-dependency

Prevents using values returned by `useWatch()` as dependencies in other hooks.

**Severity:** error

## Why

`useWatch` subscribes to an external store via `useSyncExternalStore`. Its values are updated by store subscriptions that operate outside of React's state management — they are not React state, and their change path is not synchronized to React's state transitions.

Using a `useWatch` value as a dependency in `useEffect`, `useMemo`, `useCallback`, or similar hooks is incorrect because the hook's dependency mechanism tracks React state and props, not external store snapshots. The result is that effects or memoized values may run at the wrong time or not reflect the true update source.

## Rule Details

The rule tracks variables assigned from `useWatch()` and flags any that appear in the dependency array of the following hooks. Variable shadowing is handled correctly — only the declaration that actually resolves in scope is checked.

| Hook                        | Deps argument |
| --------------------------- | ------------- |
| `useCallback`               | 2nd           |
| `useDeepMemo`               | 2nd           |
| `useEffect`                 | 2nd           |
| `useImperativeHandle`       | 3rd           |
| `useInsertionEffect`        | 2nd           |
| `useIsomorphicLayoutEffect` | 2nd           |
| `useLayoutEffect`           | 2nd           |
| `useMemo`                   | 2nd           |

### ❌ Incorrect

```jsx
function SearchPreview() {
  const query = useWatch('query');

  // query is from an external store — do not put it in deps
  useEffect(() => {
    fetchPreview(query);
  }, [query]);

  const results = useMemo(() => filter(data, query), [query]);

  const handler = useCallback(() => submit(query), [query]);
}
```

### ✅ Correct

```jsx
function SearchPreview() {
  const query = useWatch('query');

  // Use the value directly in JSX or in the effect body — no dep needed
  useEffect(() => {
    fetchPreview(query);
  }, []);

  return <p>Searching for: {query}</p>;
}
```

## Options

### `additionalHooks`

An object mapping additional hook names to the zero-based index of their dependency array argument. Use this to extend the rule to custom hooks in your project.

```js
// eslint.config.js
rules: {
  'form-state/no-watch-dependency': ['error', {
    additionalHooks: {
      useCustomEffect: 1,       // deps is the 2nd argument
      useCustomHandle: 2,       // deps is the 3rd argument
    },
  }],
}
```

## When Not to Use It

This rule should almost never be disabled. If you find yourself needing a `useWatch` value in a dependency array, consider whether the logic should be moved into a `useListener` subscription or a server-side handler instead.
