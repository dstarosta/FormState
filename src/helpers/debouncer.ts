// Internal functions

export function debounce<T extends unknown[]>(fn: (...args: T) => unknown, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: T | null = null;

  const invoke = () => {
    const args = lastArgs as T;
    lastArgs = null;
    fn(...args);
  };

  const debounced = ((...args: T) => {
    lastArgs = args;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      invoke();
    }, wait);
  }) as ((...args: T) => void) & { cancel: () => void };

  debounced.cancel = () => {
    // There should always be a timeout in a debounced function.
    /* v8 ignore if -- @preserve */
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }

    lastArgs = null;
  };

  return debounced;
}
