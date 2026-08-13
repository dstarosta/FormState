import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

vi.stubEnv('NODE_ENV', 'development');

Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  get(): ParentNode | null {
    return (this as Element).parentNode ?? null;
  },
});

const OriginalFormData = FormData;

Object.defineProperty(globalThis, 'FormData', {
  value: class extends OriginalFormData {
    constructor(form?: HTMLFormElement, submitter?: HTMLElement | null) {
      super(form, submitter);

      if (form) {
        const event = new Event('formdata', { bubbles: true });
        Object.defineProperty(event, 'formData', { value: this });
        form.dispatchEvent(event);
      }
    }
  },
  writable: true,
  configurable: true,
  enumerable: true,
});
