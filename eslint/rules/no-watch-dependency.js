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

    const scopeStack = [];

    function currentScope() {
      return scopeStack.at(-1);
    }

    function enterScope() {
      scopeStack.push({ watchVars: new Set(), declaredVars: new Set() });
    }

    function exitScope() {
      scopeStack.pop();
    }

    return {
      FunctionDeclaration: enterScope,
      FunctionExpression: enterScope,
      ArrowFunctionExpression: enterScope,
      'FunctionDeclaration:exit': exitScope,
      'FunctionExpression:exit': exitScope,
      'ArrowFunctionExpression:exit': exitScope,

      VariableDeclarator(node) {
        const scope = currentScope();

        if (!scope || node.id.type !== 'Identifier') {
          return;
        }

        scope.declaredVars.add(node.id.name);

        if (node.init?.type === 'CallExpression' && isUseWatch(node.init.callee)) {
          scope.watchVars.add(node.id.name);
        }
      },

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

        for (const dep of deps.elements) {
          if (!dep || dep.type !== 'Identifier') {
            continue;
          }

          for (let i = scopeStack.length - 1; i >= 0; i--) {
            const scope = scopeStack[i];
            if (scope.watchVars.has(dep.name)) {
              context.report({ node: dep, messageId: 'watchDependency', data: { name: dep.name } });
              break;
            }
            if (scope.declaredVars.has(dep.name)) {
              break;
            }
          }
        }
      },
    };
  },
};
