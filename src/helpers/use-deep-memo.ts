/* eslint-disable react-hooks/refs */
import { useRef } from 'react';
import { deepEqual } from 'fast-equals';

export const useDeepMemo = <T>(factory: () => T, deps: React.DependencyList) => {
  const ref = useRef<{ deps: React.DependencyList; value: T }>(null);

  if (!ref.current || !deepEqual(deps, ref.current.deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
};
