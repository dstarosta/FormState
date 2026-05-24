/* eslint-disable react-hooks/refs -- ref-cache pattern (same shape as useMemo's internals) */
import { useRef, type DependencyList } from 'react';
import { deepEqual } from './deep-equal';

const sameDeps = (dependenciesA: DependencyList, dependenciesB: DependencyList) => {
  if (dependenciesA === dependenciesB) {
    return true;
  }

  if (dependenciesA.length !== dependenciesB.length) {
    return false;
  }

  for (const [i, dep] of dependenciesA.entries()) {
    if (Object.is(dep, dependenciesB[i])) {
      continue;
    }

    if (!deepEqual(dep, dependenciesB[i])) {
      return false;
    }
  }

  return true;
};

/**
 * Like {@link useMemo} but compares dependencies via deep equality instead of
 * `Object.is`. Use sparingly — deep comparison costs scale with dep size.
 * Prefer `useMemo` for primitive or stable-reference deps.
 */
export function useDeepMemo<T>(factory: () => T, deps: React.DependencyList) {
  const ref = useRef<{ deps: React.DependencyList; value: T }>(null);

  if (!ref.current || !sameDeps(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}
