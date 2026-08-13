// Private functions

const fillUuidTemplate = (nextNibble: () => number) =>
  '10000000-1000-4000-8000-100000000000'.replaceAll(/[018]/g, (char) =>
    (+char ^ (nextNibble() & (15 >> (+char / 4)))).toString(16)
  );

// Internal functions

export function generateUniqueId() {
  const cryptoObj = typeof crypto === 'object' ? crypto : undefined;

  if (typeof cryptoObj?.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  if (typeof cryptoObj?.getRandomValues !== 'function') {
    // eslint-disable-next-line sonarjs/pseudo-random -- non-security id; CSPRNG paths above are preferred
    return fillUuidTemplate(() => Math.trunc(Math.random() * 16));
  }

  // Fallback for runtimes without crypto.randomUUID.
  const bytes = cryptoObj.getRandomValues(new Uint8Array(32));
  let i = 0;

  return fillUuidTemplate(() => bytes[i++] ?? 1);
}
