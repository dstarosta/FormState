// Internal methods

export const mergeRefs =
  <T>(...refs: (React.Ref<T> | undefined | null)[]) =>
  (node: T | null) => {
    const cleanups: Array<() => void> = [];

    for (const ref of refs) {
      if (typeof ref === 'function') {
        const result = ref(node);

        cleanups.push(typeof result === 'function' ? result : () => ref(null));
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
