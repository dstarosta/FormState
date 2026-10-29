function isJsxElement(node) {
  return typeof node === 'object' && node !== null && node.type === 'JSXElement';
}

function isPasswordInput(node) {
  return (
    node.name.name === 'input' &&
    node.attributes.some(
      (a) =>
        a.type === 'JSXAttribute' &&
        a.name?.name === 'type' &&
        ((a.value?.type === 'Literal' && a.value.value === 'password') ||
          (a.value?.type === 'JSXExpressionContainer' &&
            a.value.expression?.type === 'Literal' &&
            a.value.expression.value === 'password'))
    )
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

function getPasswordTypeAttr(attributes) {
  return attributes.find(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name?.name === 'type' &&
      ((a.value?.type === 'Literal' && a.value.value === 'password') ||
        (a.value?.type === 'JSXExpressionContainer' &&
          a.value.expression?.type === 'Literal' &&
          a.value.expression.value === 'password'))
  );
}

function getImportFix(fixer, sourceCode) {
  const body = sourceCode.ast.body;
  const formStateImport = body.find(
    (n) => n.type === 'ImportDeclaration' && n.source.value === 'form-state'
  );

  if (formStateImport) {
    const alreadyImported = formStateImport.specifiers.some(
      (s) => s.type === 'ImportSpecifier' && s.imported.name === 'SecureInput'
    );

    if (alreadyImported) {
      return null;
    }

    const lastSpecifier = formStateImport.specifiers.at(-1);

    return lastSpecifier
      ? fixer.insertTextAfter(lastSpecifier, ', SecureInput')
      : fixer.replaceText(formStateImport, "import { SecureInput } from 'form-state';");
  }

  const lastImport = [...body].findLast((n) => n.type === 'ImportDeclaration');

  return lastImport
    ? fixer.insertTextAfter(lastImport, "\nimport { SecureInput } from 'form-state';")
    : fixer.insertTextBefore(body[0], "import { SecureInput } from 'form-state';\n");
}

export const avoidInputPassword = {
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        'Enforce using SecureInput instead of <input type="password"> inside forms with action or onSubmit handlers',
      recommended: true,
    },
    schema: [],
    messages: {
      useSecureInput:
        'Use <SecureInput> instead of <input type="password"> inside forms with action or onSubmit handlers.',
      replaceWithSecureInput:
        'Replace with <SecureInput> (read its plaintext through onSecureChange, not onChange).',
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
                context.report({
                  node,
                  messageId: 'useSecureInput',
                  suggest: [
                    {
                      messageId: 'replaceWithSecureInput',
                      fix(fixer) {
                        const fixes = [];
                        const { sourceCode } = context;

                        fixes.push(fixer.replaceText(node.name, 'SecureInput'));

                        const typeAttr = getPasswordTypeAttr(node.attributes);
                        const tokenBefore = sourceCode.getTokenBefore(typeAttr);
                        fixes.push(fixer.removeRange([tokenBefore.range[1], typeAttr.range[1]]));

                        if (node.parent.closingElement) {
                          fixes.push(
                            fixer.replaceText(node.parent.closingElement.name, 'SecureInput')
                          );
                        }

                        const importFix = getImportFix(fixer, sourceCode);
                        if (importFix) {
                          fixes.push(importFix);
                        }

                        return fixes;
                      },
                    },
                  ],
                });
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
