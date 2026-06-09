const VALIDATE_FORWARDABLE_KEYS = new Set(['path', 'error']);

function isFormStateSource(value) {
  if (typeof value !== 'string') {
    return false;
  }

  if (value === 'form-state' || value.startsWith('form-state/')) {
    return true;
  }

  return /^(\.\.?\/)+src$/.test(value);
}

function getImportSource(identifier, scope) {
  let currentScope = scope;

  while (currentScope) {
    const variable = currentScope.variables.find((v) => v.name === identifier.name);

    if (variable) {
      for (const def of variable.defs) {
        if (def.type === 'ImportBinding' && def.parent && def.parent.type === 'ImportDeclaration') {
          return def.parent.source.value;
        }
      }

      return null;
    }

    currentScope = currentScope.upper;
  }

  return null;
}

function isFormStateRefine(node, scope) {
  const callee = node.callee;

  if (callee.type === 'Identifier') {
    return isFormStateSource(getImportSource(callee, scope));
  }

  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    return isFormStateSource(getImportSource(callee.object, scope));
  }

  return false;
}

function getCalleeName(callee) {
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return null;
}

function isAsyncFunction(node) {
  return (
    node !== undefined &&
    (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') &&
    node.async
  );
}

function usesContextParam(node) {
  return (
    (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') &&
    node.params.length > 1
  );
}

function isPredicateConvertible(node) {
  if (!node) {
    return false;
  }

  if (node.type !== 'ArrowFunctionExpression' && node.type !== 'FunctionExpression') {
    return false;
  }

  return !isAsyncFunction(node) && !usesContextParam(node);
}

function classifyOptions(optionsArg) {
  if (optionsArg === undefined) {
    return { kind: 'none' };
  }

  if (optionsArg.type === 'Literal' && typeof optionsArg.value === 'string') {
    return { kind: 'string' };
  }

  if (optionsArg.type !== 'ObjectExpression') {
    return { kind: 'blocked' };
  }

  let errorProp;

  for (const prop of optionsArg.properties) {
    if (prop.type !== 'Property' || prop.computed || prop.key.type !== 'Identifier') {
      return { kind: 'blocked' };
    }
    if (!VALIDATE_FORWARDABLE_KEYS.has(prop.key.name)) {
      return { kind: 'blocked' };
    }
    if (prop.key.name === 'error') {
      errorProp = prop;
    }
  }

  const props = optionsArg.properties;
  const onlyError = props.length === 1 && errorProp !== undefined;

  return { kind: 'convertible', errorProp, onlyError, props };
}

export const preferValidateOverRefine = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Recommend z.validate over z.refine for single-stage whole-object validation when the refine block uses only features validate supports',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      preferValidate:
        'Prefer {{validateName}}() over {{refineName}}() here. This refine only uses features {{validateName}} supports, and {{validateName}} keeps the form on a single validation stage. Use {{refineName}} only when you need raw-refine features (the `when` payload, custom issue codes, `abort`).',
      preferValidateAsync:
        'This {{refineName}}() uses an async predicate. A raw async refine bypasses the form async-validation lifecycle ({{asyncName}}() registers debouncing, skipWhen, submitOnly, and asyncValidating tracking). Did you mean {{asyncName}}()? This is not auto-fixable — the rewrite changes runtime behavior, so convert it deliberately.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    return {
      CallExpression(node) {
        const calleeName = getCalleeName(node.callee);

        if (calleeName !== 'refine') {
          return;
        }

        if (!isFormStateRefine(node, sourceCode.getScope(node))) {
          return;
        }

        const isMember = node.callee.type === 'MemberExpression';
        const memberObject = isMember ? sourceCode.getText(node.callee.object) : null;
        const refineName = isMember ? `${memberObject}.refine` : 'refine';
        const validateName = isMember ? `${memberObject}.validate` : 'validate';
        const asyncName = isMember ? `${memberObject}.validateAsync` : 'validateAsync';

        const [predicateArg, optionsArg] = node.arguments;

        if (node.arguments.some((a) => a.type === 'SpreadElement')) {
          return;
        }

        if (isAsyncFunction(predicateArg)) {
          context.report({
            node,
            messageId: 'preferValidateAsync',
            data: { refineName, asyncName },
          });
          return;
        }

        if (node.arguments.length > 2) {
          return;
        }

        if (!isPredicateConvertible(predicateArg)) {
          return;
        }

        const options = classifyOptions(optionsArg);

        if (options.kind === 'blocked' || options.kind === 'string') {
          return;
        }

        context.report({
          node,
          messageId: 'preferValidate',
          data: { refineName, validateName },
          fix(fixer) {
            const fixes = [fixer.replaceText(node.callee, validateName)];

            if (options.kind === 'convertible' && options.onlyError) {
              const errorValue = options.errorProp.value;
              fixes.push(fixer.replaceText(optionsArg, sourceCode.getText(errorValue)));
            }

            return fixes;
          },
        });
      },
    };
  },
};
