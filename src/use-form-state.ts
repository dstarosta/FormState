import { useCallback, useEffect, useMemo, useOptimistic, useRef, type SyntheticEvent } from 'react';
import { deepEqual } from 'fast-equals';
import * as z from 'zod/mini';

import { dotPathGet } from './helpers/dot-path';
import { createFormComponent } from './helpers/form-builder';

import type {
  ArrayElement,
  StateChangeListener,
  DeepPartial,
  FormChangeArrayOptions,
  FormChangeOptions,
  FormClassOptions,
  FormPath,
  FormClearErrorsOptions,
  FormInitOptions,
  FormMode,
  FormMutableState,
  FormPathValue,
  FormReplaceOptions,
  FormResetOptions,
  FormSetErrorOptions,
  FormStatePath,
  FormStateResponse,
  FormStatus,
  FormSubmitHandler,
  FormSubmitOptions,
  FormTouchOptions,
  FormValidateOptions,
  ImmutableArray,
  StateCallback,
  SubmitState,
  SubmittedData,
  StripEmptyLiterals,
} from './types/form-types';

import {
  collectDescriptions,
  collectMaxLengths,
  collectPatterns,
  collectRanges,
  getPath,
  getPathAsString,
} from './helpers/schema-visitor';
import { useDeepMemo } from './helpers/use-deep-memo';
import { useManualErrorState } from './helpers/use-manual-error-state';
import {
  cleanEmpty,
  createImmutableData,
  createImmutableDescriptions,
  createImmutableDirty,
  createImmutableErrors,
  createImmutableMaxLengths,
  createImmutablePatterns,
  createImmutableRanges,
  createImmutableTouched,
  createState,
  freezeObject,
  getState,
  updateState,
} from './helpers/state-manager';
import { formatErrors } from './helpers/error-formatter';
import { debounce } from './helpers/debouncer';
import { useFormStateReducer } from './helpers/use-form-state-reducer';
import { createFormStore } from './helpers/form-store';
import { createUseListener } from './helpers/use-listener-builder';
import { createUseWatch } from './helpers/use-watch-builder';
import { IS_DEVELOPMENT } from './helpers/development-helper';

const NON_ARRAY_PATH_ERROR = 'The "nameOrPath" argument does not refer to an array type.';

/**
 * Hook that manages form state.
 *
 * @typeParam T - type of the form data.
 * @param schema - Zod schema to validate the form data.
 * @param formOptions - Form initialization options.
 * @returns An object containing form state, status, actions, form HTML element props and state related CSS classes.
 */
export function useFormState<T extends z.ZodMiniObject>(
  schema: T,
  formOptions?: FormInitOptions<T>
) {
  type State = z.infer<T>;

  // The initial hook parameters.
  const {
    initialMode = 'editable',
    resetTouchedOnFormReset = false,
    validateBeforeSubmit = true,
    validateOnMount = false,
    validateOnChange = true,
    validateOnTouch = false,
    debounceCacheCapacity = 50,
    CSSPrefix = 'form-state',
    inferredNameFormat = 'bracket',
    errorMessageSeparator = '|',
    initialState,
    initialTouched,
    watch,
  }: FormInitOptions<T> = formOptions ?? {};

  // The manual errors that are not a part of the schema.
  const manualErrorsState = useManualErrorState();

  // Form watch store.
  const storeRef = useRef(watch ? createFormStore() : null);

  const defaultData = useMemo(() => createState(schema), [schema]);
  const initialData = useDeepMemo(() => createState(schema, initialState), [schema, initialState]);

  // The processed initial state with default property values and optional errors during the
  // initial validation.
  const state = useMemo<FormMutableState<State>>(() => {
    const mergedData = initialState ? initialData : defaultData;
    const safeData = schema.safeParse(mergedData);

    const initialErrors = formatErrors<State>(safeData.error, errorMessageSeparator);
    const errors = validateOnMount
      ? initialErrors
      : ({} as Record<keyof State | '', string | undefined>);

    const dirty = {} as Record<keyof State, boolean>;
    const touched = {} as Record<keyof State, boolean>;

    for (const field in mergedData) {
      if (Object.prototype.hasOwnProperty.call(mergedData, field)) {
        dirty[field] = false;
        touched[field] = false;
      }
    }

    if (Array.isArray(initialTouched)) {
      for (const pathNotation of initialTouched) {
        const path =
          typeof pathNotation === 'function'
            ? getPath(mergedData, pathNotation).join('.')
            : String(pathNotation);

        touched[path as keyof State] = true;
      }
    }

    const data = safeData.data ?? mergedData;

    return {
      maxLengths: collectMaxLengths(schema),
      ranges: collectRanges(schema),
      patterns: collectPatterns(schema),
      descriptions: collectDescriptions(schema),
      initialData: data,
      submittedData: null,
      mode: initialMode,
      changed: false,
      replaced: false,
      validated: validateOnMount,
      submitCount: 0,
      data,
      initialErrors,
      errors,
      dirty,
      touched,
    } satisfies FormMutableState<State>;
  }, [
    schema,
    defaultData,
    initialState,
    initialData,
    initialTouched,
    initialMode,
    validateOnMount,
    errorMessageSeparator,
  ]);

  // Tracks whether component is mounted.
  const isMountedRef = useRef(true);

  // The queue of "change" callback refs.
  const changeCallbackRefs = useRef<StateCallback<State>[]>([]);

  // Change listeners.
  const changeListeners = useRef<Set<StateChangeListener<State>>>(new Set());

  // Form hooks refs.
  const listenerHookRef = useRef(createUseListener(changeListeners.current));
  const watchHookRef = useRef(createUseWatch(storeRef.current));

  // The debounce dispatch cache.
  const debounceCache = useRef<
    Map<
      string,
      ((...args: []) => void) & {
        cancel: () => void;
        path: keyof State | FormStatePath<State>;
        value: unknown;
        touch: boolean;
        validate: boolean;
        callback: StateCallback<State> | null;
      }
    >
  >(new Map());

  // The set to dedupe "useCallback" warnings on debounce.
  const debounceCallbackWarning = useRef(new Set<string>());

  // The main form state reducer.
  const [formState, dispatch] = useFormStateReducer(
    schema,
    state,
    manualErrorsState,
    validateBeforeSubmit,
    validateOnMount,
    errorMessageSeparator
  );

  // Ref to avoid stale closures in validate/handleSubmit callbacks.
  const formStateRef = useRef(formState);
  formStateRef.current = formState;

  // Ref to store the last submittedFormData.
  const lastSubmittedFormData = useRef<FormData | undefined>(undefined);

  // The pending state during the form submit action.
  const [isSubmitting, setIsSubmitting] = useOptimistic(false);

  // Dirty form state.
  const formDirty = useMemo(() => Object.values(formState.dirty).some(Boolean), [formState.dirty]);

  // Touched form state.
  const formTouched = useMemo(
    () => Object.values(formState.touched).some(Boolean),
    [formState.touched]
  );

  // Valid form state.
  const formValid = useMemo(
    () => (formState.validated ? Object.keys(formState.errors).length === 0 : null),
    [formState.errors, formState.validated]
  );

  // Determines whether the schema is valid (manual errors ignored).
  const isSchemaValid = useCallback(() => {
    if (!formState.validated) {
      return null;
    }

    const manualErrors = Object.entries(manualErrorsState.get());
    const allErrors = Object.entries(formState.errors);

    const allErrorsAreManual = allErrors.every((error) =>
      manualErrors.some((manual) => deepEqual(manual, error))
    );

    return allErrorsAreManual;
  }, [formState.errors, formState.validated, manualErrorsState]);

  // The memoized "formStatus" object.
  const formStatus = useMemo<FormStatus>(() => {
    let _validSchema: boolean | null = null;

    return {
      mode: formState.mode,
      readOnly: formState.mode === 'readOnly',
      disabled: formState.mode === 'disabled',
      dirty: formDirty,
      touched: formTouched,
      submitting: isSubmitting,
      submitted: formState.submitCount > 0,
      valid: formValid,
      get validSchema() {
        // Expensive, computed only when accessed.
        if (_validSchema === null) {
          _validSchema = isSchemaValid();
        }
        return _validSchema;
      },
    } as const;
  }, [
    formDirty,
    formTouched,
    isSubmitting,
    formState.submitCount,
    formState.mode,
    formValid,
    isSchemaValid,
  ]);

  // The memoized form state data.
  const formData = useMemo(
    () => createImmutableData(schema, formState.data),
    [schema, formState.data]
  );

  // The memoized "errors" object of the form state.
  const formErrors = useMemo(
    () => createImmutableErrors(formState.errors, formState.data, errorMessageSeparator),
    [formState.errors, formState.data, errorMessageSeparator]
  );

  // The memoized "dirty" object of the form state.
  const dirty = useMemo(() => createImmutableDirty(formState.dirty), [formState.dirty]);

  // The memoized "touched" object of the form state.
  const touched = useMemo(
    () => createImmutableTouched(formState.touched, formState.data),
    [formState.touched, formState.data]
  );

  // The memoized "maxLengths" object of the form state.
  const maxLengths = useMemo(
    () => createImmutableMaxLengths(formState.maxLengths, formState.data),
    [formState.maxLengths, formState.data]
  );

  // The memoized "ranges" object of the form state.
  const ranges = useMemo(
    () => createImmutableRanges(formState.ranges, formState.data),
    [formState.ranges, formState.data]
  );

  // The memoized "patterns" object of the form state.
  const patterns = useMemo(
    () => createImmutablePatterns(formState.patterns, formState.data),
    [formState.patterns, formState.data]
  );

  // The memoized "descriptions" object of the form state.
  const descriptions = useMemo(
    () => createImmutableDescriptions(formState.descriptions, formState.data),
    [formState.descriptions, formState.data]
  );

  const generateCallbackState = useCallback(
    () => ({
      data: formData,
      errors: formErrors,
      touched,
      dirty,
      maxLengths,
      ranges,
      patterns,
      descriptions,
    }),
    [formData, formErrors, touched, dirty, maxLengths, ranges, patterns, descriptions]
  );

  const generateListenerState = useCallback(() => {
    const data = createImmutableData(schema, formStateRef.current.data);

    const safeData = schema.safeParse(formStateRef.current.data);

    const dataErrors = formatErrors<State>(safeData.error, errorMessageSeparator);
    const errors = createImmutableErrors(
      dataErrors,
      formStateRef.current.data,
      errorMessageSeparator
    );

    return { data, errors };
  }, [errorMessageSeparator, schema]);

  const initialStateChanged = useMemo(
    () => !deepEqual(formState.initialData, state.data),
    [formState.initialData, state.data]
  );

  // Dispatches initial state changes.
  useEffect(() => {
    if (!formState.replaced && formState.submitCount === 0 && initialStateChanged) {
      dispatch({ type: 'changeInitialState' });
    }
  }, [initialStateChanged, formState.replaced, formState.submitCount, dispatch]);

  // Calls the change callbacks on the form status change.
  useEffect(() => {
    if (changeCallbackRefs.current.length > 0) {
      const callbacks = changeCallbackRefs.current;
      changeCallbackRefs.current = [];

      for (const callback of callbacks) {
        callback(generateCallbackState(), formStatus);
      }
    }
  }, [formState, formStatus, generateCallbackState]);

  // Calls registered listeners on form change.
  useEffect(() => {
    if (!formState.changed) {
      return;
    }

    if (changeListeners.current.size === 0) {
      return;
    }

    const { data, errors } = generateListenerState();

    for (const listener of changeListeners.current) {
      listener({ type: 'change', data, errors, submitCount: formStateRef.current.submitCount });
    }
  }, [schema, formState.data, formState.changed, generateListenerState]);

  // Calls registered listeners on form submission.
  useEffect(() => {
    if (formState.submitCount === 0) {
      return;
    }

    const { data, errors } = generateListenerState();

    for (const listener of changeListeners.current) {
      listener({
        type: 'submit',
        formData: lastSubmittedFormData.current,
        submitCount: formStateRef.current.submitCount,
        data,
        errors,
      });
    }
  }, [schema, formState.submitCount, generateListenerState]);

  // Cleanup on unmount.
  useEffect(() => {
    isMountedRef.current = true;

    const currentCache = debounceCache.current;

    return () => {
      isMountedRef.current = false;

      // Cancel all debounced callbacks.
      if (currentCache.size > 0) {
        for (const debounced of currentCache.values()) {
          debounced.cancel();
        }
        currentCache.clear();
      }
    };
  }, []);

  // Generates CSS form classes based on the form state.
  const formClasses = useCallback(
    (nameOrPath: FormPath<T>, additionalClasses?: string | null, options?: FormClassOptions) => {
      let classes = '';

      const pathNotation =
        typeof nameOrPath === 'function'
          ? getPath(formState.data, nameOrPath).join('.')
          : nameOrPath;

      const prefix = options?.prefix?.trim() || CSSPrefix;

      if (formState.mode === 'disabled') {
        classes += `${prefix}__disabled `;
      } else if (formState.mode === 'readOnly') {
        classes += `${prefix}__readonly `;
      } else {
        if (formState.touched[pathNotation]) {
          classes += `${prefix}__touched `;
        }
        if (formState.validated && formState.errors[pathNotation]) {
          classes += `${prefix}__error `;
        }
      }

      if (!additionalClasses?.length) {
        return classes.trim();
      }

      return (classes.trim() + ' ' + additionalClasses).trim();
    },
    [
      CSSPrefix,
      formState.data,
      formState.mode,
      formState.errors,
      formState.touched,
      formState.validated,
    ]
  );

  // The memoized "change" function.
  const change = useCallback(
    (nameOrPath: FormPath<T>, value: unknown, options?: FormChangeOptions<T>) => {
      const path =
        typeof nameOrPath === 'function' ? getPath(formState.data, nameOrPath) : nameOrPath;
      const pathNotation = Array.isArray(path) ? path.join('.') : String(path);

      const unchanged = dotPathGet(formStateRef.current.data, pathNotation) === value;

      const callback = options?.callback ?? null;
      const interval = options?.debounceIntervalMs ?? 0;
      const shouldDebounce = interval > 0 && debounceCacheCapacity > 0;

      if (unchanged) {
        if (shouldDebounce) {
          const entry = debounceCache.current.get(pathNotation);

          if (entry) {
            entry.cancel();
            debounceCache.current.delete(pathNotation);
          }
        }

        if (options?.touch) {
          const isTouched = formState.touched[pathNotation];

          if (!isTouched) {
            dispatch({
              type: 'touch',
              name: path,
              options: {
                validate: false,
              },
            });
          }
        }

        return;
      }

      if (shouldDebounce) {
        let entry = debounceCache.current.get(pathNotation);

        if (entry) {
          // Re-order the entry to the end of the map for LRU eviction.
          debounceCache.current.delete(pathNotation);
          debounceCache.current.set(pathNotation, entry);

          if (
            IS_DEVELOPMENT &&
            callback &&
            entry.callback &&
            entry.callback !== callback &&
            !debounceCallbackWarning.current.has(pathNotation)
          ) {
            console.warn(
              `[useFormState] The callback reference for debounced field "${pathNotation}" changed between calls. ` +
                'This usually means an inline function is getting passed. Consider wrapping it with useCallback().'
            );
            debounceCallbackWarning.current.add(pathNotation);
          }

          entry.path = path;
          entry.value = value;
          entry.touch = Boolean(options?.touch);
          entry.validate = options?.validate ?? validateOnChange;
          entry.callback = callback;
        } else {
          // Cache eviction logic.
          if (debounceCache.current.size >= debounceCacheCapacity) {
            const firstKey = debounceCache.current.keys().next().value;
            if (firstKey) {
              const oldEntry = debounceCache.current.get(firstKey);

              if (oldEntry) {
                oldEntry.cancel();

                if (typeof oldEntry.callback === 'function') {
                  changeCallbackRefs.current.push(oldEntry.callback);
                }

                dispatch({
                  type: 'change',
                  name: oldEntry.path,
                  value: oldEntry.value,
                  options: {
                    touch: oldEntry.touch,
                    validate: oldEntry.validate,
                  },
                });
              }

              debounceCache.current.delete(firstKey);
            }
          }

          const debouncedFn = debounce(() => {
            if (isMountedRef.current) {
              const currentEntry = debounceCache.current.get(pathNotation);

              if (currentEntry) {
                if (typeof currentEntry.callback === 'function') {
                  changeCallbackRefs.current.push(currentEntry.callback);
                }

                dispatch({
                  type: 'change',
                  name: currentEntry.path,
                  value: currentEntry.value,
                  options: {
                    touch: currentEntry.touch,
                    validate: currentEntry.validate,
                  },
                });

                debounceCache.current.delete(pathNotation);
              }
            }
          }, interval);

          entry = Object.assign(debouncedFn, {
            path,
            value,
            touch: Boolean(options?.touch),
            validate: options?.validate ?? validateOnChange,
            callback,
          });

          debounceCache.current.set(pathNotation, entry);
        }

        entry();
      } else {
        const entry = debounceCache.current.get(pathNotation);

        if (entry) {
          entry.cancel();
          debounceCache.current.delete(pathNotation);
        }

        if (typeof callback === 'function') {
          changeCallbackRefs.current.push(callback);
        }

        dispatch({
          type: 'change',
          name: path,
          value,
          options: {
            touch: Boolean(options?.touch),
            validate: options?.validate ?? validateOnChange,
          },
        });
      }
    },
    [formState.data, formState.touched, debounceCacheCapacity, validateOnChange, dispatch]
  );

  // The memoized "replace" function.
  const replace = useCallback(
    (data: DeepPartial<State>, options?: FormReplaceOptions) => {
      dispatch({
        type: 'replace',
        data,
        options: {
          validate: Boolean(options?.validate),
        },
      });
    },
    [dispatch]
  );

  // The memoized "touch" function.
  const touch = useCallback(
    (nameOrPath?: FormPath<T>, options?: FormTouchOptions) => {
      let path =
        typeof nameOrPath === 'function' ? getPath(formState.data, nameOrPath) : nameOrPath;

      if (!path) {
        const names = Object.keys(formState.data) as (keyof State)[];

        if (names[0] === undefined) {
          return;
        }

        path = names[0];
      }

      dispatch({
        type: 'touch',
        name: path,
        options: {
          validate: options?.validate ?? validateOnTouch,
        },
      });
    },
    [validateOnTouch, formState.data, dispatch]
  );

  const append = useCallback(
    <P extends FormPath<T>, I = FormPathValue<T, P>>(
      nameOrPath: P,
      items: ArrayElement<I>[] | ArrayElement<I>,
      options?: FormChangeArrayOptions<T>
    ) => {
      const path =
        typeof nameOrPath === 'function'
          ? getPath(formStateRef.current.data, nameOrPath)
          : (nameOrPath as keyof State);
      const pathState = getState(schema, formStateRef.current.data, nameOrPath);

      if (!Array.isArray(pathState)) {
        throw new TypeError(NON_ARRAY_PATH_ERROR);
      }

      const updatedState = updateState(pathState as ImmutableArray<ArrayElement<I>>, (draft) => {
        if (Array.isArray(items)) {
          draft.push(...items);
        } else {
          draft.push(items);
        }
      });

      dispatch({
        type: 'change',
        name: path,
        value: updatedState,
        options: {
          touch: Boolean(options?.touch),
          validate: options?.validate ?? validateOnChange,
        },
      });
    },
    [schema, validateOnChange, dispatch]
  );

  const insert = useCallback(
    <P extends FormPath<T>, I = FormPathValue<T, P>>(
      nameOrPath: P,
      index: number,
      items: ArrayElement<I>[] | ArrayElement<I>,
      options?: FormChangeArrayOptions<T>
    ) => {
      const path =
        typeof nameOrPath === 'function'
          ? getPath(formStateRef.current.data, nameOrPath)
          : (nameOrPath as keyof State);
      const pathState = getState(schema, formStateRef.current.data, nameOrPath);

      if (!Array.isArray(pathState)) {
        throw new TypeError(NON_ARRAY_PATH_ERROR);
      }

      const updatedState = updateState(pathState as ImmutableArray<ArrayElement<I>>, (draft) => {
        if (Array.isArray(items)) {
          draft.splice(index, 0, ...items);
        } else {
          draft.splice(index, 0, items);
        }
      });

      dispatch({
        type: 'change',
        name: path,
        value: updatedState,
        options: {
          touch: Boolean(options?.touch),
          validate: options?.validate ?? validateOnChange,
        },
      });
    },
    [schema, validateOnChange, dispatch]
  );

  const update = useCallback(
    <P extends FormPath<T>, I = FormPathValue<T, P>>(
      nameOrPath: P,
      index: number,
      item: ArrayElement<I>,
      options?: FormChangeArrayOptions<T>
    ) => {
      const path =
        typeof nameOrPath === 'function'
          ? getPath(formStateRef.current.data, nameOrPath)
          : (nameOrPath as keyof State);
      const pathState = getState(schema, formStateRef.current.data, nameOrPath);

      if (!Array.isArray(pathState)) {
        throw new TypeError(NON_ARRAY_PATH_ERROR);
      }

      const updatedState = updateState(pathState as ImmutableArray<ArrayElement<I>>, (draft) => {
        draft.splice(index, 1, item);
      });

      dispatch({
        type: 'change',
        name: path,
        value: updatedState,
        options: {
          touch: Boolean(options?.touch),
          validate: options?.validate ?? validateOnChange,
        },
      });
    },
    [schema, validateOnChange, dispatch]
  );

  const swap = useCallback(
    (nameOrPath: FormPath<T>, from: number, to: number, options?: FormChangeArrayOptions<T>) => {
      const path =
        typeof nameOrPath === 'function'
          ? getPath(formStateRef.current.data, nameOrPath)
          : (nameOrPath as keyof State);
      const pathState = getState(schema, formStateRef.current.data, nameOrPath);

      if (!Array.isArray(pathState)) {
        throw new TypeError(NON_ARRAY_PATH_ERROR);
      }

      const updatedState = updateState(pathState as unknown[], (draft) => {
        if (from < 0 || to < 0 || from >= draft.length || to >= draft.length) {
          throw new Error(
            `Index out of bounds: fromIndex=${String(from)}, toIndex=${String(to)}, array length=${String(draft.length)}`
          );
        }

        if (from !== to) {
          const temp = draft[from];
          draft[from] = draft[to];
          draft[to] = temp;
        }
      });

      dispatch({
        type: 'change',
        name: path,
        value: updatedState,
        options: {
          touch: Boolean(options?.touch),
          validate: options?.validate ?? validateOnChange,
        },
      });
    },
    [schema, validateOnChange, dispatch]
  );

  const sort = useCallback(
    <P extends FormPath<T>, I = FormPathValue<T, P>>(
      nameOrPath: P,
      sortFn: (item1: ArrayElement<I>, item2: ArrayElement<I>) => number,
      options?: FormChangeArrayOptions<T>
    ) => {
      const pathState = getState(schema, formStateRef.current.data, nameOrPath);

      if (!Array.isArray(pathState)) {
        throw new TypeError(NON_ARRAY_PATH_ERROR);
      }

      const updatedState = updateState(pathState as ImmutableArray<ArrayElement<I>>, (draft) => {
        draft.sort(sortFn);
      });

      change(nameOrPath, updatedState, options);
    },
    [schema, change]
  );

  const remove = useCallback(
    <P extends FormPath<T>>(
      nameOrPath: P,
      indexOrPredicate:
        | number
        | ((value: ArrayElement<FormPathValue<T, P>>, index: number) => boolean),
      options?: FormChangeArrayOptions<T>
    ) => {
      const path =
        typeof nameOrPath === 'function'
          ? getPath(formStateRef.current.data, nameOrPath)
          : (nameOrPath as keyof State);
      const pathState = getState(schema, formStateRef.current.data, nameOrPath);

      if (!Array.isArray(pathState)) {
        throw new TypeError(NON_ARRAY_PATH_ERROR);
      }

      const updatedState = updateState(
        pathState as ImmutableArray<ArrayElement<FormPathValue<T, P>>>,
        (draft) => {
          if (typeof indexOrPredicate === 'number') {
            draft.splice(indexOrPredicate, 1);
            return;
          }

          let writeIndex = 0;

          for (let readIndex = 0; readIndex < draft.length; readIndex++) {
            const value = draft[readIndex];

            if (value && !indexOrPredicate(value, readIndex)) {
              draft[writeIndex] = value;
              writeIndex++;
            }
          }

          draft.length = writeIndex;
        }
      );

      dispatch({
        type: 'change',
        name: path,
        value: updatedState,
        options: {
          touch: Boolean(options?.touch),
          validate: options?.validate ?? validateOnChange,
        },
      });
    },
    [schema, validateOnChange, dispatch]
  );

  const clear = useCallback(
    (nameOrPath: FormPath<T>, options?: FormChangeArrayOptions<T>) => {
      const path =
        typeof nameOrPath === 'function'
          ? getPath(formStateRef.current.data, nameOrPath)
          : (nameOrPath as keyof State);
      const pathState = getState(schema, formStateRef.current.data, nameOrPath);

      if (!Array.isArray(pathState)) {
        throw new TypeError(NON_ARRAY_PATH_ERROR);
      }

      const updatedState = updateState(pathState as unknown[], (draft) => {
        draft.length = 0;
      });

      dispatch({
        type: 'change',
        name: path,
        value: updatedState,
        options: {
          touch: Boolean(options?.touch),
          validate: options?.validate ?? validateOnChange,
        },
      });
    },
    [schema, validateOnChange, dispatch]
  );

  // The memoized "validate" function.
  const validate = useCallback(
    (options?: FormValidateOptions<T>) => {
      if (typeof options?.callback === 'function') {
        changeCallbackRefs.current.push(options.callback);
      }

      if (options?.submit) {
        const safeData = schema.safeParse(formStateRef.current.data);
        const errors = formatErrors<State>(safeData.error, errorMessageSeparator);
        const submittedErrors = { ...errors, ...manualErrorsState.get() };
        const hasErrors = Object.keys(submittedErrors).length > 0;

        if (hasErrors) {
          dispatch({ type: 'validate' });
        } else {
          lastSubmittedFormData.current = undefined;

          dispatch({
            type: 'submit',
            submittedData: {
              data: createImmutableData(schema, formStateRef.current.data),
              formData: null,
            },
            options: {
              resetDirty: options.resetDirty !== false,
              resetTouched: options.resetTouched !== false,
            },
          });
        }
      } else {
        dispatch({ type: 'validate' });
      }

      return true;
    },
    [schema, errorMessageSeparator, manualErrorsState, dispatch]
  );

  // The memoized "handleReset" function.
  const handleReset = useCallback(
    (_event?: SyntheticEvent<HTMLFormElement> | null, options?: FormResetOptions<T>) => {
      if (typeof options?.callback === 'function') {
        changeCallbackRefs.current.push(options.callback);
      }

      if (Array.isArray(options?.names) && options.names.length > 0) {
        dispatch({
          type: 'resetFields',
          names: options.names,
          options: {
            retainData: Boolean(options.retainData),
            resetTouched: Boolean(options.resetTouched),
          },
        });
      } else {
        dispatch({
          type: 'reset',
          options: {
            retainData: Boolean(options?.retainData),
            resetTouched: Boolean(options?.resetTouched),
          },
        });
      }
    },
    [dispatch]
  );

  // The memoized "handleSubmit" function.
  const handleSubmit = useCallback(
    (onSubmit: FormSubmitHandler<T>, options?: FormSubmitOptions<T>) => {
      return async (submittedFormData: FormData) => {
        const currentState = formStateRef.current;

        const safeData = schema.safeParse(currentState.data);
        const errors = formatErrors<State>(safeData.error, errorMessageSeparator);
        const submittedErrors = { ...errors, ...manualErrorsState.get() };
        const hasErrors = Object.keys(submittedErrors).length > 0;

        const submitState: SubmitState<State> = hasErrors
          ? {
              valid: false,
              errors: createImmutableErrors(
                submittedErrors,
                currentState.data,
                errorMessageSeparator
              ),
            }
          : {
              valid: true,
              data: cleanEmpty(schema, currentState.data) as State,
              dataAsObject: cleanEmpty(schema, currentState.data) as StripEmptyLiterals<State>,
            };

        setIsSubmitting(true);

        const submissionErrors = await onSubmit(submitState, submittedFormData);

        if (hasErrors || (submissionErrors !== true && Object.keys(submissionErrors).length > 0)) {
          if (typeof options?.onError === 'function') {
            changeCallbackRefs.current.push(options.onError);
          }

          if (typeof submissionErrors === 'object') {
            for (const errorName in submissionErrors) {
              if (Object.hasOwn(submissionErrors, errorName)) {
                const error = submissionErrors[errorName];

                if (error) {
                  dispatch({
                    type: 'setManualError',
                    name: errorName,
                    options: { validate: true },
                    error,
                  });
                }
              }
            }
          }

          dispatch({ type: 'validate' });
          return;
        }

        if (typeof options?.onSuccess === 'function') {
          changeCallbackRefs.current.push((submittedState) => {
            options.onSuccess?.({
              data: cleanEmpty(schema, submittedState.data) as State,
              dataAsObject: cleanEmpty(schema, submittedState.data) as StripEmptyLiterals<State>,
              formData: submittedFormData,
            });
          });
        }

        lastSubmittedFormData.current = submittedFormData;

        dispatch({
          type: 'submit',
          submittedData: {
            data: createImmutableData(schema, currentState.data),
            formData: submittedFormData,
          },
          options: {
            resetDirty: options?.resetDirty !== false,
            resetTouched: options?.resetTouched !== false,
          },
        });
      };
    },
    [schema, errorMessageSeparator, manualErrorsState, setIsSubmitting, dispatch]
  );

  // The memoized "reset" function.
  const reset = useCallback(
    (options?: FormResetOptions<T>) => {
      handleReset(null, options);
    },
    [handleReset]
  );

  // The memoized "setDirty" function.
  const setDirty = useCallback(
    (key: string, isDirty?: boolean) => {
      if (!key.trim().startsWith('#')) {
        throw new TypeError('A missing or invalid key was provided.');
      }

      dispatch({
        type: 'setDirty',
        name: key,
        dirty: isDirty !== false,
      });
    },
    [dispatch]
  );

  const setMode = useCallback(
    (mode: FormMode) => {
      dispatch({ type: 'setMode', mode });
    },
    [dispatch]
  );

  // The memoized "setError" function.
  const setError = useCallback(
    (
      nameOrPath: string | ((data: State) => unknown),
      error?: string | null,
      options?: FormSetErrorOptions
    ) => {
      dispatch({
        type: 'setManualError',
        name: typeof nameOrPath === 'function' ? getPath(formState.data, nameOrPath) : nameOrPath,
        error: error ?? null,
        options: {
          validate: options?.validate ?? validateOnChange,
        },
      });
    },
    [validateOnChange, formState.data, dispatch]
  );

  // The memoized "clearManualErrors" function.
  const clearManualErrors = useCallback(
    (options?: FormClearErrorsOptions) => {
      dispatch({
        type: 'clearManualErrors',
        options: { predicate: options?.predicate, validate: options?.validate ?? validateOnChange },
      });
    },
    [validateOnChange, dispatch]
  );

  // Returns the last submitted form data.
  const getSubmittedData = useCallback(
    () =>
      formState.submittedData
        ? ({
            data: formState.submittedData.data,
            formData: formState.submittedData.formData,
          } satisfies SubmittedData<State>)
        : null,
    [formState.submittedData]
  );

  // Infers the name of the form field.
  const inferName = useCallback(
    (nameOrPath: FormPath<T>, format?: 'bracket' | 'dot') => {
      const pathNotation =
        typeof nameOrPath === 'function'
          ? getPathAsString(formState.data, nameOrPath, format ?? inferredNameFormat)
          : nameOrPath;

      return String(pathNotation);
    },
    [formState.data, inferredNameFormat]
  );

  // The memoized Form component.
  const createComponent = useMemo(
    () => createFormComponent<State>(storeRef.current, dispatch, resetTouchedOnFormReset),
    [dispatch, resetTouchedOnFormReset]
  );

  const initialFormState = useMemo(
    () => ({
      data: freezeObject(formState.initialData),
      errors: freezeObject(formState.initialErrors),
    }),
    [formState.initialData, formState.initialErrors]
  );

  const response = useMemo<FormStateResponse<T>>(
    () => ({
      initialState: initialFormState,
      formState: {
        data: formData,
        errors: formErrors,
        dirty,
        touched,
        maxLengths,
        ranges,
        patterns,
        descriptions,
      },
      formStatus,
      formClasses,
      formActions: {
        change,
        replace,
        touch,
        validate,
        reset,
        setDirty,
        setMode,
        setError,
        clearManualErrors,
        getSubmittedData,
        inferName,
        array: {
          append,
          insert,
          update,
          swap,
          sort,
          remove,
          clear,
        },
      },
      formHandlers: {
        handleSubmit,
        handleReset,
      },
      Form: createComponent,
      useListener: listenerHookRef.current,
      useWatch: watchHookRef.current,
    }),
    [
      initialFormState,
      formData,
      formErrors,
      dirty,
      touched,
      maxLengths,
      ranges,
      patterns,
      descriptions,
      formStatus,
      formClasses,
      change,
      replace,
      touch,
      validate,
      reset,
      setDirty,
      setMode,
      setError,
      clearManualErrors,
      getSubmittedData,
      inferName,
      append,
      insert,
      update,
      swap,
      sort,
      remove,
      clear,
      handleSubmit,
      handleReset,
      createComponent,
    ]
  );

  return response;
}
