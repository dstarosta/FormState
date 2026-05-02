import base from './base.js';
import recommended from './configs/recommended.js';

const plugin = {
  ...base,
  configs: {
    recommended,
  },
};

export default plugin;
