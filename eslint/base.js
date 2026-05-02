import { useFormSchema } from './rules/use-form-schema.js';
import { stableListener } from './rules/stable-listener.js';
import { stableDebouncedListener } from './rules/stable-debounced-listener.js';
import { avoidInputPassword } from './rules/avoid-input-password.js';

export default {
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
