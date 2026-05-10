// Internal methods

export const mergeRefs =
  <T>(...refs: (React.Ref<T> | undefined | null)[]) =>
  (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }
  };
