import { createContext, use, type ComponentType, type Context, type ReactNode } from 'react';
import * as z from 'zod/v4';

import type { FormOptions, FormPath, FormStateResponse } from './form-types.d';

import { useFormState } from './use-form-state';

// Allows a separate context per schema that are garbage collected when the schema goes out of scope.
const schemaToContext = new WeakMap<z.ZodObject, Context<FormStateResponse<z.ZodObject> | null>>();

/**
 * Context provider to manage form state.
 *
 * @typeParam T type of the form data.
 * @param options.schema - Zod schema to validate the form data.
 * @param options.initialState - An optional object with schema properties to set the initial state of the form.
 *                               This object should be used for asynchronous form initialization, otherwise, specify
 *                               the initial state in the schema.
 * @param options.validateOnInit - Validate the schema with the initial values (default: false).
 * @param options.children - Optional child components.
 * @returns The form state provider.
 */
export function FormStateProvider<T extends z.ZodObject>({
  schema,
  initialState,
  initialTouched,
  validateOnInit,
  children,
}: Readonly<{
  schema: T;
  initialState?: Partial<z.output<T>>;
  initialTouched?: FormPath<T>[];
  validateOnInit?: boolean;
  children?: ReactNode;
}>) {
  const formOptions = {
    initialState,
    initialTouched,
    validateOnInit,
  } as FormOptions<T>;

  const form = useFormState(schema, formOptions);

  let context = schemaToContext.get(schema);

  if (!context) {
    context = createContext<FormStateResponse<T> | null>(null);
    schemaToContext.set(schema, context);
  }

  return <context.Provider value={form}>{children}</context.Provider>;
}

/**
 * Hook that manages form state inside React components that are, or have a parent component,
 * wrapped with the formConnect HOC.
 *
 * @typeParam T type of the form data.
 * @param schema - Zod schema to validate the form data.
 * @returns An object containing form state, status, actions, form HTML element props and state related CSS classes.
 */
export function useFormStateContext<T extends z.ZodObject>(schema: T) {
  if (!schema) {
    throw new TypeError('No valid schema was provided.');
  }

  const context = schemaToContext.get(schema);

  if (context) {
    // The `use` hook can be used conditionally.
    const usableContext = use(context as Context<FormStateResponse<T>>);

    if (usableContext) {
      return usableContext;
    }
  }

  throw new Error(
    'useFormStateContext must be used within a FormStateProvider with the provided schema.'
  );
}

/**
 * HOC that wraps a React component with the form state context provider and initializes the state
 * based on the provided schema.
 *
 * @param options.schema - Zod schema to validate the form data.
 * @param options.initialState - An optional object with schema properties to set the initial state of the form.
 *                               This object should be used for asynchronous form initialization, otherwise, specify
 *                               the initial state in the schema.
 * @param options.validateOnInit - Validate the schema with the initial values (default: false).
 *
 * @returns A curried function to wrap the component.
 */
export function formConnect<T extends z.ZodObject>(
  props: Readonly<{
    schema: T;
    initialState?: Partial<z.output<T>>;
    initialTouched?: FormPath<T>[];
    validateOnInit?: boolean;
  }>
) {
  /**
   * Wrap the provided React component.
   *
   * @typeparam P component props type.
   * @returns The wrapped component.
   */
  function wrapComponent<P>(Component: ComponentType<P>) {
    const ComponentWithFormState = (innerProps: Readonly<P>) => (
      <FormStateProvider {...props}>
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
