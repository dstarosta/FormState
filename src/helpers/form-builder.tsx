import { useCallback, useRef } from 'react';

import type { FormAction, FormStore } from '../types/form-types';

// Private functions

const formProps: React.ComponentPropsWithRef<'form'> = {
  noValidate: true,
  onKeyDown: (event: React.KeyboardEvent) => {
    if (
      event.key === 'Enter' &&
      event.target instanceof HTMLInputElement &&
      !event.target.onkeydown
    ) {
      const element = event.target;
      const isHidden =
        !element?.offsetParent ||
        element.getAttribute('aria-hidden') === 'true' ||
        globalThis?.getComputedStyle(element).display === 'none' ||
        globalThis?.getComputedStyle(element).visibility === 'hidden';
      if (!isHidden) {
        event.preventDefault();
      }
    }
  },
};

const getDefaultElementValue = (
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
) => {
  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    return element.defaultChecked ? element.defaultValue || 'on' : '';
  }

  if ('defaultValue' in element) {
    return element.defaultValue ?? '';
  }

  return '';
};

const getElementValue = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    return element.checked ? element.value || 'on' : '';
  }

  return element.value ?? '';
};

// Internal functions

export const createFormComponent = <T extends object>(
  store: FormStore | null,
  dispatch: (payload: FormAction<T>) => void,
  resetTouchedOnFormReset: boolean
) => {
  /**
   * The Form component with pre-wired reset logic.
   */
  function Form(props: React.ComponentPropsWithRef<'form'>) {
    const { ref: forwardedRef, ...restProps } = props;

    const formRef = useRef<HTMLFormElement>(null);
    const lastSubmitter = useRef<HTMLElement>(null);

    const resetStore = () => {
      // This condition should not be happening in a callback.
      /* v8 ignore if -- @preserve */
      if (!store || !formRef.current) {
        return;
      }

      for (const element of formRef.current) {
        if (
          (element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement) &&
          element.name
        ) {
          store.setValue(element.name, getDefaultElementValue(element) || getElementValue(element));
        }
      }
    };

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

      // JSDOM always puts submit buttons in async actions unlike certain browser's DOMs.
      /* v8 ignore if -- @preserve */
      if (submitterName && submitterValue && !event.formData.has(submitterName)) {
        event.formData.append(submitterName, submitterValue);
      }

      lastSubmitter.current = null;
    }, []);

    const formRefCallback = useCallback(
      (node: HTMLFormElement | null) => {
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }

        formRef.current = node;

        // Defensive check for a null node.
        /* v8 ignore if -- @preserve */
        if (!node) {
          return;
        }

        if (store) {
          resetStore();

          node.addEventListener('input', handleInputChange);
          node.addEventListener('change', handleInputChange);
        }

        const hasAction = node.action?.includes('throw new Error');

        if (hasAction) {
          node.addEventListener('formdata', handleFormData);
          node.addEventListener('submit', handleSubmit, { capture: true });
        }

        return () => {
          if (hasAction) {
            node.removeEventListener('submit', handleSubmit, { capture: true });
            node.removeEventListener('formdata', handleFormData);
          }

          if (store) {
            node.removeEventListener('change', handleInputChange);
            node.removeEventListener('input', handleInputChange);
          }
        };
      },
      [forwardedRef, handleInputChange, handleFormData, handleSubmit]
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
    }, []);

    return <form ref={formRefCallback} onReset={handleReset} {...formProps} {...restProps} />;
  }

  return Form;
};

// Public functions

/**
 * Converts form data name/value pairs into the URL search parameters.
 *
 * Use `formDataToURL(formData).toString()` to get a string notation of the name/value pairs.
 *
 * @param formData - The form data.
 * @returns The `URLSearchParams` instance with the form data name/value pairs.
 */
export const formDataToURL = (formData: FormData) =>
  new URLSearchParams(
    Array.from(formData, ([key, value]): [string, string] => {
      return typeof value === 'string' ? [key, value] : [key, value.name];
    })
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
