// Internal methods

export function throttle<T extends unknown[]>(fn: (...args: T) => unknown, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: T | null = null;
  let lastInvoke = 0;

  const invoke = () => {
    lastInvoke = performance.now();

    const args = lastArgs as T;
    lastArgs = null;

    fn(...args);
  };

  const throttled = ((...args: T) => {
    const now = performance.now();
    lastArgs = args;

    const elapsed = now - lastInvoke;
    const shouldInvoke = lastInvoke === 0 || elapsed >= wait;

    if (!timeout) {
      const delay = shouldInvoke ? wait : wait - elapsed;

      timeout = setTimeout(() => {
        timeout = null;

        if (lastArgs) {
          invoke();
        }
      }, delay);
    }
  }) as ((...args: T) => void) & { cancel: () => void };

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = null;
    lastArgs = null;
    lastInvoke = 0;
  };

  return throttled;
}
