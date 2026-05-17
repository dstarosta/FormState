import { useCallback, useMemo, useRef } from 'react';

import type { FormAction, FormProps, FormStore } from '../types/form-types';
import { FormResetBlocker } from './form-reset-blocker';
import { mergeRefs } from './ref-merge';

const elementValues = new WeakMap<HTMLInputElement, string>();

// Private functions

const getDefaultElementValue = (
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
) => {
  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    return element.defaultChecked ? element.defaultValue || 'on' : '';
  }

  if ('defaultValue' in element) {
    return element.defaultValue;
  }

  return '';
};

const getElementValue = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    return element.checked ? element.value || 'on' : '';
  }

  return element.value;
};

const reformatName = (key: string, notation: 'bracket' | 'dot') => {
  if (notation === 'dot') {
    return key.replace(/\["([^"]+)"]/g, '.$1').replace(/\[(\d+)]/g, '.$1');
  }

  const parts = key.split('.');

  if (parts.length <= 1) {
    return key;
  }

  const [root = '', ...rest] = parts;

  return root + rest.map((p) => (/^\d+$/.test(p) ? `[${p}]` : `["${p}"]`)).join('');
};

// Internal functions

export function setFormData(element: HTMLInputElement, value: string) {
  elementValues.set(element, value);
}

export const createFormComponent = <T extends object>(
  store: FormStore | null,
  dispatch: (payload: FormAction<T>) => void,
  resetTouchedOnFormReset: boolean,
  externalFormRef?: { current: HTMLFormElement | null }
) => {
  /**
   * The Form component with pre-wired reset logic.
   */
  function Form(props: FormProps) {
    const { ref: forwardedRef, nativeValidation, submitWithEnter, children, ...restProps } = props;

    const formRef = useRef<HTMLFormElement>(null);
    const lastSubmitter = useRef<HTMLElement>(null);

    const formProps = useMemo(
      () => ({
        noValidate: !nativeValidation,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (
            !submitWithEnter &&
            event.key === 'Enter' &&
            event.target instanceof HTMLInputElement &&
            !event.target.onkeydown
          ) {
            const element = event.target;
            const isHidden =
              !element.offsetParent ||
              element.getAttribute('aria-hidden') === 'true' ||
              globalThis.getComputedStyle(element).display === 'none' ||
              globalThis.getComputedStyle(element).visibility === 'hidden';
            if (!isHidden) {
              event.preventDefault();
            }
          }
        },
      }),
      [nativeValidation, submitWithEnter]
    );

    const resetStore = useCallback(() => {
      const form = formRef.current as HTMLFormElement;

      for (const element of form) {
        if (
          (element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement) &&
          element.name
        ) {
          store?.setValue(
            element.name,
            getDefaultElementValue(element) || getElementValue(element)
          );
        }
      }
    }, []);

    const handleInputChange = useCallback((event: Event) => {
      const element = event.target;

      if (
        (element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          (element instanceof HTMLSelectElement && event.type !== 'input')) &&
        element.name
      ) {
        store?.setValue(element.name, getElementValue(element));
      }
    }, []);

    const handleSubmit = useCallback((event: SubmitEvent) => {
      lastSubmitter.current = event.submitter;
    }, []);

    const handleFormData = useCallback((event: FormDataEvent) => {
      const submitterName = lastSubmitter.current?.getAttribute('name');
      const submitterValue = lastSubmitter.current?.getAttribute('value');

      const elements = event.target instanceof HTMLFormElement ? [...event.target.elements] : [];

      for (const element of elements.filter(
        (el): el is HTMLInputElement =>
          el instanceof HTMLInputElement && Boolean(el.name) && event.formData.has(el.name)
      )) {
        const value = elementValues.get(element);
        if (value) {
          event.formData.set(element.name, value);
        }
      }

      // JSDOM always puts submit buttons in async actions unlike certain browser's DOMs.
      /* v8 ignore if -- @preserve */
      if (submitterName && submitterValue && !event.formData.has(submitterName)) {
        event.formData.append(submitterName, submitterValue);
      }

      lastSubmitter.current = null;
    }, []);

    const formRefCallback = useCallback(
      (node: HTMLFormElement | null) => {
        mergeRefs(formRef, forwardedRef)(node);

        if (externalFormRef) {
          externalFormRef.current = node;
        }

        const form = node as HTMLFormElement;

        if (store) {
          resetStore();

          form.addEventListener('input', handleInputChange);
          form.addEventListener('change', handleInputChange);
        }

        const hasJavaScriptAction = form.action.startsWith('javascript:');

        if (hasJavaScriptAction) {
          form.addEventListener('formdata', handleFormData);
          form.addEventListener('submit', handleSubmit, { capture: true });
        }

        return () => {
          if (hasJavaScriptAction) {
            form.removeEventListener('submit', handleSubmit, { capture: true });
            form.removeEventListener('formdata', handleFormData);
          }

          if (store) {
            form.removeEventListener('change', handleInputChange);
            form.removeEventListener('input', handleInputChange);
          }
        };
      },
      [forwardedRef, handleInputChange, handleFormData, handleSubmit, resetStore]
    );

    const handleReset = useCallback(() => {
      dispatch({
        type: 'reset',
        options: {
          retainData: false,
          resetTouched: resetTouchedOnFormReset,
        },
      });

      setTimeout(() => {
        resetStore();
      }, 0);
    }, [resetStore]);

    return (
      <form
        ref={formRefCallback}
        autoComplete="off"
        onReset={handleReset}
        {...formProps}
        {...restProps}
      >
        {children}
        <FormResetBlocker formRef={formRef} />
      </form>
    );
  }

  return Form;
};

// Public functions

/**
 * URL encodes form data name/value pairs.
 *
 * Use `formDataEncode(formData).toString()` to get a string notation of the name/value pairs.
 *
 * @param formData - The form data.
 * @param omitNames - An array of names that represent form data entries that should not be serialized.
 * @param nameFormat - Optionally renames field keys to the specified name format. Otherwise, the
 *                     `inferredNameFormat` initialization value is used (default: "bracket").
 * @returns The `URLSearchParams` instance with the form data name/value pairs.
 */
export const formDataEncode = (
  formData: FormData,
  omitNames?: string[],
  nameFormat?: 'bracket' | 'dot'
) =>
  new URLSearchParams(
    [...formData.entries()]
      .filter((entry) => !omitNames?.length || !omitNames.includes(entry[0]))
      .map((entry) => [
        nameFormat ? reformatName(entry[0], nameFormat) : entry[0],
        typeof entry[1] === 'string' ? entry[1] : entry[1].name,
      ])
  );

/**
 * Submits a form element.
 *
 * This function supports asynchronous action forms.
 *
 * @param form - The form element.
 * @param submitter - An optional submitter HTML submit button element.
 */
export const submitForm = (form?: HTMLFormElement | null, submitter?: HTMLElement | null) => {
  form?.requestSubmit(submitter);
};
