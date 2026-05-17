import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import { deepEqual } from 'fast-equals';
import * as z from 'zod/mini';

import { dotPathGet } from './helpers/dot-path';
import { createFormComponent } from './helpers/form-builder';
import { useIsomorphicLayoutEffect } from './helpers/use-isomorphic-layout-effect';
import type {
  ArrayElement,
  DeepPartial,
  ElementFocusOptions,
  FormChangeArrayOptions,
  FormChangeOptions,
  FormClassCallback,
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
  StateCallback,
  StateChangeListener,
  SubmitState,
  SubmittedData,
  ValidationResult,
} from './types/form-types';
import { useSelector } from './helpers/use-form-selector';
import {
  collectDescriptions,
  collectLengths,
  collectPatterns,
  collectRanges,
  collectRequired,
  getPath,
  getPathAsString,
  getPathNotation,
} from './helpers/schema-visitor';
import { useDeepMemo } from './helpers/use-deep-memo';
import { useManualErrorState } from './helpers/use-manual-error-state';
import {
  cleanEmpty,
  createImmutableData,
  createImmutableDescriptions,
  createImmutableDirty,
  createImmutableErrors,
  createImmutablePatterns,
  createImmutableRanges,
  createImmutableRequired,
  createImmutableTouched,
  createState,
  freezeObject,
  mutateArrayState,
} from './helpers/state-manager';
import { classNames } from './helpers/class-helper';
import { formatErrors } from './helpers/error-formatter';
import { debounce } from './helpers/debouncer';
import { useFormStateReducer } from './helpers/use-form-state-reducer';
import { createFormStore } from './helpers/form-store';
import { createUseListener } from './helpers/use-listener-builder';
import { createUseWatch } from './helpers/use-watch-builder';
import { IS_DEVELOPMENT } from './helpers/development-helper';

/**
 * Hook that manages form state.
 *
 * @example
 * const { formState, formStatus, formActions } = useFormState(schema, {
 *   initialData: {
 *     name: 'John',
 *     info: { age: 24 }
 *   }
 * })
 *
 * @typeParam T - type of the form data.
 * @param schema - Zod schema to validate the form data.
 * @param formOptions - Form initialization options.
 * @param formOptions.schema - Zod schema to validate the form data.
 * @param formOptions.initialData - An optional object with schema properties to set the initial data of the form.
 *                                  This object can be used for asynchronous form initialization, otherwise, specify
 *                                  the default data in the schema.
 * @param formOptions.initialTouched - An optional array of root level field names or state path expressions that
 *                                     will be marked as touched when the form is initialized.
 * @param formOptions.resetTouchedOnFormReset - Reset the "touch" field status after the form has been reset
 *                                              (default: `true`).
 * @param formOptions.validateBeforeSubmit - Validate the schema before submission on "change", "touch", "replace" or
 *                                           "setError"/"clearManualErrors" form actions (default: `true`);
 * @param formOptions.validateOnMount - Validate the schema after the form mounts with the initial values (default: `false`).
 * @param formOptions.validateOnChange - Validate the form, by default, after a `change` action. (default: `true`).
 * @param formOptions.validateOnTouch - Validate the form, by default, after a `touch` action (default: `true`).
 * @param formOptions.debounceCacheCapacity - Sets the capacity of the debounce callback cache used by the "change"
 *                                            function. (default: 50). A non-positive value means no debouncing of
 *                                            change callbacks is allowed.
 * @param formOptions.watch - Sets a value indicating whether the `useWatch` hook should be enabled (default: `false`).
 * @param formOptions.cssOptions - Form-level defaults for `formClasses`: `prefix`
 *                                 (default `"form-state"`, or `null` to skip prefix-based
 *                                 classes) and `classNames` (a `string` or a callback that
 *                                 receives `{ isError, isTouched, isRequired, mode }` and
 *                                 returns a clsx-compatible value). Per-call
 *                                 `formClasses(field, ...)` values fully replace the
 *                                 form-level defaults for the same key.
 * @param formOptions.inferredNameFormat - Sets the default format for the `inferName` function (default: "bracket").
 * @param formOptions.errorMessageSeparator - Sets the default error message separator when multiple errors occur for the
 *                                            same state property (default: "|").
 * @param formOptions.confirmDirtyStateNavigation - Confirm browser navigation when the form status is dirty
 *                                                  (default: `false`).
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
    validateOnTouch = true,
    debounceCacheCapacity = 50,
    inferredNameFormat = 'bracket',
    errorMessageSeparator = '|',
    confirmDirtyStateNavigation = false,
    initialData,
    initialTouched,
    watch,
    cssOptions,
  }: FormInitOptions<T> = formOptions ?? {};

  // The manual errors that are not a part of the schema.
  const manualErrorsState = useManualErrorState();

  const [store] = useState(() => (watch ? createFormStore() : null));

  const defaultData = useMemo(() => createState(schema), [schema]);

  const memoizedInitialData = useDeepMemo(() => initialData, [initialData]);

  const initializedData = useMemo(
    () => createState(schema, memoizedInitialData),
    [schema, memoizedInitialData]
  );

  // Stable reference for form-level `formClasses` defaults.
  const stableCssOptions = useDeepMemo(() => cssOptions ?? {}, [cssOptions]);

  // The processed initial state with default property values and optional errors during the
  // initial validation.
  const state = useMemo<FormMutableState<State>>(() => {
    const mergedData = initialData ? initializedData : defaultData;
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
      required: collectRequired(schema),
      ranges: { ...collectRanges(schema), ...collectLengths(schema) },
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
    initialData,
    initializedData,
    initialTouched,
    initialMode,
    validateOnMount,
    errorMessageSeparator,
  ]);

  // Tracks whether component is mounted.
  const isMountedRef = useRef(true);

  // Form element ref populated by the bundled <Form> component on mount.
  const formElementRef = useRef<HTMLFormElement | null>(null);

  // The queue of "change" callback refs.
  const changeCallbackRefs = useRef<StateCallback<State>[]>([]);

  const [changeListeners] = useState(() => new Set<StateChangeListener<State>>());
  const [listenerHook] = useState(() => createUseListener(changeListeners));
  const [watchHook] = useState(() => createUseWatch(store));

  // The debounce dispatch cache.
  const debounceCache = useRef(
    new Map<
      string,
      ((...args: []) => void) & {
        cancel: () => void;
        path: keyof State | FormStatePath<State>;
        value: unknown;
        touch: boolean;
        validate: boolean;
        callback: StateCallback<State> | null;
      }
    >()
  );

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
  useIsomorphicLayoutEffect(() => {
    formStateRef.current = formState;
  });

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
    formState.mode,
    formState.submitCount,
    formDirty,
    formTouched,
    isSubmitting,
    formValid,
    isSchemaValid,
  ]);

  // The memoized form state data.
  const formData = useMemo(() => createImmutableData(formState.data), [formState.data]);

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

  // The memoized "required" object of the form state.
  const required = useMemo(
    () => createImmutableRequired(formState.required, formState.data),
    [formState.required, formState.data]
  );

  const generateCallbackState = useCallback(
    () => ({
      data: formData,
      errors: formErrors,
      touched,
      dirty,
      required,
      ranges,
      patterns,
      descriptions,
    }),
    [formData, formErrors, touched, dirty, required, ranges, patterns, descriptions]
  );

  const generateListenerState = useCallback(() => {
    const data = createImmutableData(formStateRef.current.data);
    const errors = createImmutableErrors(
      formStateRef.current.errors,
      formStateRef.current.data,
      errorMessageSeparator
    );
    const submitCount = formStateRef.current.submitCount;
    const valid = Object.keys(formStateRef.current.errors).length === 0;

    return { data, errors, submitCount, valid };
  }, [errorMessageSeparator]);

  const initialDataChanged = useMemo(
    () => formState.initialData !== state.data && !deepEqual(formState.initialData, state.data),
    [formState.initialData, state.data]
  );

  // Dispatches initial data changes.
  useEffect(() => {
    if (!formState.replaced && formState.submitCount === 0 && initialDataChanged) {
      dispatch({ type: 'changeInitialData' });
    }
  }, [initialDataChanged, formState.replaced, formState.submitCount, dispatch]);

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

    if (changeListeners.size === 0) {
      return;
    }

    const { data, errors, submitCount, valid } = generateListenerState();

    for (const listener of changeListeners) {
      listener({
        type: 'change',
        data,
        errors,
        submitCount,
        valid,
      });
    }
  }, [formState.data, formState.changed, generateListenerState, changeListeners]);

  // Calls registered listeners on form submission.
  useEffect(() => {
    if (formState.submitCount === 0) {
      return;
    }

    const { data, errors, submitCount, valid } = generateListenerState();

    for (const listener of changeListeners) {
      listener({
        type: 'submit',
        formData: lastSubmittedFormData.current,
        data,
        errors,
        submitCount,
        valid,
      });
    }
  }, [formState.submitCount, generateListenerState, changeListeners]);

  // Confirm browser navigation during a dirty state.
  useEffect(() => {
    if (!confirmDirtyStateNavigation) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (formStatus.dirty) {
        event.preventDefault();
      }
    };

    globalThis.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      globalThis.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [confirmDirtyStateNavigation, formStatus.dirty]);

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
    (nameOrPath: FormPath<T>, classesOrOptions?: string | FormClassCallback | FormClassOptions) => {
      const path = typeof nameOrPath === 'function' ? getPath(formState.data, nameOrPath) : null;
      const pathNotation = path ? path.join('.') : (nameOrPath as string);
      const requiredPathNotation = path ? getPathNotation(path) : (nameOrPath as string);

      const perCall: FormClassOptions =
        typeof classesOrOptions === 'string' || typeof classesOrOptions === 'function'
          ? { classNames: classesOrOptions }
          : (classesOrOptions ?? {});

      const currentClassNames = perCall.classNames ?? stableCssOptions.classNames;
      const prefixSetting = perCall.prefix === undefined ? stableCssOptions.prefix : perCall.prefix;
      const prefix = prefixSetting === null ? null : prefixSetting?.trim() || 'form-state';

      const isRequired = Boolean(formState.required[requiredPathNotation]);
      const isTouched = Boolean(formState.touched[pathNotation]);
      const isError = Boolean(formState.validated && formState.errors[pathNotation]);
      const mode = formState.mode;

      let classes = '';

      if (prefix) {
        if (isRequired) {
          classes += `${prefix}__required `;
        }

        if (mode === 'disabled') {
          classes += `${prefix}__disabled `;
        } else if (mode === 'readOnly') {
          classes += `${prefix}__readonly `;

          if (isError) {
            classes += `${prefix}__error `;
          }
        } else {
          if (isTouched) {
            classes += `${prefix}__touched `;
          }
          if (isError) {
            classes += `${prefix}__error `;
          }
        }
      }

      if (currentClassNames !== undefined) {
        const value =
          typeof currentClassNames === 'function'
            ? currentClassNames({ isError, isTouched, isRequired, mode })
            : currentClassNames;
        const combinedClasses = classNames(value);

        if (combinedClasses) {
          classes += `${combinedClasses} `;
        }
      }

      return classes.trim();
    },
    [
      formState.data,
      formState.mode,
      formState.required,
      formState.touched,
      formState.validated,
      formState.errors,
      stableCssOptions,
    ]
  );

  // The memoized "change" function.
  const change = useCallback(
    <P extends FormPath<T>>(
      nameOrPath: P,
      value: FormPathValue<T, P>,
      options?: FormChangeOptions<T>
    ) => {
      const path: keyof State | FormStatePath<State> =
        typeof nameOrPath === 'function'
          ? getPath(formStateRef.current.data, nameOrPath)
          : (nameOrPath as keyof State);
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
          const isTouched = formStateRef.current.touched[pathNotation];

          if (!isTouched) {
            dispatch({
              type: 'touch',
              name: path,
              options: {
                validate: validateOnTouch && formStateRef.current.submitCount === 0,
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
    [debounceCacheCapacity, validateOnChange, validateOnTouch, dispatch]
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
        typeof nameOrPath === 'function'
          ? getPath(formStateRef.current.data, nameOrPath)
          : nameOrPath;

      if (!path) {
        const names = Object.keys(formStateRef.current.data) as (keyof State)[];

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
    [validateOnTouch, dispatch]
  );

  // Resolves the array at `nameOrPath`, applies `mutator`, and dispatches a "change" action.
  const mutateArray = useCallback(
    (
      nameOrPath: FormPath<T>,
      mutator: (draft: unknown[]) => void,
      options?: FormChangeArrayOptions<T>
    ) => {
      const { name, value } = mutateArrayState(
        schema,
        formStateRef.current.data,
        nameOrPath,
        mutator
      );

      dispatch({
        type: 'change',
        name,
        value,
        options: {
          touch: Boolean(options?.touch),
          validate: options?.validate ?? validateOnChange,
        },
      });
    },
    [schema, validateOnChange, dispatch]
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
      mutateArray(
        nameOrPath,
        (draft) => {
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
        | number
        | ((value: ArrayElement<FormPathValue<T, P>>, index: number) => boolean),
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

            if (value && !indexOrPredicate(value as ArrayElement<FormPathValue<T, P>>, readIndex)) {
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

  // The memoized "validate" function.
  const validate = useCallback(
    (
      onValidate?: FormValidateOptions<T> | (() => ValidationResult),
      options?: FormValidateOptions<T>
    ) => {
      if (typeof onValidate !== 'object') {
        const validationErrors = typeof onValidate === 'function' ? onValidate() : true;

        if (validationErrors !== true && Object.keys(validationErrors).length > 0) {
          for (const errorName in validationErrors) {
            if (Object.hasOwn(validationErrors, errorName)) {
              const error = validationErrors[errorName];

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

          dispatch({ type: 'validate' });
          return;
        }
      }

      const validationOptions = typeof onValidate === 'object' ? onValidate : options;

      if (typeof validationOptions?.callback === 'function') {
        changeCallbackRefs.current.push(validationOptions.callback);
      }

      if (validationOptions?.submit) {
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
              data: createImmutableData(formStateRef.current.data),
              formData: null,
            },
            options: {
              resetDirty: validationOptions.resetDirty !== false,
              resetTouched: validationOptions.resetTouched !== false,
              updateInitialData: validationOptions.updateInitialData !== false,
            },
          });
        }
      } else {
        dispatch({ type: 'validate' });
      }
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

        formStateRef.current.errors = submittedErrors;

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
            };

        startTransition(() => {
          setIsSubmitting(true);
        });

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
              formData: submittedFormData,
            });
          });
        }

        lastSubmittedFormData.current = submittedFormData;

        dispatch({
          type: 'submit',
          submittedData: {
            data: createImmutableData(currentState.data),
            formData: submittedFormData,
          },
          options: {
            resetDirty: options?.resetDirty !== false,
            resetTouched: options?.resetTouched !== false,
            updateInitialData: options?.updateInitialData !== false,
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
        name:
          typeof nameOrPath === 'function'
            ? getPath(formStateRef.current.data, nameOrPath)
            : nameOrPath,
        error: error ?? null,
        options: {
          validate: options?.validate ?? validateOnChange,
        },
      });
    },
    [validateOnChange, dispatch]
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
          ? getPathAsString(formStateRef.current.data, nameOrPath, format ?? inferredNameFormat)
          : nameOrPath;

      return String(pathNotation);
    },
    [inferredNameFormat]
  );

  // Resolves an element within the captured form scope, falling back to the first
  // form in the document if no form has been captured yet.
  const queryWithinForm = useCallback((selector: string) => {
    const form = formElementRef.current;
    if (form?.isConnected) {
      return form.querySelector<HTMLElement>(selector);
    }
    return document.querySelector<HTMLElement>(`form ${selector}`);
  }, []);

  // Blurs the actively focused element.
  const blur = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Sets focus on an element
  const focus = useCallback(
    (elementOrName: HTMLElement | string | null, options?: ElementFocusOptions<T>) => {
      const element =
        typeof elementOrName === 'string'
          ? queryWithinForm(`[name="${elementOrName.trim()}"]`)
          : elementOrName;

      if (!element) {
        return;
      }

      if (options?.errorKey) {
        const key =
          typeof options.errorKey === 'function'
            ? getPath(formStateRef.current.data, options.errorKey).join('.')
            : String(options.errorKey);

        if (!formStateRef.current.errors[key as keyof State]) {
          return;
        }
      }

      element.focus({
        focusVisible: options?.focusVisible !== false,
        preventScroll: options?.preventScroll === true,
      });

      if (options?.selectText && element instanceof HTMLInputElement) {
        element.select();
      }
    },
    [queryWithinForm]
  );

  // Focuses the first input or textarea in the form with the error CSS class.
  const focusOnFirstError = useCallback(
    (options?: Omit<ElementFocusOptions<T>, 'errorKey'>) => {
      const prefix =
        stableCssOptions.prefix === null ? null : stableCssOptions.prefix?.trim() || 'form-state';

      const doFocus = () => {
        let element: HTMLElement | null = null;

        if (prefix) {
          const errorClass = `${prefix}__error`;
          element = queryWithinForm(`input.${errorClass}, textarea.${errorClass}`);
        } else {
          const errors = formStateRef.current.errors;

          for (const key in errors) {
            if (key && errors[key as keyof State]) {
              const candidate = queryWithinForm(`input[name="${key}"], textarea[name="${key}"]`);

              if (candidate) {
                element = candidate;
                break;
              }
            }
          }
        }

        if (!element) {
          return;
        }

        element.focus({
          focusVisible: options?.focusVisible !== false,
          preventScroll: options?.preventScroll === true,
        });

        if (options?.selectText && element instanceof HTMLInputElement) {
          element.select();
        }
      };

      requestAnimationFrame(() => {
        doFocus();
      });
    },
    [stableCssOptions, queryWithinForm]
  );

  // The memoized Form component.
  const createComponent = useMemo(
    // The form element ref is not read during render.
    // eslint-disable-next-line react-hooks/refs
    () => createFormComponent<State>(store, dispatch, resetTouchedOnFormReset, formElementRef),
    [store, dispatch, resetTouchedOnFormReset]
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
        required,
        ranges,
        patterns,
        descriptions,
      },
      formStatus,
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
        blur,
        focus,
        focusOnFirstError,
        array: {
          append,
          insert,
          update,
          swap,
          remove,
          clear,
        },
      },
      formHandlers: {
        handleSubmit,
        handleReset,
      },
      formHooks: {
        useListener: listenerHook,
        useWatch: watchHook,
        useSelector,
      },
      formClasses,
      Form: createComponent,
    }),
    [
      initialFormState,
      formData,
      formErrors,
      dirty,
      touched,
      required,
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
      blur,
      focus,
      focusOnFirstError,
      append,
      insert,
      update,
      swap,
      remove,
      clear,
      handleSubmit,
      handleReset,
      createComponent,
      listenerHook,
      watchHook,
    ]
  );

  return response;
}
