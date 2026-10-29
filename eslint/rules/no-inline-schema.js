import { findVariable, isDeclaredInComponentOrHook } from './rule-utils.js';

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

// Hook calls (useMemo, useDeepMemo, custom hooks) are assumed to return a stable schema.
function isHookCall(node) {
  const name = node.type === 'CallExpression' ? getHookName(node.callee) : null;
  return name !== null && /^use[A-Z]/.test(name);
}

// A schema built in a component or hook body and then passed by name.
function isRenderScopedSchema(variable) {
  return (
    Boolean(variable) &&
    isDeclaredInComponentOrHook(variable) &&
    variable.defs.some(
      (def) =>
        def.type === 'Variable' &&
        def.node.init &&
        isInlineSchemaExpression(def.node.init) &&
        !isHookCall(def.node.init)
    )
  );
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
      inlineSchemaReference:
        'The schema "{{name}}" passed to {{hook}}() is rebuilt on every render and breaks form state. Declare it at module scope, or memoize it with useMemo / useDeepMemo.',
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

        if (
          firstArg.type === 'Identifier' &&
          isRenderScopedSchema(findVariable(context.sourceCode.getScope(node), firstArg.name))
        ) {
          context.report({
            node: firstArg,
            messageId: 'inlineSchemaReference',
            data: { name: firstArg.name, hook: getHookName(node.callee) },
          });
          return;
        }

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
