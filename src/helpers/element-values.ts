const elementValues = new WeakMap<HTMLInputElement, string>();

// Internal functions

export function getFormData(element: HTMLInputElement): string | undefined {
  return elementValues.get(element);
}

export function setFormData(element: HTMLInputElement, value: string) {
  elementValues.set(element, value);
}
