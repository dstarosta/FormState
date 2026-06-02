import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { AsyncCheckMetaMap, FormMutableState } from '../../src/types/form-types';
import { z } from '../../src';
import { useFormStateReducer } from '../../src/helpers/use-form-state-reducer';

describe('useFormStateReducer', () => {
  const schema = z.object({ name: z.formString({ required: true }) });
  type State = z.infer<typeof schema>;

  const buildInitialState = (
    overrides: Partial<FormMutableState<State>> = {}
  ): FormMutableState<State> => ({
    initialData: { name: '' },
    data: { name: '' },
    submittedData: null,
    initialErrors: {} as Record<keyof State | '', string | undefined>,
    errors: {} as Record<keyof State | '', string | undefined>,
    mode: 'editable',
    dirty: { name: false },
    touched: { name: false },
    required: { name: true },
    ranges: {} as FormMutableState<State>['ranges'],
    patterns: {} as Record<keyof State, string | undefined>,
    descriptions: {} as Record<keyof State | '', string | undefined>,
    submitCount: 0,
    changed: false,
    replaced: false,
    validated: false,
    manualErrors: {},
    asyncErrors: {} as Record<keyof State | '', string | undefined>,
    asyncRequestId: 5,
    asyncValidating: true,
    asyncTrigger: undefined,
    ...overrides,
  });

  it('discards an asyncErrors action with a stale request id', () => {
    const initial = buildInitialState();

    const { result } = renderHook(() =>
      useFormStateReducer(schema, initial, true, false, '|', new Map() as AsyncCheckMetaMap)
    );

    const [stateBefore, dispatch] = result.current;

    act(() => {
      dispatch({
        type: 'asyncErrors',
        requestId: stateBefore.asyncRequestId - 1, // stale
        errors: { name: 'Stale error should be discarded' } as Record<
          keyof State | '',
          string | undefined
        >,
        activePaths: ['name'],
      });
    });

    const [stateAfter] = result.current;

    // Reducer must return the same state reference and leave validating/errors untouched.
    expect(stateAfter).toBe(stateBefore);
    expect(stateAfter.asyncValidating).toBe(true);
    expect(stateAfter.errors.name).toBeUndefined();
    expect(stateAfter.asyncErrors.name).toBeUndefined();
  });

  it('applies an asyncErrors action whose request id matches the current one', () => {
    const initial = buildInitialState();

    const { result } = renderHook(() =>
      useFormStateReducer(schema, initial, true, false, '|', new Map() as AsyncCheckMetaMap)
    );

    const [stateBefore, dispatch] = result.current;

    act(() => {
      dispatch({
        type: 'asyncErrors',
        requestId: stateBefore.asyncRequestId, // current
        errors: { name: 'Async failure' } as Record<keyof State | '', string | undefined>,
        activePaths: ['name'],
      });
    });

    const [stateAfter] = result.current;

    expect(stateAfter.asyncValidating).toBe(false);
    expect(stateAfter.errors.name).toBe('Async failure');
    expect(stateAfter.asyncErrors.name).toBe('Async failure');
  });
});
