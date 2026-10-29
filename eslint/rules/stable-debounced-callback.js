import { findVariable, isDeclaredInComponentOrHook } from './rule-utils.js';

// A function created during render: an inline function variable or a nested function declaration.
function isRenderScopedFunction(variable) {
  if (!variable || !isDeclaredInComponentOrHook(variable)) {
    return false;
  }

  return variable.defs.some(
    (def) =>
      def.type === 'FunctionName' ||
      (def.type === 'Variable' &&
        (def.node.init?.type === 'ArrowFunctionExpression' ||
          def.node.init?.type === 'FunctionExpression'))
  );
}

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
      unstableCallbackReference:
        'The callback "{{name}}" passed to change() with debounceIntervalMs is created on every render. Wrap it with useCallback() or define it outside the component.',
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

        if (!isChange) {
          return;
        }

        const options = node.arguments[2];

        if (!options || options.type !== 'ObjectExpression') {
          return;
        }

        const hasDebounce = options.properties.some(
          (p) =>
            p.type === 'Property' &&
            !p.computed &&
            p.key.type === 'Identifier' &&
            p.key.name === 'debounceIntervalMs'
        );

        if (!hasDebounce) {
          return;
        }

        const callbackProp = options.properties.find(
          (p) =>
            p.type === 'Property' &&
            !p.computed &&
            p.key.type === 'Identifier' &&
            p.key.name === 'callback'
        );

        if (!callbackProp) {
          return;
        }

        const callback = callbackProp.value;

        if (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression') {
          context.report({ node: callback, messageId: 'unstableCallback' });
        } else if (
          callback.type === 'Identifier' &&
          isRenderScopedFunction(findVariable(context.sourceCode.getScope(node), callback.name))
        ) {
          context.report({
            node: callback,
            messageId: 'unstableCallbackReference',
            data: { name: callback.name },
          });
        }
      },
    };
  },
};
