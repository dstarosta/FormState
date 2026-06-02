import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { stableDebouncedCallback } from '../../eslint/rules/stable-debounced-callback.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('stable-debounced-callback', stableDebouncedCallback, {
  valid: [
    // No options or no debounceIntervalMs — inline callback is fine
    { code: 'change(path, value)' },
    { code: 'change(path, value, { touch: true })' },
    { code: 'change(path, value, { validate: false })' },
    { code: 'change(path, value, { callback: () => {} })' },
    { code: 'change(path, value, { callback: function() {} })' },

    // debounceIntervalMs present but no callback
    { code: 'change(path, value, { debounceIntervalMs: 300 })' },
    { code: 'change(path, value, { debounceIntervalMs: 300, touch: true })' },

    // debounceIntervalMs present with stable identifier
    { code: 'change(path, value, { debounceIntervalMs: 300, callback: stableCallback })' },
    {
      code: 'formActions.change(path, value, { debounceIntervalMs: 300, callback: stableCallback })',
    },

    // debounceIntervalMs present with useCallback-wrapped function
    {
      code: 'change(path, value, { debounceIntervalMs: 300, callback: useCallback(() => {}, []) })',
    },
    {
      code: 'change(path, value, { debounceIntervalMs: 300, callback: useCallback(function() {}, [deps]) })',
    },

    // Different method name — not flagged
    { code: 'replace(path, value, { debounceIntervalMs: 300, callback: () => {} })' },
    { code: 'update(path, value, { debounceIntervalMs: 300, callback: () => {} })' },

    // Options passed as a variable — can't be statically inspected
    { code: 'change(path, value, opts)' },
  ],
  invalid: [
    // Inline arrow function with debounceIntervalMs
    {
      code: 'change(path, value, { debounceIntervalMs: 300, callback: () => {} })',
      errors: [{ messageId: 'unstableCallback' }],
    },
    // Inline arrow with body
    {
      code: 'change(path, value, { debounceIntervalMs: 300, callback: (state) => { console.log(state); } })',
      errors: [{ messageId: 'unstableCallback' }],
    },
    // Inline function expression
    {
      code: 'change(path, value, { debounceIntervalMs: 300, callback: function() {} })',
      errors: [{ messageId: 'unstableCallback' }],
    },
    // Inline named function expression
    {
      code: 'change(path, value, { debounceIntervalMs: 300, callback: function onChanged() {} })',
      errors: [{ messageId: 'unstableCallback' }],
    },
    // Member call
    {
      code: 'formActions.change(path, value, { debounceIntervalMs: 300, callback: () => {} })',
      errors: [{ messageId: 'unstableCallback' }],
    },
    // Deeply nested member call
    {
      code: 'form.actions.change(path, value, { debounceIntervalMs: 300, callback: () => {} })',
      errors: [{ messageId: 'unstableCallback' }],
    },
    // Other options alongside debounceIntervalMs
    {
      code: 'change(path, value, { touch: true, debounceIntervalMs: 500, callback: () => {} })',
      errors: [{ messageId: 'unstableCallback' }],
    },
  ],
});
