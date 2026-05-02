import { useFormSchema } from './use-form-schema.js';
import { stableListener } from './stable-listener.js';
import { stableDebouncedListener } from './stable-debounced-listener.js';
import { avoidInputPassword } from './avoid-input-password.js';

const base = {
  meta: {
    name: 'form-state',
    version: '1.0.0',
  },
  rules: {
    'use-form-schema': useFormSchema,
    'stable-listener': stableListener,
    'stable-debounced-listener': stableDebouncedListener,
    'avoid-input-password': avoidInputPassword,
  },
};

const plugin = {
  ...base,
  configs: {
    recommended: {
      plugins: { 'form-state': base },
      rules: {
        'form-state/use-form-schema': 'warn',
        'form-state/stable-listener': 'error',
        'form-state/stable-debounced-listener': 'error',
        'form-state/avoid-input-password': 'warn',
      },
    },
  },
};

export default plugin;
