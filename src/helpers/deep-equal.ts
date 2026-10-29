// Internal methods

// Object pairs currently being compared; a pair seen again is part of a cycle and assumed equal.
type Visited = WeakMap<object, WeakSet<object>>;

export const deepEqual = (a: unknown, b: unknown): boolean => equal(a, b, new WeakMap());

const equal = (a: unknown, b: unknown, visited: Visited): boolean => {
  if (a === b || (a !== a && b !== b)) {
    return true;
  }

  if (a === null || b === null) {
    return false;
  }

  const typeofA = typeof a;
  if (typeofA !== typeof b) {
    return false;
  }

  if (typeofA !== 'object') {
    return false;
  }

  if ((a as object).constructor !== (b as object).constructor) {
    return false;
  }

  // Files and blobs have no enumerable state, so only the same instance is equal.
  if (typeof Blob !== 'undefined' && a instanceof Blob) {
    return false;
  }

  if (a instanceof URL) {
    return a.href === (b as URL).href;
  }

  const objA = a as object;
  const objB = b as object;

  let seen = visited.get(objA);

  if (seen?.has(objB)) {
    return true;
  }

  if (!seen) {
    seen = new WeakSet();
    visited.set(objA, seen);
  }

  // Only pairs still being compared count as cycles; the pair is released once it is decided.
  seen.add(objB);

  const result = equalObjects(objA, objB, visited);

  seen.delete(objB);

  return result;
};

const equalObjects = (a: object, b: object, visited: Visited): boolean => {
  if (Array.isArray(a)) {
    const bArr = b as unknown[];
    if (a.length !== bArr.length) {
      return false;
    }
    for (const [i, aItem] of a.entries()) {
      if (!equal(aItem, bArr[i], visited)) {
        return false;
      }
    }
    return true;
  }

  if (a instanceof Date) {
    const aTime = a.getTime();
    const bTime = (b as Date).getTime();
    return aTime === bTime || (aTime !== aTime && bTime !== bTime);
  }

  if (a instanceof Map) {
    const bMap = b as Map<unknown, unknown>;
    if (a.size !== bMap.size) {
      return false;
    }
    if (a.size === 0) {
      return true;
    }

    const bEntries: [unknown, unknown][] = [...bMap];
    const matched: boolean[] = Array.from({ length: bEntries.length });

    outer: for (const [aKey, aValue] of a) {
      for (const [i, entry] of bEntries.entries()) {
        if (matched[i]) {
          continue;
        }
        if (equal(aKey, entry[0], visited) && equal(aValue, entry[1], visited)) {
          matched[i] = true;
          continue outer;
        }
      }
      return false;
    }
    return true;
  }

  if (a instanceof Set) {
    const bSet = b as Set<unknown>;

    if (a.size !== bSet.size) {
      return false;
    }

    if (a.size === 0) {
      return true;
    }

    const bItems = [...bSet];
    const matched: boolean[] = Array.from({ length: bItems.length });

    outer: for (const aItem of a) {
      for (const [i, bItem] of bItems.entries()) {
        if (matched[i]) {
          continue;
        }

        if (equal(aItem, bItem, visited)) {
          matched[i] = true;
          continue outer;
        }
      }

      return false;
    }

    return true;
  }

  if (a instanceof RegExp) {
    const bRegExp = b as RegExp;

    return a.source === bRegExp.source && a.flags === bRegExp.flags;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);

  if (aKeys.length !== Object.keys(bObj).length) {
    return false;
  }

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key) || !equal(aObj[key], bObj[key], visited)) {
      return false;
    }
  }

  return true;
};
