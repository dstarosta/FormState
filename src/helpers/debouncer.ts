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
      if (lastArgs === null) {
        return;
      }

      const currentArgs = lastArgs;

      cleanup();

      fn(...currentArgs);
    }, wait);
  };

  debounced.cancel = cleanup;

  return debounced;
}

export function debounceAsync<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  wait: number,
  fallback: R
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: R) => void) | null = null;
  let lastResult: R = fallback;

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (pendingResolve) {
      pendingResolve(lastResult);
      pendingResolve = null;
    }
  };

  const debounced = (...args: T): Promise<R> => {
    cancel();

    return new Promise<R>((resolve) => {
      pendingResolve = resolve;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        pendingResolve = null;
        void (async () => {
          try {
            const result = await fn(...args);
            lastResult = result;
            resolve(result);
          } catch {
            resolve(fallback);
          }
        })();
      }, wait);
    });
  };

  debounced.cancel = cancel;

  return debounced;
}
