// This logic is based on the "dot-prop-immutable" package using strict TypeScript.

const ESCAPED_DOT_RE = /(?:^|[^\\])\\$/;
const ARRAY_INDEX_RE = /^\+?\d+$/;
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Convert a dot-separated string into an array of property names.
 * Handles escaped dots (e.g., "a\\.b.c" becomes ["a.b", "c"])
 */
function propToArray(prop: string) {
  const segments = prop.split('.');
  const result: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const el = segments[i] as string;
    const last = i > 0 ? segments[i - 1] : undefined;

    if (last && ESCAPED_DOT_RE.test(last)) {
      const prev = result.pop();
      if (prev) {
        result.push(prev.slice(0, -1) + '.' + el);
      }
    } else {
      result.push(el);
    }
  }

  return result;
}

/**
 * Validate and return an array index.
 * Supports '$end' as an alias for the last index.
 */
function getArrayIndex(head: string, obj: unknown[]) {
  if (head === '$end') {
    return Math.max(obj.length - 1, 0);
  }

  if (!ARRAY_INDEX_RE.test(head)) {
    throw new Error(`Array index '${head}' must be a non-negative integer.`);
  }

  return Number.parseInt(head, 10);
}

/**
 * Get a value by a dot path.
 * @param obj The object to evaluate.
 * @param prop The path to value that should be returned.
 * @returns The value at the specified path, or undefined if not found.
 */
export function dotPathGet(obj: object, prop: string | number | string[]) {
  let propArray: string[];
  if (typeof prop === 'number') {
    propArray = propToArray(prop.toString());
  } else if (typeof prop === 'string') {
    propArray = propToArray(prop);
  } else {
    propArray = prop;
  }

  let current: unknown = obj;

  for (const pathSegment of propArray) {
    if (current === null || typeof current !== 'object') {
      return;
    }

    if (FORBIDDEN_SEGMENTS.has(pathSegment)) {
      return;
    }

    let head: string | number = pathSegment;

    if (Array.isArray(current) && head === '$end') {
      head = current.length - 1;
    }

    current = (current as Record<string | number, unknown>)[head];
  }

  return current;
}

/**
 * Set a value by a dot path (immutably).
 * Creates a new object/array structure with the specified value set at the path.
 * @param obj The object to evaluate.
 * @param prop The path to be set.
 * @param value The new value, or an updater function that receives the current
 *              value at the leaf and returns the new value.
 * @returns A new object with the value set at the specified path.
 */
export function dotPathSet(obj: object, prop: string | number | string[], value: unknown) {
  let propArray: string[];

  if (typeof prop === 'number') {
    propArray = propToArray(prop.toString());
  } else if (typeof prop === 'string') {
    propArray = propToArray(prop);
  } else {
    propArray = prop;
  }

  const setPropImmutableRec = (current: unknown, paths: string[], val: unknown, i: number) => {
    if (i < paths.length && paths[i] !== undefined) {
      const head = paths[i];

      if (FORBIDDEN_SEGMENTS.has(head)) {
        throw new Error(`Path segment '${head}' is not allowed.`);
      }

      let actualHead: string | number = head;
      const isArr = Array.isArray(current);

      if (isArr) {
        actualHead = getArrayIndex(head, current as unknown[]);
      }

      const currentValue = (current as Record<string | number, unknown>)[actualHead];
      const nextValue = currentValue === undefined ? {} : currentValue;
      const newValue = setPropImmutableRec(nextValue, paths, val, i + 1);

      if (newValue === currentValue) {
        return current;
      }

      const clone: unknown = isArr
        ? [...(current as unknown[])]
        : Object.assign({}, current as object);

      (clone as Record<string | number, unknown>)[actualHead] = newValue;

      return clone;
    }

    if (typeof val === 'function') {
      return (val as (current: unknown) => unknown)(current);
    }

    return val;
  };

  return setPropImmutableRec(obj, propArray, value, 0);
}
