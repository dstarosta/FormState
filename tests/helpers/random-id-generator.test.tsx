import { describe, expect, it, vi } from 'vitest';
import { generateUniqueId } from '../../src/helpers/random-id-generator';

describe('generateUniqueId', () => {
  const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[\da-f]{4}-[\da-f]{12}$/i;

  it('returns a UUID via crypto.randomUUID when available', () => {
    expect(generateUniqueId()).toMatch(UUID_PATTERN);
  });

  it('falls back to crypto.getRandomValues when crypto.randomUUID is unavailable', () => {
    const originalRandomUUID = crypto.randomUUID.bind(crypto);
    const originalGetRandomValues = crypto.getRandomValues.bind(crypto);

    const getRandomValuesSpy = vi.fn((buffer: Uint8Array<ArrayBuffer>) =>
      originalGetRandomValues(buffer)
    );

    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    });

    Object.defineProperty(crypto, 'getRandomValues', {
      configurable: true,
      value: getRandomValuesSpy,
    });

    try {
      const id = generateUniqueId();

      expect(id).toMatch(UUID_PATTERN);
      expect(getRandomValuesSpy).toHaveBeenCalledOnce();
      expect(getRandomValuesSpy.mock.calls[0]?.[0]).toBeInstanceOf(Uint8Array);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', {
        configurable: true,
        value: originalRandomUUID,
      });

      Object.defineProperty(crypto, 'getRandomValues', {
        configurable: true,
        value: originalGetRandomValues,
      });
    }
  });
});
