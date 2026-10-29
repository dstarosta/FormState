export function isFormStateSource(value) {
  if (typeof value !== 'string') {
    return false;
  }

  if (value === 'form-state' || value.startsWith('form-state/')) {
    return true;
  }

  return /^(\.\.?\/)+src$/.test(value);
}

export function getImportSource(identifier, scope) {
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

export function findVariable(scope, name) {
  for (let current = scope; current; current = current.upper) {
    const variable = current.set.get(name);

    if (variable) {
      return variable;
    }
  }

  return null;
}

const COMPONENT_OR_HOOK_NAME = /^(?:[A-Z]|use[A-Z0-9])/;

// The name of a function declaration, a function assigned to a variable, or a function wrapped in
// a call assigned to a variable (e.g. `const Form = memo(() => ...)`).
function getFunctionName(node) {
  if (node.id) {
    return node.id.name;
  }

  const parent = node.parent;
  const declarator = parent?.type === 'CallExpression' ? parent.parent : parent;

  return declarator?.type === 'VariableDeclarator' && declarator.id.type === 'Identifier'
    ? declarator.id.name
    : null;
}

// Declared directly in a component or hook body, so it is re-created on every render.
export function isDeclaredInComponentOrHook(variable) {
  let scope = variable.scope;

  while (scope && scope.type !== 'function') {
    scope = scope.upper;
  }

  const name = scope ? getFunctionName(scope.block) : null;

  return name !== null && COMPONENT_OR_HOOK_NAME.test(name);
}
