import { avoidInputPassword } from './rules/avoid-input-password.js';
import { stableDebouncedCallback } from './rules/stable-debounced-callback.js';
import { stableListener } from './rules/stable-listener.js';
import { useFormSchema } from './rules/use-form-schema.js';
import recommended from './configs/recommended.js';

const plugin = {
  meta: {
    name: 'form-state',
    version: '1.0.0',
  },
  rules: {
    'avoid-input-password': avoidInputPassword,
    'stable-debounced-callback': stableDebouncedCallback,
    'stable-listener': stableListener,
    'use-form-schema': useFormSchema,
  },
  configs: {},
};

plugin.configs.recommended = recommended(plugin);

export default plugin;
