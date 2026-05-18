/* eslint-disable react-hooks/refs -- ref-cache pattern (same shape as useMemo's internals) */
import { useRef } from 'react';
import { deepEqual } from 'fast-equals';

/**
 * Like {@link useMemo} but compares dependencies via deep equality (fast-equals)
 * instead of Object.is. Use sparingly — deep comparison costs scale with dep size.
 * Prefer `useMemo` for primitive or stable-reference deps.
 */
export function useDeepMemo<T>(factory: () => T, deps: React.DependencyList) {
  const ref = useRef<{ deps: React.DependencyList; value: T }>(null);

  if (!ref.current || !deepEqual(deps, ref.current.deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}
