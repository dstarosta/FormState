const CONTAINER_CALLS = new Set(['object', 'strictObject', 'array', 'formArray']);

const GROUP_CALL = 'group';

function getCalleeName(node) {
  const callee = node.callee;
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return null;
}

function isCall(node, name) {
  return node.type === 'CallExpression' && getCalleeName(node) === name;
}

function isContainerCall(node) {
  return node.type === 'CallExpression' && CONTAINER_CALLS.has(getCalleeName(node) ?? '');
}

export const noNestedGroup = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow z.group() on nested schema properties; groups are only allowed on root-level properties',
      recommended: true,
    },
    schema: [],
    messages: {
      nestedGroup:
        'z.group() is only allowed on root-level schema properties. Move the group off this nested property (object field, array element, or deeper field).',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        if (!isCall(node, GROUP_CALL)) {
          return;
        }

        let containers = 0;
        let ancestor = node.parent;

        while (ancestor) {
          if (isContainerCall(ancestor)) {
            containers += 1;
            if (containers > 1) {
              context.report({ node, messageId: 'nestedGroup' });
              return;
            }
          }
          ancestor = ancestor.parent;
        }
      },
    };
  },
};
