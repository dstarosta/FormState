import { findVariable } from './rule-utils.js';

const HOOKS_DEPS_ARG = new Map([
  ['useCallback', 1],
  ['useDeepMemo', 1],
  ['useEffect', 1],
  ['useImperativeHandle', 2],
  ['useInsertionEffect', 1],
  ['useIsomorphicLayoutEffect', 1],
  ['useLayoutEffect', 1],
  ['useMemo', 1],
]);

function getHookName(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression' && node.property.type === 'Identifier') {
    return node.property.name;
  }
  return null;
}

function isUseWatch(node) {
  return (
    (node.type === 'Identifier' && node.name === 'useWatch') ||
    (node.type === 'MemberExpression' &&
      node.property.type === 'Identifier' &&
      node.property.name === 'useWatch')
  );
}

// `a`, `a.b`, `a?.b.c` -> `a`
function getRootIdentifier(node) {
  let current = node.type === 'ChainExpression' ? node.expression : node;

  while (current.type === 'MemberExpression') {
    current = current.object;
  }

  return current.type === 'Identifier' ? current : null;
}

// Declared from a useWatch() call, directly or through destructuring.
function isWatchVariable(variable) {
  return Boolean(
    variable?.defs.some(
      (def) =>
        def.type === 'Variable' &&
        def.node.init?.type === 'CallExpression' &&
        isUseWatch(def.node.init.callee)
    )
  );
}

export const noWatchDependency = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using useWatch values as hook dependencies',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalHooks: {
            type: 'object',
            additionalProperties: { type: 'integer', minimum: 0 },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      watchDependency:
        '"{{name}}" comes from useWatch() and changes via external store subscriptions outside of React state. Do not use it as a hook dependency.',
    },
  },

  create(context) {
    const { additionalHooks = {} } = context.options[0] ?? {};
    const hooksMap = new Map([...HOOKS_DEPS_ARG, ...Object.entries(additionalHooks)]);

    return {
      CallExpression(node) {
        const hookName = getHookName(node.callee);
        const depsIndex = hookName ? hooksMap.get(hookName) : undefined;

        if (depsIndex === undefined) {
          return;
        }

        const deps = node.arguments[depsIndex];

        if (!deps || deps.type !== 'ArrayExpression') {
          return;
        }

        const scope = context.sourceCode.getScope(node);

        for (const dep of deps.elements) {
          const root = dep ? getRootIdentifier(dep) : null;

          if (root && isWatchVariable(findVariable(scope, root.name))) {
            context.report({ node: dep, messageId: 'watchDependency', data: { name: root.name } });
          }
        }
      },
    };
  },
};
