function isJsxElement(node) {
  return typeof node === 'object' && node !== null && node.type === 'JSXElement';
}

function isPasswordInput(node) {
  if (node.name.name !== 'input') {
    return false;
  }

  return node.attributes.some(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name?.name === 'type' &&
      ((a.value?.type === 'Literal' && a.value.value === 'password') ||
        (a.value?.type === 'JSXExpressionContainer' &&
          a.value.expression?.type === 'Literal' &&
          a.value.expression.value === 'password'))
  );
}

function formHasHandler(opening) {
  return opening.attributes.some(
    (a) =>
      a.type === 'JSXAttribute' &&
      (a.name?.name === 'action' || a.name?.name === 'onSubmit') &&
      a.value?.type === 'JSXExpressionContainer'
  );
}

export const avoidInputPassword = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce using SecureInput instead of <input type="password"> inside forms with action or onSubmit handlers',
      recommended: true,
    },
    schema: [],
    messages: {
      useSecureInput:
        'Use <SecureInput> instead of <input type="password"> inside forms with action or onSubmit handlers.',
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        if (!isPasswordInput(node)) {
          return;
        }

        let current = node.parent;
        while (current != null) {
          if (isJsxElement(current)) {
            const opening = current.openingElement;
            if (
              opening.name.type === 'JSXIdentifier' &&
              (opening.name.name === 'form' || opening.name.name === 'Form')
            ) {
              if (formHasHandler(opening)) {
                context.report({ node, messageId: 'useSecureInput' });
              }
              return;
            }
          }
          current = current.parent;
        }
      },
    };
  },
};
