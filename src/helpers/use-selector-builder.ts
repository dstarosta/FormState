import { useDebugValue } from 'react';

import type { Selector } from '../types/form-types';

import { pickGroupData } from './state-manager';
import { useSelector } from './use-form-selector';

export function createUseSelector(groups: Record<string, string>) {
  function useGroupSelector(
    first: string | Selector<unknown, unknown> | Selector<unknown, unknown>[],
    second?: (...inputs: unknown[]) => unknown
  ) {
    useDebugValue('FormStateSelector');

    const firstInput: Selector<unknown, unknown> | Selector<unknown, unknown>[] =
      typeof first === 'string'
        ? (data) => pickGroupData(groups, first, data as Record<string, unknown>)
        : first;

    return useSelector(firstInput, second);
  }

  return useGroupSelector;
}
