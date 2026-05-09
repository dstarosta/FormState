// Internal functions

export function generateUniqueId() {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.isSecureContext &&
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers or unsecure contexts.
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) =>
    (+char ^ ((crypto.getRandomValues(new Uint8Array(1))[0] ?? 1) & (15 >> (+char / 4)))).toString(
      16
    )
  );
}
