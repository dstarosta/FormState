export const stableListener = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce stable listener references passed to useListener',
      recommended: true,
    },
    schema: [],
    messages: {
      unstableListener:
        'The listener passed to useListener() is an inline function. Wrap it with useCallback() or define it outside the component.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;

        const isUseListener =
          (callee.type === 'Identifier' && callee.name === 'useListener') ||
          (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'useListener');

        if (!isUseListener) return;

        const listener = node.arguments[0];
        if (!listener) return;

        if (listener.type === 'ArrowFunctionExpression' || listener.type === 'FunctionExpression') {
          context.report({ node: listener, messageId: 'unstableListener' });
        }
      },
    };
  },
};
