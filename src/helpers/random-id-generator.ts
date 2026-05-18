// Internal functions

export function generateUniqueId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for runtimes without crypto.randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let i = 0;

  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) =>
    (+char ^ ((bytes[i++] ?? 1) & (15 >> (+char / 4)))).toString(16)
  );
}
