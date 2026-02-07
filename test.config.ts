import '@testing-library/jest-dom/vitest';

Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  get(): ParentNode | null {
    return (this as Element)?.parentNode ?? null;
  },
});
