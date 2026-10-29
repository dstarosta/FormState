import {
  createContext,
  use,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type Context,
  type PropsWithChildren,
} from 'react';
import * as z from 'zod/mini';

import type {
  FormProviderInitOptions,
  FormStateResponse,
  GroupData,
  GroupNames,
  GroupSchemaShape,
  Immutable,
} from './types/form-types';

import { deepEqual } from './helpers/deep-equal';
import { useIsomorphicLayoutEffect } from './helpers/use-isomorphic-layout-effect';
import { useFormState } from './use-form-state';

type AnyFormStateResponse = FormStateResponse<z.ZodMiniObject>;

// Holds the latest provider response for selector subscriptions (see useFormStateContext).
type ResponseStore = {
  get: () => AnyFormStateResponse;
  set: (response: AnyFormStateResponse) => void;
  subscribe: (listener: () => void) => () => void;
};

const createResponseStore = (initial: AnyFormStateResponse): ResponseStore => {
  let current = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => current,
    set(response) {
      if (response === current) {
        return;
      }

      current = response;

      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

type SchemaContexts = {
  // Changes with every form update; consumers re-render on each change.
  response: Context<AnyFormStateResponse | null>;
  // Stable per provider; selector consumers re-render only when their selection changes.
  store: Context<ResponseStore | null>;
};

// Allows a separate context per schema that are garbage collected when the schema goes out of scope.
const schemaToContexts = new WeakMap<z.ZodMiniObject, SchemaContexts>();

const noopSubscribe = () => () => {};

/**
 * Context provider to manage form state.
 *
 * @typeParam T - type of the form data.
 * @param props - Provider props.
 * @returns A form state provider.
 */
export function FormStateProvider<T extends z.ZodMiniObject>(
  props: Readonly<PropsWithChildren<FormProviderInitOptions<T>>>
) {
  const { schema, children, ...formOptions } = props;
  const form = useFormState(schema, formOptions) as unknown as AnyFormStateResponse;
  const [store] = useState(() => createResponseStore(form));

  useIsomorphicLayoutEffect(() => {
    store.set(form);
  }, [store, form]);

  let contexts = schemaToContexts.get(schema);

  if (!contexts) {
    contexts = {
      response: createContext<AnyFormStateResponse | null>(null),
      store: createContext<ResponseStore | null>(null),
    };
    schemaToContexts.set(schema, contexts);
  }

  return (
    <contexts.store.Provider value={store}>
      <contexts.response.Provider value={form}>{children}</contexts.response.Provider>
    </contexts.store.Provider>
  );
}

/**
 * Hook that manages form state inside React components that are, or have a parent component,
 * wrapped with the formConnect HOC.
 *
 * @example
 * const { formState, formStatus, formActions } = useFormStateContext(schema)
 *
 * @typeParam T - type of the form data.
 * @param schema - Zod schema to validate the form data.
 * @returns An object containing form state, status, actions, form HTML element props and state related CSS classes.
 */
export function useFormStateContext<T extends z.ZodMiniObject>(schema: T): FormStateResponse<T>;
/**
 * Hook that subscribes to a single group's data slice of the form state context. The component
 * re-renders only when that group's data changes.
 *
 * @example
 * const contact = useFormStateContext(schema, 'contact'); // { email, phone }
 *
 * @typeParam T - type of the form data.
 * @typeParam G - the group name.
 * @param schema - Zod schema to validate the form data.
 * @param groupName - A group name declared via `z.group(schema, name)`.
 * @returns An immutable object containing only that group's root-level data fields.
 */
export function useFormStateContext<
  T extends z.ZodMiniObject,
  G extends GroupNames<GroupSchemaShape<T>>,
>(schema: T, groupName: G): Immutable<GroupData<T, G>>;
/**
 * Hook that subscribes to a value selected from the form state context. The component re-renders
 * only when the selected value changes (compared deeply).
 *
 * @example
 * const city = useFormStateContext(schema, (form) => form.formState.data.city);
 * const { change } = useFormStateContext(schema, (form) => form.formActions); // never re-renders
 *
 * @typeParam T - type of the form data.
 * @typeParam R - the selected value type.
 * @param schema - Zod schema to validate the form data.
 * @param selector - Selects a value from the form state, status, actions, etc.
 * @returns The selected value.
 */
export function useFormStateContext<T extends z.ZodMiniObject, R>(
  schema: T,
  selector: (form: FormStateResponse<T>) => R
): R;
export function useFormStateContext<T extends z.ZodMiniObject>(
  schema: T,
  selection?: string | ((form: FormStateResponse<T>) => unknown)
) {
  const contexts = schemaToContexts.get(schema);

  // The `use` hook can be used conditionally.
  const store = contexts && selection !== undefined ? use(contexts.store) : null;

  const cacheRef = useRef<{ form: AnyFormStateResponse; selection: unknown; value: unknown }>(null);

  const subscribe = useCallback(
    (listener: () => void) => (store ? store.subscribe(listener) : noopSubscribe()),
    [store]
  );

  const getSnapshot = () => {
    if (!store || selection === undefined) {
      return;
    }

    const form = store.get();
    const cached = cacheRef.current;

    if (cached?.form === form && cached.selection === selection) {
      return cached.value;
    }

    const typedForm = form as unknown as FormStateResponse<T>;
    const value =
      typeof selection === 'string'
        ? typedForm.formState.getGroup(selection as GroupNames<GroupSchemaShape<T>>).data
        : selection(typedForm);

    // Keep the previous reference for deeply equal selections so the component does not re-render.
    const stableValue = cached && deepEqual(value, cached.value) ? cached.value : value;

    cacheRef.current = { form, selection, value: stableValue };

    return stableValue;
  };

  const selected = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (selection === undefined) {
    if (contexts) {
      const value = use(contexts.response);

      if (value) {
        return value as unknown as FormStateResponse<T>;
      }
    }
  } else if (store) {
    return selected;
  }

  throw new Error(
    'useFormStateContext must be used within a FormStateProvider with the provided schema.'
  );
}

/**
 * HOC that wraps a React component with the form state context provider and initializes the state
 * based on the provided schema.
 *
 * @example
 * function EditForm() {
 *   const { formState, formActions, Form } = useFormStateContext(schema);
 *
 *   return (
 *     <Form>
 *       <input
 *          type="text"
 *          name="name"
 *          defaultValue={formState.data.name}
 *          onChange={(event) => formActions.change('name', event.target.value, { touch: true })} />
 *     </Form>
 *   );
 * }
 *
 * export default formConnect({ schema: formSchema, watch: true })(EditForm);
 *
 * @param options - Form initialization options.
 * @param options.schema - Zod schema to validate the form data.
 * @param options.initialData - An optional object with schema properties to set the initial data of the form.
 *                              This object can be used for asynchronous form initialization, otherwise, specify
 *                              the default data in the schema.
 * @param options.initialTouched - An optional array of root level field names or state path expressions that
 *                               will be marked as touched when the form is initialized.
 * @param options.resetTouchedOnFormReset - Reset the "touch" field status after the form has been reset
 *                                          (default: `true`).
 * @param options.validateBeforeSubmit - Validate the schema before submission on "change", "touch", "replace" or
 *                                       "setError"/"clearManualErrors" form actions (default: `true`);
 * @param options.validateOnMount - Validate the schema after the form mounts with the initial values (default: `false`).
 * @param options.validateOnChange - Validate the form, by default, after a `change` action. (default: `true`).
 * @param options.validateOnTouch - Validate the form, by default, after a `touch` action (default: `true`).
 * @param options.debounceCacheCapacity - Sets the capacity of the debounce callback cache used by the "change"
 *                                        function. (default: 50). A non-positive value means no debouncing of
 *                                        change callbacks is allowed.
 * @param options.watch - Sets a value indicating whether the `useWatch` hook should be enabled (default: `false`).
 * @param options.inferredNameFormat - Sets the default format for the `inferName` function (default: "bracket").
 * @param options.errorMessageSeparator - Sets the default error message separator when multiple errors occur for the
 *                                        same state property (default: "|").
 * @param options.cssOptions - Form-level defaults for `formClasses`.
 *
 * @returns A curried function to wrap the component.
 */
export function formConnect<T extends z.ZodMiniObject>(options: FormProviderInitOptions<T>) {
  /**
   * Wrap the provided React component.
   *
   * @typeParam P - component props type.
   * @returns The wrapped component.
   */
  function wrapComponent<P>(Component: ComponentType<P>) {
    const ComponentWithFormState = (innerProps: Readonly<P>) => (
      <FormStateProvider {...options}>
        <Component {...innerProps} />
      </FormStateProvider>
    );

    ComponentWithFormState.displayName = `formConnected(${
      Component.displayName || Component.name
    })`;

    return ComponentWithFormState;
  }

  return wrapComponent;
}
