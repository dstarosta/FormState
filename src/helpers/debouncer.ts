// Internal functions

export function debounce<T extends unknown[]>(fn: (...args: T) => void, wait: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: T | null = null;

  const cleanup = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = null;
    lastArgs = null;
  };

  const debounced = (...args: T) => {
    lastArgs = args;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (lastArgs !== null) {
        const currentArgs = lastArgs;

        cleanup();

        fn(...currentArgs);
      }
    }, wait);
  };

  debounced.cancel = cleanup;

  return debounced;
}
