const mapping = {
  string: 'formString',
  number: 'formNumber',
  boolean: 'formBoolean',
  date: 'formDate',
  array: 'formArray',
};

export const useFormSchema = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce using form-state form* helpers for form schemas',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      useFormSchema: "Use z.{{formHelper}}() from 'form-state' instead of z.{{primitive}}()",
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== 'MemberExpression' ||
          callee.object.type !== 'Identifier' ||
          callee.object.name !== 'z' ||
          callee.property.type !== 'Identifier'
        ) {
          return;
        }

        const method = callee.property.name;
        const target = mapping[method];
        if (!target) return;

        if (node.parent.type === 'CallExpression') {
          const pc = node.parent.callee;
          if (
            pc.type === 'MemberExpression' &&
            pc.object.type === 'Identifier' &&
            pc.object.name === 'z' &&
            pc.property.type === 'Identifier' &&
            pc.property.name.startsWith('form')
          ) {
            return;
          }
        }

        let current = node.parent;
        let isDirectInObjectSchema = false;

        while (current) {
          if (current.type === 'Property' && current.value === node) {
            const objectExpr = current.parent;
            if (objectExpr.type === 'ObjectExpression') {
              const call = objectExpr.parent;
              if (
                call.type === 'CallExpression' &&
                call.callee.type === 'MemberExpression' &&
                call.callee.object.type === 'Identifier' &&
                call.callee.object.name === 'z' &&
                call.callee.property.type === 'Identifier'
              ) {
                isDirectInObjectSchema = true;
                break;
              }
            }
          }
          current = current.parent;
        }

        if (!isDirectInObjectSchema) return;

        if (method === 'array' && node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          if (
            firstArg?.type === 'CallExpression' &&
            firstArg.callee.type === 'MemberExpression' &&
            firstArg.callee.property.type === 'Identifier' &&
            (firstArg.callee.property.name === 'object' ||
              firstArg.callee.property.name === 'array')
          ) {
            return;
          }
        }

        context.report({
          node,
          messageId: 'useFormSchema',
          data: {
            formHelper: target,
            primitive: method,
          },
          fix: (fixer) =>
            callee.property.range ? fixer.replaceTextRange(callee.property.range, target) : null,
        });
      },
    };
  },
};
