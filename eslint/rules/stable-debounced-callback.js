// Deprecated: `change()` keys debounced updates by field and always runs the latest callback, so a
// new (e.g. inline) callback reference per call is fine. The rule is kept, without reporting, so
// that configs referencing it keep working.
export const stableDebouncedCallback = {
  meta: {
    type: 'suggestion',
    deprecated: true,
    docs: {
      description:
        'Deprecated: debounced change() callbacks no longer need stable references (the latest callback always runs)',
      recommended: false,
    },
    schema: [],
    messages: {},
  },

  create() {
    return {};
  },
};
