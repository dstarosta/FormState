import { useCallback, type RefObject } from 'react';
import type * as z from 'zod/mini';

import type {
  ArrayElement,
  FormAction,
  FormChangeArrayOptions,
  FormMutableState,
  FormPath,
  FormPathValue,
} from '../types/form-types';
import { IS_DEVELOPMENT } from './development-helper';
import { getArrayPath } from './state-manager';

// The `formActions.array` functions; each change is applied by the reducer to the latest state.
export function useArrayActions<T extends z.ZodMiniObject>(
  schema: T,
  formStateRef: RefObject<FormMutableState<z.infer<T>>>,
  dispatch: (action: FormAction<z.infer<T>>) => void,
  validateOnChange: boolean
) {
  // Resolves the array path (throwing for non-array schema types) and dispatches a "changeArray"
  // action; the reducer applies `mutator` to the latest state.
  const mutateArray = useCallback(
    (
      nameOrPath: FormPath<T>,
      mutator: (draft: unknown[]) => void,
      options?: FormChangeArrayOptions<T>
    ) => {
      dispatch({
        type: 'changeArray',
        name: getArrayPath(schema, formStateRef.current.data, nameOrPath),
        mutator,
        options: {
          touch: Boolean(options?.touch),
          validate: options?.validate ?? validateOnChange,
        },
      });
    },
    [schema, formStateRef, validateOnChange, dispatch]
  );

  const append = useCallback(
    <P extends FormPath<T>, I = FormPathValue<T, P>>(
      nameOrPath: P,
      items: ArrayElement<I>[] | ArrayElement<I>,
      options?: FormChangeArrayOptions<T>
    ) => {
      mutateArray(
        nameOrPath,
        (draft) => {
          if (Array.isArray(items)) {
            draft.push(...items);
          } else {
            draft.push(items);
          }
        },
        options
      );
    },
    [mutateArray]
  );

  const insert = useCallback(
    <P extends FormPath<T>, I = FormPathValue<T, P>>(
      nameOrPath: P,
      index: number,
      items: ArrayElement<I>[] | ArrayElement<I>,
      options?: FormChangeArrayOptions<T>
    ) => {
      mutateArray(
        nameOrPath,
        (draft) => {
          if (Array.isArray(items)) {
            draft.splice(index, 0, ...items);
          } else {
            draft.splice(index, 0, items);
          }
        },
        options
      );
    },
    [mutateArray]
  );

  const update = useCallback(
    <P extends FormPath<T>, I = FormPathValue<T, P>>(
      nameOrPath: P,
      index: number,
      item: ArrayElement<I>,
      options?: FormChangeArrayOptions<T>
    ) => {
      mutateArray(
        nameOrPath,
        (draft) => {
          draft.splice(index, 1, item);
        },
        options
      );
    },
    [mutateArray]
  );

  const swap = useCallback(
    (nameOrPath: FormPath<T>, from: number, to: number, options?: FormChangeArrayOptions<T>) => {
      if (from < 0 || to < 0) {
        throw new Error(`Index out of bounds: fromIndex=${String(from)}, toIndex=${String(to)}`);
      }

      mutateArray(
        nameOrPath,
        (draft) => {
          // The upper bound is only known when the reducer runs against the latest state.
          if (from >= draft.length || to >= draft.length) {
            if (IS_DEVELOPMENT) {
              console.warn(
                `[useFormState] swap() skipped: fromIndex=${String(from)}, toIndex=${String(to)}, array length=${String(draft.length)}.`
              );
            }

            return;
          }

          if (from !== to) {
            const temp = draft[from];
            draft[from] = draft[to];
            draft[to] = temp;
          }
        },
        options
      );
    },
    [mutateArray]
  );

  const remove = useCallback(
    <P extends FormPath<T>>(
      nameOrPath: P,
      indexOrPredicate:
        number | ((value: ArrayElement<FormPathValue<T, P>>, index: number) => boolean),
      options?: FormChangeArrayOptions<T>
    ) => {
      mutateArray(
        nameOrPath,
        (draft) => {
          if (typeof indexOrPredicate === 'number') {
            draft.splice(indexOrPredicate, 1);
            return;
          }

          let writeIndex = 0;

          for (let readIndex = 0; readIndex < draft.length; readIndex++) {
            const value = draft[readIndex];

            if (!indexOrPredicate(value as ArrayElement<FormPathValue<T, P>>, readIndex)) {
              draft[writeIndex] = value;
              writeIndex++;
            }
          }

          draft.length = writeIndex;
        },
        options
      );
    },
    [mutateArray]
  );

  const clear = useCallback(
    (nameOrPath: FormPath<T>, options?: FormChangeArrayOptions<T>) => {
      mutateArray(
        nameOrPath,
        (draft) => {
          draft.length = 0;
        },
        options
      );
    },
    [mutateArray]
  );

  return { append, insert, update, swap, remove, clear };
}
