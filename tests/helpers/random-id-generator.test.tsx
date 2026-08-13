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

    Object.defineProperties(crypto, {
      randomUUID: {
        configurable: true,
        value: undefined,
      },
      getRandomValues: {
        configurable: true,
        value: getRandomValuesSpy,
      },
    });

    try {
      const id = generateUniqueId();

      expect(id).toMatch(UUID_PATTERN);
      expect(getRandomValuesSpy).toHaveBeenCalledOnce();
      expect(getRandomValuesSpy.mock.calls[0]?.[0]).toBeInstanceOf(Uint8Array);
    } finally {
      Object.defineProperties(crypto, {
        randomUUID: {
          configurable: true,
          value: originalRandomUUID,
        },
        getRandomValues: {
          configurable: true,
          value: originalGetRandomValues,
        },
      });
    }
  });

  it('falls back to Math.random when no crypto CSPRNG is available', () => {
    const originalRandomUUID = crypto.randomUUID.bind(crypto);
    const originalGetRandomValues = crypto.getRandomValues.bind(crypto);

    Object.defineProperties(crypto, {
      randomUUID: {
        configurable: true,
        value: undefined,
      },
      getRandomValues: {
        configurable: true,
        value: undefined,
      },
    });

    const randomSpy = vi.spyOn(Math, 'random');

    try {
      const id = generateUniqueId();

      expect(id).toMatch(UUID_PATTERN);
      expect(randomSpy).toHaveBeenCalled();
    } finally {
      randomSpy.mockRestore();

      Object.defineProperties(crypto, {
        randomUUID: {
          configurable: true,
          value: originalRandomUUID,
        },
        getRandomValues: {
          configurable: true,
          value: originalGetRandomValues,
        },
      });
    }
  });
});
