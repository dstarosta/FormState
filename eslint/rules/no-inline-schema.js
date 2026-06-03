const SCHEMA_HOOKS = new Set(['useFormState', 'useFormStateContext']);

function getHookName(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression' && node.property.type === 'Identifier') {
    return node.property.name;
  }
  return null;
}

function isInlineSchemaExpression(node) {
  switch (node.type) {
    case 'CallExpression':
    case 'NewExpression':
    case 'ObjectExpression':
    case 'ArrayExpression': {
      return true;
    }
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
    case 'TSTypeAssertion': {
      return isInlineSchemaExpression(node.expression);
    }
    default: {
      return false;
    }
  }
}

export const noInlineSchema = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow inline schema construction inside FormState hooks; the schema must be referentially stable across renders',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalHooks: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      inlineSchema:
        'Do not construct the schema inline in {{hook}}(). It is rebuilt on every render and breaks form state. Declare the schema at module scope, or memoize it with useMemo / useDeepMemo.',
    },
  },

  create(context) {
    const { additionalHooks = [] } = context.options[0] ?? {};
    const hooks = new Set([...SCHEMA_HOOKS, ...additionalHooks]);

    function isHook(node) {
      const name = getHookName(node);
      return name !== null && hooks.has(name);
    }

    return {
      CallExpression(node) {
        if (!isHook(node.callee)) {
          return;
        }

        if (node.arguments.length === 0) {
          return;
        }

        const firstArg = node.arguments[0];

        if (!isInlineSchemaExpression(firstArg)) {
          return;
        }

        context.report({
          node: firstArg,
          messageId: 'inlineSchema',
          data: { hook: getHookName(node.callee) },
        });
      },
    };
  },
};
