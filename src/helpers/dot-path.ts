// This logic is based on the "dot-prop-immutable" package using strict TypeScript.

/**
 * Convert a dot-separated string into an array of property names.
 * Handles escaped dots (e.g., "a\\.b.c" becomes ["a.b", "c"])
 */
function propToArray(prop: string) {
  // eslint-disable-next-line unicorn/no-array-reduce
  return prop.split('.').reduce<string[]>((ret, el, index, list) => {
    const last = index > 0 && list[index - 1];

    if (last && /(?:^|[^\\])\\$/.test(last)) {
      const prev = ret.pop();
      if (prev) {
        ret.push(prev.slice(0, -1) + '.' + el);
      }
    } else {
      ret.push(el);
    }

    return ret;
  }, []);
}

/**
 * Validate and return an array index.
 * Supports '$end' as an alias for the last index.
 */
function getArrayIndex(head: string, obj: unknown[]) {
  if (head === '$end') {
    return Math.max(obj.length - 1, 0);
  }

  if (!/^\+?\d+$/.test(head)) {
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
 * @param value The value to set.
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
      let clone: unknown;
      let actualHead: string | number = head;

      if (Array.isArray(current)) {
        actualHead = getArrayIndex(head, current);
        clone = [...(current as unknown[])];
      } else {
        clone = Object.assign({}, current as object);
      }

      const currentValue = (current as Record<string | number, unknown>)[actualHead];
      const nextValue = currentValue === undefined ? {} : currentValue;

      (clone as Record<string | number, unknown>)[actualHead] = setPropImmutableRec(
        nextValue,
        paths,
        val,
        i + 1
      );

      return clone;
    }

    if (typeof val === 'function') {
      return (val as (current: unknown) => unknown)(current);
    }

    return val;
  };

  return setPropImmutableRec(obj, propArray, value, 0);
}
