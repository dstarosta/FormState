import { describe, expect, it } from 'vitest';
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

describe('stable-debounced-callback (deprecated)', () => {
  it('is marked as deprecated and not recommended', () => {
    expect(stableDebouncedCallback.meta.deprecated).toBe(true);
    expect(stableDebouncedCallback.meta.docs.recommended).toBe(false);
  });
});

// Inline callbacks are fine: `change()` always runs the latest callback for a debounced field.
ruleTester.run('stable-debounced-callback', stableDebouncedCallback, {
  valid: [
    { code: 'change(path, value, { debounceIntervalMs: 300, callback: () => {} })' },
    { code: 'change(path, value, { debounceIntervalMs: 300, callback: function () {} })' },
    {
      code: 'function C() { const onSaved = () => {}; change(path, value, { debounceIntervalMs: 300, callback: onSaved }); }',
    },
    { code: 'formActions.change(path, value, { debounceIntervalMs: 300, callback: () => {} })' },
  ],
  invalid: [],
});
