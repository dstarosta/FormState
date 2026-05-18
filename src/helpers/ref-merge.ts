// Internal methods

export const mergeRefs =
  <T>(...refs: (React.Ref<T> | undefined | null)[]) =>
  (node: T | null) => {
    const cleanups: Array<() => void> = [];

    for (const ref of refs) {
      if (typeof ref === 'function') {
        const result = ref(node);

        if (typeof result === 'function') {
          cleanups.push(result);
        } else {
          cleanups.push(() => ref(null));
        }
      } else if (ref) {
        ref.current = node;

        cleanups.push(() => {
          ref.current = null;
        });
      }
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };
