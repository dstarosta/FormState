import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import * as z from 'zod/mini';

import { deepEqual } from './helpers/deep-equal';
import { dotPathGet } from './helpers/dot-path';
import { createFormComponent } from './helpers/form-builder';
import { useIsomorphicLayoutEffect } from './helpers/use-isomorphic-layout-effect';
import type {
  AsyncCheckMetaMap,
  DeepPartial,
  FormChangeOptions,
  FormClassCallback,
  FormClassOptions,
  FormPath,
  FormClearErrorsOptions,
  FormInitOptions,
  FormMode,
  FormPathValue,
  FormReplaceOptions,
  FormResetOptions,
  FormSetErrorOptions,
  FormStatePath,
  FormStateResponse,
  FormStatus,
  FormTouchOptions,
  FormValidateOptions,
  StateCallback,
  StateChangeListener,
  SubmittedData,
  ValidationResult,
} from './types/form-types';
import {
  collectGroups,
  getPath,
  getPathAsString,
  getPathNotation,
  isAsyncSchema,
} from './helpers/schema-visitor';
import {
  createGroupBundle,
  createImmutableData,
  createImmutableDescriptions,
  createImmutableDirty,
  createImmutableErrors,
  createImmutablePatterns,
  createImmutableRanges,
  createImmutableRequired,
  createImmutableTouched,
  freezeObject,
} from './helpers/state-manager';
import { classNames } from './helpers/class-helper';
import { formatErrors, isSchemaValid, normalizeManualError } from './helpers/error-formatter';
import { debounce } from './helpers/debouncer';
import { useFormStateReducer } from './helpers/use-form-state-reducer';
import { useArrayActions } from './helpers/use-array-actions';
import { useDomActions } from './helpers/use-dom-actions';
import { useInitialFormState } from './helpers/use-initial-form-state';
import { useAsyncValidation } from './helpers/use-async-validation';
import { useFormSubmit } from './helpers/use-form-submit';
import { createFormStore } from './helpers/form-store';
import { createUseListener } from './helpers/use-listener-builder';
import { createUseWatch } from './helpers/use-watch-builder';
import { createUseBlocker } from './helpers/use-blocker-builder';
import { createUseSelector } from './helpers/use-selector-builder';

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
    initialData,
    initialTouched,
    watch,
    cssOptions,
  }: FormInitOptions<T> = formOptions ?? {};

  const [store] = useState(() => (watch ? createFormStore() : null));

  // The processed initial state.
  const state = useInitialFormState(schema, {
    initialData,
    initialTouched,
    initialMode,
    validateOnMount,
    errorMessageSeparator,
  });

  // Form-level `formClasses` defaults, kept as separate values so an inline `cssOptions` object
  // (or an inline `classNames` function) does not change the identity of prefix-only consumers.
  const cssPrefix = cssOptions?.prefix;
  const cssClassNames = cssOptions?.classNames;

  // Tracks whether component is mounted.
  const isMountedRef = useRef(true);

  // Form element ref populated by the bundled <Form> component on mount.
  const formElementRef = useRef<HTMLFormElement | null>(null);

  // The queue of "change" callback refs.
  const changeCallbackRefs = useRef<StateCallback<State>[]>([]);

  const [changeListeners] = useState(() => new Set<StateChangeListener<State>>());

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

  // Per-form storage for `validateAsync` closure state.
  const [asyncMetaMap] = useState<AsyncCheckMetaMap>(() => new Map());

  // The main form state reducer.
  const [formState, dispatch] = useFormStateReducer(
    schema,
    state,
    validateBeforeSubmit,
    validateOnMount,
    errorMessageSeparator,
    asyncMetaMap
  );

  // Ref to avoid stale closures in validate/handleSubmit callbacks.
  const formStateRef = useRef(formState);

  // Ref to avoid manual errors in the setError/clearManualErrors actions.
  const pendingManualErrorsRef = useRef<Record<string, string> | null>(null);

  useIsomorphicLayoutEffect(() => {
    formStateRef.current = formState;
    pendingManualErrorsRef.current = null;
  });

  // Ref to store the last submittedFormData.
  const lastSubmittedFormData = useRef<FormData | undefined>(undefined);

  // The pending state during the form submit action.
  const [isSubmitting, setIsSubmitting] = useOptimistic(false);
  const inFlightSubmitRef = useRef(false);

  // Dirty form state.
  const formDirty = useMemo(() => Object.values(formState.dirty).some(Boolean), [formState.dirty]);

  // Touched form state.
  const formTouched = useMemo(
    () => Object.values(formState.touched).some(Boolean),
    [formState.touched]
  );

  // Valid form state.
  const formValid = useMemo(() => {
    return !formState.validated || formState.asyncValidating
      ? null
      : Object.keys(formState.errors).length === 0;
  }, [formState.errors, formState.validated, formState.asyncValidating]);

  // Holds a callback the `useListener` hook calls when a new listener registers.
  const onListenerAddedRef = useRef<((listener: StateChangeListener<State>) => void) | null>(null);

  // Async validation bursts, their listener events and the "validateAsync" function.
  const { fireAsyncListenerEvent, validateAsync } = useAsyncValidation({
    schema,
    formState,
    formStateRef,
    dispatch,
    changeListeners,
    onListenerAddedRef,
    asyncMetaMap,
    errorMessageSeparator,
  });

  // The memoized "formStatus" object. The `validSchema` getter delegates to
  // `isSchemaValid` and computes lazily on access.
  const formStatus = useMemo<FormStatus>(
    () =>
      ({
        mode: formState.mode,
        readOnly: formState.mode === 'readOnly',
        disabled: formState.mode === 'disabled',
        dirty: formDirty,
        touched: formTouched,
        validating: formState.asyncValidating,
        submitting: isSubmitting,
        submitted: formState.submitCount > 0,
        valid: formValid,
        get validSchema() {
          // Expensive, computed only when accessed.
          return isSchemaValid(formState.validated, formState.errors, formState.manualErrors);
        },
      }) as const,
    [
      formState.mode,
      formState.submitCount,
      formState.validated,
      formState.errors,
      formState.manualErrors,
      formState.asyncValidating,
      formDirty,
      formTouched,
      isSubmitting,
      formValid,
    ]
  );

  // The memoized form state data.
  const formData = useMemo(() => createImmutableData(formState.data), [formState.data]);

  // The memoized "errors" object of the form state.
  const formErrors = useMemo(
    () => createImmutableErrors<T>(formState.errors, errorMessageSeparator),
    [formState.errors, errorMessageSeparator]
  );

  // The memoized "dirty" object of the form state.
  const dirty = useMemo(() => createImmutableDirty<T>(formState.dirty), [formState.dirty]);

  // The memoized "touched" object of the form state.
  const touched = useMemo(() => createImmutableTouched<T>(formState.touched), [formState.touched]);

  // The memoized "ranges" object of the form state.
  const ranges = useMemo(() => createImmutableRanges<T>(formState.ranges), [formState.ranges]);

  // The memoized "patterns" object of the form state.
  const patterns = useMemo(
    () => createImmutablePatterns<T>(formState.patterns),
    [formState.patterns]
  );

  // The memoized "descriptions" object of the form state.
  const descriptions = useMemo(
    () => createImmutableDescriptions<T>(formState.descriptions),
    [formState.descriptions]
  );

  // The memoized "required" object of the form state.
  const required = useMemo(
    () => createImmutableRequired<T>(formState.required),
    [formState.required]
  );

  // Group map.
  const groups = useMemo(() => collectGroups(schema), [schema]);

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

  // Notifies the listeners with the committed state, reusing the memoized immutable views. As an
  // effect event it reads the latest values without making the effects below re-run on them.
  const notifyListeners = useEffectEvent((type: 'change' | 'submit') => {
    const listenerState = {
      data: formData,
      errors: formErrors,
      submitCount: formState.submitCount,
      valid: Object.keys(formState.errors).length === 0,
    };

    for (const listener of changeListeners) {
      listener(
        type === 'submit'
          ? { type, formData: lastSubmittedFormData.current, ...listenerState }
          : { type, ...listenerState }
      );
    }
  });

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
    if (changeCallbackRefs.current.length <= 0) {
      return;
    }

    const callbacks = changeCallbackRefs.current;
    changeCallbackRefs.current = [];

    for (const callback of callbacks) {
      callback(generateCallbackState(), formStatus);
    }
  }, [formState, formStatus, generateCallbackState]);

  // Calls registered listeners on form change.
  useEffect(() => {
    if (formState.changed && changeListeners.size > 0) {
      notifyListeners('change');
    }
  }, [formState.data, formState.changed, changeListeners]);

  // Calls registered listeners on form submission.
  useEffect(() => {
    if (formState.submitCount > 0 && changeListeners.size > 0) {
      notifyListeners('submit');
    }
  }, [formState.submitCount, changeListeners]);

  // Cleanup on unmount.
  useEffect(() => {
    isMountedRef.current = true;

    const currentCache = debounceCache.current;

    return () => {
      isMountedRef.current = false;

      // Cancel all debounced callbacks.
      for (const debounced of currentCache.values()) {
        debounced.cancel();
      }
      currentCache.clear();
    };
  }, []);

  // Generates CSS form classes based on the form state.
  const formClasses = useCallback(
    (nameOrPath: FormPath<T>, classesOrOptions?: string | FormClassCallback | FormClassOptions) => {
      const path =
        typeof nameOrPath === 'function' ? getPath(formStateRef.current.data, nameOrPath) : null;
      const pathNotation = path ? path.join('.') : (nameOrPath as string);
      const requiredPathNotation = path ? getPathNotation(path) : (nameOrPath as string);

      const perCall: FormClassOptions =
        typeof classesOrOptions === 'string' || typeof classesOrOptions === 'function'
          ? { classNames: classesOrOptions }
          : (classesOrOptions ?? {});

      const currentClassNames = perCall.classNames ?? cssClassNames;
      const prefixSetting = perCall.prefix === undefined ? cssPrefix : perCall.prefix;
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
      formState.mode,
      formState.required,
      formState.touched,
      formState.validated,
      formState.errors,
      cssPrefix,
      cssClassNames,
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

          // The latest callback replaces the previous one, so its identity does not matter.
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
                  fromDebounce: true,
                });
              }

              debounceCache.current.delete(firstKey);
            }
          }

          const debouncedFn = debounce(() => {
            if (!isMountedRef.current) {
              return;
            }

            const currentEntry = debounceCache.current.get(pathNotation);

            // Unreachable guard: every path that removes the entry cancels this timer first.
            /* v8 ignore if -- @preserve */
            if (!currentEntry) {
              return;
            }

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
              fromDebounce: true,
            });

            debounceCache.current.delete(pathNotation);
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

      const validate = options?.validate ?? validateOnTouch;
      const pathNotation = Array.isArray(path) ? path.join('.') : String(path);
      const isTouched = formStateRef.current.touched[pathNotation] === true;
      const shouldValidate = validate && (validateBeforeSubmit || formStateRef.current.validated);

      if (isTouched && (!shouldValidate || formStateRef.current.validated)) {
        return;
      }

      dispatch({
        type: 'touch',
        name: path,
        options: { validate },
      });
    },
    [validateOnTouch, validateBeforeSubmit, dispatch]
  );

  // The "array" form actions.
  const { append, insert, update, swap, remove, clear } = useArrayActions(
    schema,
    formStateRef,
    dispatch,
    validateOnChange
  );

  // The memoized "validate" function.
  const validate = useCallback(
    (
      onValidate?: FormValidateOptions<T> | (() => ValidationResult),
      options?: FormValidateOptions<T>
    ) => {
      if (isAsyncSchema(schema)) {
        throw new Error(
          'validate() cannot be used with a schema that has async checks. Use validateAsync() instead.'
        );
      }

      const validationOptions = typeof onValidate === 'object' ? onValidate : options;

      // Registered first so it also runs when the validation function returns errors.
      if (typeof validationOptions?.callback === 'function') {
        changeCallbackRefs.current.push(validationOptions.callback);
      }

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

      if (validationOptions?.submit) {
        const safeData = schema.safeParse(formStateRef.current.data);
        const errors = formatErrors<State>(safeData.error, errorMessageSeparator);
        const submittedErrors = { ...errors, ...formStateRef.current.manualErrors };
        const hasErrors = Object.keys(submittedErrors).length > 0;

        if (hasErrors) {
          dispatch({ type: 'validate' });
        } else {
          lastSubmittedFormData.current = undefined;

          dispatch({
            type: 'submit',
            data: formStateRef.current.data,
            submittedData: {
              data: createImmutableData(formStateRef.current.data),
              formData: null,
            },
            asyncErrors: formStateRef.current.asyncErrors,
            freshErrors: errors,
            superseded: false,
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
    [schema, errorMessageSeparator, dispatch]
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
          data: options.data,
          options: {
            retainData: Boolean(options.retainData),
            resetTouched: Boolean(options.resetTouched),
          },
        });
      } else {
        dispatch({
          type: 'reset',
          data: options?.data,
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
  const handleSubmit = useFormSubmit({
    schema,
    formStateRef,
    dispatch,
    asyncMetaMap,
    errorMessageSeparator,
    fireAsyncListenerEvent,
    setIsSubmitting,
    inFlightSubmitRef,
    changeCallbackRefs,
    lastSubmittedFormData,
  });

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
      if (!key.trimStart().startsWith('#')) {
        throw new TypeError('A missing or invalid key was provided.');
      }

      const dirtyValue = isDirty !== false;

      if ((formStateRef.current.dirty[key] ?? false) === dirtyValue) {
        return;
      }

      dispatch({
        type: 'setDirty',
        name: key,
        dirty: dirtyValue,
      });
    },
    [dispatch]
  );

  const setMode = useCallback(
    (mode: FormMode) => {
      if (formStateRef.current.mode === mode) {
        return;
      }

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
      const name =
        typeof nameOrPath === 'function'
          ? getPath(formStateRef.current.data, nameOrPath)
          : nameOrPath;
      const pathNotation = Array.isArray(name) ? name.join('.') : name.trim();
      const nextError = normalizeManualError(error);
      const source = pendingManualErrorsRef.current ?? formStateRef.current.manualErrors;
      const currentError = source[pathNotation] ?? null;

      if (nextError === currentError) {
        return;
      }

      const pending = { ...source };
      if (nextError === null) {
        delete pending[pathNotation];
      } else {
        pending[pathNotation] = nextError;
      }
      pendingManualErrorsRef.current = pending;

      dispatch({
        type: 'setManualError',
        name,
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
      const source = pendingManualErrorsRef.current ?? formStateRef.current.manualErrors;
      const predicate = options?.predicate;

      const pending: Record<string, string> = {};

      if (typeof predicate === 'function') {
        let hasMatch = false;

        for (const [key, value] of Object.entries(source)) {
          if (predicate(key)) {
            hasMatch = true;
          } else {
            pending[key] = value;
          }
        }

        if (!hasMatch) {
          return;
        }
      } else if (Object.keys(source).length === 0) {
        return;
      }

      pendingManualErrorsRef.current = pending;

      dispatch({
        type: 'clearManualErrors',
        options: { predicate, validate: options?.validate ?? validateOnChange },
      });
    },
    [validateOnChange, dispatch]
  );

  // Returns the last submitted form data.
  // Changes identity on each submit on purpose, so it can be used as a memo dependency.
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

  // The DOM form actions.
  const { blur, focus, focusOnFirstError } = useDomActions<T>(
    formElementRef,
    formStateRef,
    cssPrefix
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

  const getGroup = useMemo(
    () =>
      createGroupBundle<T>(
        groups,
        {
          data: formState.data,
          errors: formState.errors,
          touched: formState.touched,
          dirty: formState.dirty,
          required: formState.required,
          ranges: formState.ranges,
          patterns: formState.patterns,
          descriptions: formState.descriptions,
        },
        errorMessageSeparator
      ),
    [
      groups,
      formState.data,
      formState.errors,
      formState.touched,
      formState.dirty,
      formState.required,
      formState.ranges,
      formState.patterns,
      formState.descriptions,
      errorMessageSeparator,
    ]
  );

  const formStateResponse = useMemo(
    () => ({
      data: formData,
      errors: formErrors,
      dirty,
      touched,
      required,
      ranges,
      patterns,
      descriptions,
      getGroup,
    }),
    [formData, formErrors, dirty, touched, required, ranges, patterns, descriptions, getGroup]
  ) as FormStateResponse<T>['formState'];

  // Blocker state ref.
  const blockerStateRef = useRef({ formState: formStateResponse, formStatus });

  // Blocker hook. Getters read the latest state and status through the ref above.
  // eslint-disable-next-line react-hooks/refs
  const [blockerHook] = useState(() =>
    createUseBlocker<State>(
      () => blockerStateRef.current.formState,
      () => blockerStateRef.current.formStatus
    )
  );

  // The closure reads `onListenerAddedRef.current` only when a listener is
  // added inside a "useEffect", never during render.
  // eslint-disable-next-line react-hooks/refs
  const [listenerHook] = useState(() =>
    createUseListener(changeListeners, (listener) => {
      onListenerAddedRef.current?.(listener);
    })
  );

  // Watch hook.
  const [watchHook] = useState(() => createUseWatch(store));

  // Selector hook.
  const selectorHook = useMemo(
    () => createUseSelector(groups) as FormStateResponse<T>['formHooks']['useSelector'],
    [groups]
  );

  // Keep the blocker getters' ref current with the latest state and status.
  useIsomorphicLayoutEffect(() => {
    blockerStateRef.current = { formState: formStateResponse, formStatus };
  });

  const formActions = useMemo(
    () => ({
      change,
      replace,
      touch,
      validate,
      validateAsync,
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
    }),
    [
      change,
      replace,
      touch,
      validate,
      validateAsync,
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
    ]
  );

  const formHandlers = useMemo(() => ({ handleSubmit, handleReset }), [handleSubmit, handleReset]);

  const formHooks = useMemo(
    () => ({
      useBlocker: blockerHook,
      useListener: listenerHook,
      useSelector: selectorHook,
      useWatch: watchHook,
    }),
    [blockerHook, watchHook, selectorHook, listenerHook]
  );

  const response = useMemo<FormStateResponse<T>>(
    () => ({
      initialState: initialFormState,
      formState: formStateResponse,
      formStatus,
      formActions,
      formHandlers,
      formHooks,
      formClasses,
      Form: createComponent,
    }),
    [
      initialFormState,
      formStateResponse,
      formStatus,
      formActions,
      formHandlers,
      formHooks,
      formClasses,
      createComponent,
    ]
  );

  return response;
}
