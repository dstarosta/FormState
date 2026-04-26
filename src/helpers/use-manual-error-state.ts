import { useMemo, useRef } from 'react';

import type { ManualErrorState } from '../types/form-types';

const EMPTY_STORE: Record<string, string> = Object.freeze({});

export function useManualErrorState() {
  const ref = useRef(EMPTY_STORE);

  const response = useMemo<ManualErrorState>(
    () => ({
      get: () => ref.current,
      set: (value: Readonly<Record<string, string>> = EMPTY_STORE) => {
        ref.current = value;
      },
      remove: (predicate: (key: string) => boolean) => {
        ref.current = Object.fromEntries(
          Object.entries(ref.current).filter((entry) => !predicate(entry[0]))
        );
      },
    }),
    []
  );

  return response;
}
