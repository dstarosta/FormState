import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { noWatchDependency } from '../../eslint/rules/no-watch-dependency.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-watch-dependency', noWatchDependency, {
  valid: [
    // useWatch value used in the effect body, not as dependency
    { code: 'function C() { const v = useWatch("x"); useEffect(() => { console.log(v); }, []); }' },

    // Regular variable as dependency — not from useWatch
    { code: 'function C() { const v = someOtherHook(); useEffect(() => {}, [v]); }' },

    // useEffect with no deps
    { code: 'function C() { const v = useWatch("x"); useEffect(() => {}); }' },

    // useEffect with empty deps
    { code: 'function C() { const v = useWatch("x"); useEffect(() => {}, []); }' },

    // Non-hook call with a deps-looking array
    { code: 'function C() { const v = useWatch("x"); someFunc(() => {}, [v]); }' },

    // useMemo with only non-watch deps
    { code: 'function C() { const v = useWatch("x"); const x = 1; useMemo(() => x, [x]); }' },

    // useCallback with no deps
    { code: 'function C() { const v = useWatch("x"); useCallback(() => {}, []); }' },

    // Different variable name that happens to shadow an outer watch
    {
      code: `
        function Outer() {
          const v = useWatch("x");
          function Inner() {
            const v = 42;
            useEffect(() => {}, [v]);
          }
        }
      `,
    },

    // Member-expression hook call body use (not dep)
    {
      code: 'function C() { const v = formHooks.useWatch("x"); useEffect(() => { doThing(v); }, []); }',
    },

    // VariableDeclarator: !scope — top-level declaration, no enclosing function
    { code: 'const v = useWatch("x"); useEffect(() => {}, [v]);' },

    // VariableDeclarator: node.id.type !== 'Identifier' — destructuring, not tracked
    { code: 'function C() { const [a] = useWatch("x"); useEffect(() => {}, [a]); }' },

    // CallExpression: deps is not an ArrayExpression (passed as variable)
    { code: 'function C() { const v = useWatch("x"); useEffect(() => {}, deps); }' },

    // CallExpression: sparse array hole — null element, continue
    { code: 'function C() { const v = useWatch("x"); useEffect(() => {}, [,]); }' },

    // CallExpression: dep is not an Identifier (member expression)
    { code: 'function C() { const v = useWatch("x"); useEffect(() => {}, [v.prop]); }' },

    // CallExpression: dep not declared in any scope — loop exhausts without match
    { code: 'function C() { useEffect(() => {}, [externalVar]); }' },

    // CallExpression: computed member hook call — hookName is null
    { code: 'function C() { const v = useWatch("x"); React["useEffect"](() => {}, [v]); }' },

    // isUseWatch: computed member expression — not treated as useWatch
    { code: 'function C() { const v = hooks["useWatch"]("x"); useEffect(() => {}, [v]); }' },
  ],
  invalid: [
    // useEffect with watch value as dep
    {
      code: 'function C() { const value = useWatch("field"); useEffect(() => {}, [value]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // useMemo with watch value as dep
    {
      code: 'function C() { const value = useWatch("field"); useMemo(() => value, [value]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // useCallback with watch value as dep
    {
      code: 'function C() { const value = useWatch("field"); useCallback(() => {}, [value]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // useLayoutEffect with watch value as dep
    {
      code: 'function C() { const value = useWatch("field"); useLayoutEffect(() => {}, [value]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // useDeepMemo with watch value as dep
    {
      code: 'function C() { const value = useWatch("field"); useDeepMemo(() => value, [value]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // useImperativeHandle with watch value as dep
    {
      code: 'function C() { const value = useWatch("field"); useImperativeHandle(ref, () => ({}), [value]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // useIsomorphicLayoutEffect with watch value as dep
    {
      code: 'function C() { const value = useWatch("field"); useIsomorphicLayoutEffect(() => {}, [value]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // useInsertionEffect with watch value as dep
    {
      code: 'function C() { const value = useWatch("field"); useInsertionEffect(() => {}, [value]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // Multiple watch values, multiple deps
    {
      code: 'function C() { const a = useWatch("x"); const b = useWatch("y"); useEffect(() => {}, [a, b]); }',
      errors: [
        { messageId: 'watchDependency', data: { name: 'a' } },
        { messageId: 'watchDependency', data: { name: 'b' } },
      ],
    },

    // Mixed deps — only watch value flagged
    {
      code: 'function C() { const w = useWatch("x"); const s = useState(0)[0]; useEffect(() => {}, [w, s]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'w' } }],
    },

    // Member-expression form of useWatch
    {
      code: 'function C() { const value = formHooks.useWatch("field"); useEffect(() => {}, [value]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // Member-expression hook with watch dep
    {
      code: 'function C() { const value = useWatch("field"); React.useEffect(() => {}, [value]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // Sparse array hole before watch dep — null element is skipped, watch dep is still caught
    {
      code: 'function C() { const value = useWatch("field"); useEffect(() => {}, [, value]); }',
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // additionalHooks option — custom hook with deps at index 1
    {
      code: 'function C() { const value = useWatch("field"); useCustomEffect(() => {}, [value]); }',
      options: [{ additionalHooks: { useCustomEffect: 1 } }],
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },

    // additionalHooks option — custom hook with deps at index 2
    {
      code: 'function C() { const value = useWatch("field"); useCustomHandle(ref, () => ({}), [value]); }',
      options: [{ additionalHooks: { useCustomHandle: 2 } }],
      errors: [{ messageId: 'watchDependency', data: { name: 'value' } }],
    },
  ],
});
