// Internal functions

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
