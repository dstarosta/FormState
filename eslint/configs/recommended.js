import base from '../base.js';

export default {
  plugins: { 'form-state': base },
  rules: {
    'form-state/use-form-schema': 'warn',
    'form-state/stable-listener': 'error',
    'form-state/stable-debounced-listener': 'error',
    'form-state/avoid-input-password': 'warn',
  },
};
