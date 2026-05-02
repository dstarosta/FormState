export const stableDebouncedCallback = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce stable callback references in change() calls that use debounceIntervalMs',
      recommended: true,
    },
    schema: [],
    messages: {
      unstableCallback:
        'The callback passed to change() with debounceIntervalMs is an inline function. Wrap it with useCallback() or define it outside the component.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;

        const isChange =
          (callee.type === 'Identifier' && callee.name === 'change') ||
          (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'change');

        if (!isChange) return;

        const options = node.arguments[2];
        if (!options || options.type !== 'ObjectExpression') return;

        const hasDebounce = options.properties.some(
          (p) =>
            p.type === 'Property' &&
            !p.computed &&
            p.key.type === 'Identifier' &&
            p.key.name === 'debounceIntervalMs'
        );

        if (!hasDebounce) return;

        const callbackProp = options.properties.find(
          (p) =>
            p.type === 'Property' &&
            !p.computed &&
            p.key.type === 'Identifier' &&
            p.key.name === 'callback'
        );

        if (!callbackProp) return;

        const cb = callbackProp.value;
        if (cb.type === 'ArrowFunctionExpression' || cb.type === 'FunctionExpression') {
          context.report({ node: cb, messageId: 'unstableCallback' });
        }
      },
    };
  },
};
