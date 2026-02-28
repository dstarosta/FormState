import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

vi.stubEnv('NODE_ENV', 'development');

Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  get(): ParentNode | null {
    return (this as Element)?.parentNode ?? null;
  },
});
