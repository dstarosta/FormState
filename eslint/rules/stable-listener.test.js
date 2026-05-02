import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { stableListener } from './stable-listener.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('stable-listener', stableListener, {
  valid: [
    // No argument
    { code: 'useListener()' },
    { code: 'useListener(undefined)' },

    // Identifier — assumed stable (defined outside component or via useCallback)
    { code: 'useListener(onStateChange)' },
    { code: 'useListener(memoizedListener)' },

    // useCallback-wrapped inline function
    { code: 'useListener(useCallback(() => {}, []))' },
    { code: 'useListener(useCallback(function() {}, [deps]))' },

    // Member call with stable reference
    { code: 'formHooks.useListener(onStateChange)' },
    { code: 'hooks.useListener(useCallback(() => {}, []))' },

    // Different hook name — not flagged
    { code: 'useEffect(() => {})' },
    { code: 'useCallback(() => {}, [])' },
    { code: 'useOtherHook(() => {})' },
  ],
  invalid: [
    // Inline arrow function
    {
      code: 'useListener(() => {})',
      errors: [{ messageId: 'unstableListener' }],
    },
    // Inline arrow with body
    {
      code: 'useListener(({ type, data }) => { console.log(type, data); })',
      errors: [{ messageId: 'unstableListener' }],
    },
    // Inline function expression
    {
      code: 'useListener(function() {})',
      errors: [{ messageId: 'unstableListener' }],
    },
    // Inline named function expression
    {
      code: 'useListener(function handleChange() {})',
      errors: [{ messageId: 'unstableListener' }],
    },
    // Member call with inline arrow
    {
      code: 'formHooks.useListener(() => {})',
      errors: [{ messageId: 'unstableListener' }],
    },
    // Member call with inline function expression
    {
      code: 'formHooks.useListener(function() {})',
      errors: [{ messageId: 'unstableListener' }],
    },
    // Deeply nested member call
    {
      code: 'form.hooks.useListener(() => {})',
      errors: [{ messageId: 'unstableListener' }],
    },
  ],
});
