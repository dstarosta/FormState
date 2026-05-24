// Internal methods

export const deepEqual = (a: unknown, b: unknown): boolean => {
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

  if (Array.isArray(a)) {
    const bArr = b as unknown[];
    if (a.length !== bArr.length) {
      return false;
    }
    for (const [i, aItem] of a.entries()) {
      if (!deepEqual(aItem, bArr[i])) {
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
        if (deepEqual(aKey, entry[0]) && deepEqual(aValue, entry[1])) {
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

        if (deepEqual(aItem, bItem)) {
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
    if (!Object.prototype.hasOwnProperty.call(bObj, key) || !deepEqual(aObj[key], bObj[key])) {
      return false;
    }
  }

  return true;
};
