import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type * as z from 'zod/mini';

import type {
  AsyncCheckMetaMap,
  FormAction,
  FormMutableState,
  StateChangeListener,
} from '../types/form-types';
import { formatErrors } from './error-formatter';
import {
  collectActiveAsyncCheckPaths,
  commitActiveAsyncCheckPaths,
  runSubmitPhaseParse,
  setAsyncCheckPhase,
  withMetaMap,
} from './schema-visitor';
import { createImmutableData, createImmutableErrors, mergeAsyncErrors } from './state-manager';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

// Change-driven async validation bursts and their `asyncValidating` / `asyncValidated` listener
// events, plus the `validateAsync` form action.
export function useAsyncValidation<T extends z.ZodMiniObject>({
  schema,
  formState,
  formStateRef,
  dispatch,
  changeListeners,
  onListenerAddedRef,
  asyncMetaMap,
  errorMessageSeparator,
}: {
  schema: T;
  formState: FormMutableState<z.infer<T>>;
  formStateRef: RefObject<FormMutableState<z.infer<T>>>;
  dispatch: (action: FormAction<z.infer<T>>) => void;
  changeListeners: Set<StateChangeListener<z.infer<T>>>;
  onListenerAddedRef: RefObject<((listener: StateChangeListener<z.infer<T>>) => void) | null>;
  asyncMetaMap: AsyncCheckMetaMap;
  errorMessageSeparator: string;
}) {
  type State = z.infer<T>;

  // Generates asynchronous listener state.
  const snapshotAsyncListenerState = useCallback(() => {
    const current = formStateRef.current;
    return {
      data: createImmutableData(current.data),
      errors: createImmutableErrors<T>(current.errors, errorMessageSeparator),
      submitCount: current.submitCount,
      valid: Object.keys(current.errors).length === 0,
    };
  }, [formStateRef, errorMessageSeparator]);

  // Tracks whether a burst is currently in flight (between burst-start and finishBurst).
  const asyncBurstActiveRef = useRef(false);

  // Pending validating event refs.
  const pendingValidatingRef = useRef<{
    prevSnapshot: ReturnType<typeof snapshotAsyncListenerState>;
    activePaths: readonly string[];
    triggerField: string;
    deliveredTo: Set<StateChangeListener<State>>;
  } | null>(null);

  // Snapshot of the form state from before the change that started the current async burst.
  const prevAsyncSnapshotRef = useRef<ReturnType<typeof snapshotAsyncListenerState> | null>(null);

  // Tracks the in-flight burst started by the change-driven effect (not validateAsync): whether its
  // result arrived (finishScheduled), the state it was validated against (closingSnapshot) and the
  // frame that will close it (pendingFinish), which a newer validation flushes early.
  const effectBurstRef = useRef<{
    active: boolean;
    finishScheduled: boolean;
    closingSnapshot: ReturnType<typeof snapshotAsyncListenerState> | null;
    pendingFinish: { frame: number; flush: () => void } | null;
  }>({ active: false, finishScheduled: false, closingSnapshot: null, pendingFinish: null });

  // Seed the prev-snapshot at mount so the first change-driven burst has a pre-change ref.
  useIsomorphicLayoutEffect(() => {
    if (prevAsyncSnapshotRef.current === null) {
      prevAsyncSnapshotRef.current = snapshotAsyncListenerState();
    }
  }, []);

  // Delivers the current burst's `asyncValidating` event to listeners that
  // haven't yet received it.
  const drainPendingValidating = useCallback(
    (targetListener?: StateChangeListener<State>) => {
      const pending = pendingValidatingRef.current;
      if (!pending) {
        return;
      }

      const candidates = targetListener ? [targetListener] : changeListeners;
      const recipients: StateChangeListener<State>[] = [];

      for (const listener of candidates) {
        if (!pending.deliveredTo.has(listener)) {
          recipients.push(listener);
          pending.deliveredTo.add(listener);
        }
      }

      if (recipients.length === 0) {
        return;
      }

      const { prevSnapshot, activePaths, triggerField } = pending;
      const { data, errors, submitCount, valid } = prevSnapshot;

      for (const schemaPath of activePaths) {
        for (const listener of recipients) {
          listener({
            type: 'asyncValidating',
            data,
            errors,
            submitCount,
            valid,
            triggerField,
            schemaPath,
          });
        }
      }
    },
    [changeListeners]
  );

  // Dispatches async events.
  useEffect(() => {
    if (!formState.asyncValidating) {
      const effectBurst = effectBurstRef.current;

      // The burst's result was committed; remember the validated state for its closing event.
      if (effectBurst.active && effectBurst.finishScheduled && !effectBurst.closingSnapshot) {
        effectBurst.closingSnapshot = snapshotAsyncListenerState();
      }

      // A burst whose run was cancelled (reset, replace, a non-validating change...) never
      // reaches finishBurst; close it so the asyncValidating/asyncValidated pair stays balanced.
      if (effectBurst.active && !effectBurst.finishScheduled) {
        const pending = pendingValidatingRef.current;

        effectBurst.active = false;
        asyncBurstActiveRef.current = false;
        pendingValidatingRef.current = null;

        const snapshot = snapshotAsyncListenerState();
        prevAsyncSnapshotRef.current = snapshot;

        if (pending) {
          const { data, errors, submitCount, valid } = snapshot;

          for (const schemaPath of pending.activePaths) {
            for (const listener of pending.deliveredTo) {
              if (changeListeners.has(listener)) {
                listener({
                  type: 'asyncValidated',
                  data,
                  errors,
                  submitCount,
                  valid,
                  triggerField: pending.triggerField,
                  schemaPath,
                });
              }
            }
          }
        }
      }

      return;
    }

    // A previous burst finished but its closing frame has not run yet: close it now so this
    // validation starts its own burst.
    const pendingFinish = effectBurstRef.current.pendingFinish;

    if (pendingFinish) {
      cancelAnimationFrame(pendingFinish.frame);
      pendingFinish.flush();
    }

    const requestId = formState.asyncRequestId;
    const triggerField = formStateRef.current.asyncTrigger ?? '';

    setAsyncCheckPhase(schema, 'change', asyncMetaMap);

    const activePaths = collectActiveAsyncCheckPaths(
      schema,
      formState.data,
      'change',
      asyncMetaMap
    );

    commitActiveAsyncCheckPaths(schema, formState.data, 'change', asyncMetaMap);

    const cancelledRef = { current: false };

    if (!asyncBurstActiveRef.current) {
      asyncBurstActiveRef.current = true;
      effectBurstRef.current = {
        active: true,
        finishScheduled: false,
        closingSnapshot: null,
        pendingFinish: null,
      };

      if (activePaths.length > 0) {
        const prevSnapshot = prevAsyncSnapshotRef.current ?? snapshotAsyncListenerState();

        pendingValidatingRef.current = {
          prevSnapshot,
          activePaths,
          triggerField,
          deliveredTo: new Set(),
        };

        drainPendingValidating();
      }
    }

    // `flushed` closes the burst early because a newer validation has already started.
    const finishBurst = (resolvedTrigger: string | undefined, flushed: boolean) => {
      // Unreachable guard
      /* v8 ignore if -- @preserve */
      if (!flushed && requestId !== formStateRef.current.asyncRequestId) {
        return;
      }

      const snapshot = effectBurstRef.current.closingSnapshot ?? snapshotAsyncListenerState();

      asyncBurstActiveRef.current = false;
      effectBurstRef.current = {
        active: false,
        finishScheduled: false,
        closingSnapshot: null,
        pendingFinish: null,
      };

      drainPendingValidating();

      pendingValidatingRef.current = null;

      prevAsyncSnapshotRef.current = snapshot;

      if (activePaths.length === 0 || changeListeners.size === 0) {
        return;
      }

      const { data, errors, submitCount, valid } = snapshot;

      for (const schemaPath of activePaths) {
        for (const listener of changeListeners) {
          listener({
            type: 'asyncValidated',
            data,
            errors,
            submitCount,
            valid,
            triggerField: resolvedTrigger,
            schemaPath,
          });
        }
      }
    };

    const scheduleFinish = () => {
      const frame = requestAnimationFrame(() => {
        finishBurst(triggerField, false);
      });

      effectBurstRef.current.pendingFinish = {
        frame,
        flush: () => {
          finishBurst(triggerField, true);
        },
      };
    };

    void (async () => {
      try {
        const result = await withMetaMap(asyncMetaMap, () => schema.safeParseAsync(formState.data));

        if (cancelledRef.current) {
          return;
        }

        const asyncErrors = formatErrors<State>(result.error, errorMessageSeparator);

        effectBurstRef.current.finishScheduled = true;

        dispatch({
          type: 'asyncErrors',
          requestId,
          errors: asyncErrors,
          activePaths,
        });

        scheduleFinish();
      } catch (error: unknown) {
        // Unreachable guard
        /* v8 ignore if -- @preserve */
        if (cancelledRef.current) {
          return;
        }

        const message =
          error instanceof Error && error.message ? error.message : 'Async validation failed.';

        effectBurstRef.current.finishScheduled = true;

        dispatch({
          type: 'asyncErrors',
          requestId,
          errors: { '': message } as Record<keyof State | '', string | undefined>,
          activePaths,
        });

        scheduleFinish();
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [
    schema,
    formStateRef,
    formState.data,
    formState.asyncValidating,
    formState.asyncRequestId,
    errorMessageSeparator,
    dispatch,
    changeListeners,
    snapshotAsyncListenerState,
    drainPendingValidating,
    asyncMetaMap,
  ]);

  // Registers listener callbacks.
  useEffect(() => {
    onListenerAddedRef.current = drainPendingValidating;
    drainPendingValidating();
  });

  // Fires an `asyncValidating` / `asyncValidated` event.
  const fireAsyncListenerEvent = useCallback(
    (type: 'asyncValidating' | 'asyncValidated', paths: readonly string[]) => {
      if (changeListeners.size === 0 || paths.length === 0) {
        return;
      }
      const { data, errors, submitCount, valid } = snapshotAsyncListenerState();
      for (const schemaPath of paths) {
        for (const listener of changeListeners) {
          listener({
            type,
            data,
            errors,
            submitCount,
            valid,
            triggerField: undefined,
            schemaPath,
          });
        }
      }
    },
    [changeListeners, snapshotAsyncListenerState]
  );

  // The memoized "validateAsync" function.
  const validateAsync = useCallback(async (): Promise<boolean> => {
    const requestId = formStateRef.current.asyncRequestId;

    // Only fire `asyncValidating` if there isn't already an in-flight burst.
    const ownsBurst = !asyncBurstActiveRef.current;

    let activePaths: readonly string[] = [];
    let freshAsyncErrors: Record<keyof State | '', string | undefined>;

    try {
      const parsed = await runSubmitPhaseParse(
        schema,
        formStateRef.current.data,
        asyncMetaMap,
        (collected) => {
          activePaths = collected;
          if (ownsBurst) {
            asyncBurstActiveRef.current = true;
            fireAsyncListenerEvent('asyncValidating', collected);
          }
        }
      );
      activePaths = parsed.activePaths;
      freshAsyncErrors = formatErrors<State>(parsed.result.error, errorMessageSeparator);
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message ? error.message : 'Async validation failed.';
      freshAsyncErrors = { '': message } as Record<keyof State | '', string | undefined>;
    }

    const superseded = requestId !== formStateRef.current.asyncRequestId;

    const asyncErrors = mergeAsyncErrors(
      formStateRef.current.asyncErrors,
      freshAsyncErrors,
      activePaths
    );

    if (!superseded) {
      dispatch({
        type: 'asyncValidate',
        errors: asyncErrors,
        freshErrors: freshAsyncErrors,
      });
    }

    if (ownsBurst) {
      // eslint-disable-next-line require-atomic-updates -- `ownsBurst` was captured before the await; only this call site flips the ref back to false in this path.
      asyncBurstActiveRef.current = false;

      if (!superseded) {
        fireAsyncListenerEvent('asyncValidated', activePaths);
      }
    }

    const mergedErrors = { ...freshAsyncErrors, ...asyncErrors };

    return (
      !superseded &&
      Object.keys(mergedErrors).length === 0 &&
      Object.keys(formStateRef.current.manualErrors).length === 0
    );
  }, [schema, formStateRef, errorMessageSeparator, dispatch, fireAsyncListenerEvent, asyncMetaMap]);

  return { fireAsyncListenerEvent, validateAsync };
}
