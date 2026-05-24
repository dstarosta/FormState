// Internal functions

/**
 * Constructs the minimal scaffolding of a `React.ChangeEvent`-like object
 * for synthetic-change dispatch. Components that proxy the DOM value (e.g.
 * masked inputs, secure inputs) call this to fire a single canonical event
 * from their custom edit pipeline, then cast the result to a more specific
 * event type if they augment it with extra fields.
 *
 * The returned object has only the fields React consumers normally read or
 * call (`target`, `currentTarget`, `nativeEvent`, `type`, `bubbles`, and the
 * no-op interaction methods). Callers add their own extras (e.g. `complete`,
 * `unmaskedValue`) and cast to their final event type.
 */
export function createSyntheticChangeEvent(
  value: string,
  name: string | undefined
): React.ChangeEvent<HTMLInputElement> {
  return {
    type: 'change',
    target: { value, name } as EventTarget & HTMLInputElement,
    currentTarget: { value, name } as EventTarget & HTMLInputElement,
    nativeEvent: new Event('change'),
    bubbles: true,
    preventDefault: () => {},
    stopPropagation: () => {},
    persist: () => {},
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
  } as React.ChangeEvent<HTMLInputElement>;
}
