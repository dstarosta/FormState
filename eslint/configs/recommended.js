export default (plugin) => {
  const name = plugin.meta.name;
  return [
    {
      name: `${name}/recommended`,
      plugins: {
        [name]: plugin,
      },
      rules: {
        [`${name}/avoid-input-password`]: 'warn',
        [`${name}/no-watch-dependency`]: 'error',
        [`${name}/stable-debounced-callback`]: 'error',
        [`${name}/use-form-schema`]: 'warn',
      },
    },
  ];
};
