import { describe, it, expect } from 'vitest';

import { dotPathGet, dotPathSet } from './dot-path';

describe('dot-path', () => {
  describe('get', () => {
    it('should get a simple property', () => {
      const obj = { a: 1 };

      expect(dotPathGet(obj, 'a')).toBe(1);
    });

    it('should get a nested property', () => {
      const obj = { a: { b: { c: 2 } } };

      expect(dotPathGet(obj, 'a.b.c')).toBe(2);
    });

    it('should handle array indices', () => {
      const obj = { a: [1, 2, 3] };

      expect(dotPathGet(obj, 'a.1')).toBe(2);
    });

    it('should handle $end for arrays', () => {
      const obj = { a: [1, 2, 3] };

      expect(dotPathGet(obj, 'a.$end')).toBe(3);
    });

    it('should handle array of paths', () => {
      const obj = { a: { b: { c: 3 } } };

      expect(dotPathGet(obj, ['a', 'b', 'c'])).toBe(3);
    });

    it('should handle numeric prop', () => {
      const obj = { '123': 'value' };

      expect(dotPathGet(obj, 123)).toBe('value');
    });

    it('should handle escaped dots in path', () => {
      const obj = { 'a.b': { c: 4 } };

      expect(dotPathGet(obj, String.raw`a\.b.c`)).toBe(4);
    });

    it('should return undefined for non-existent property without default', () => {
      const obj = { a: 1 };

      expect(dotPathGet(obj, 'b')).toBeUndefined();
    });

    it('should return undefined when path goes through null', () => {
      const obj = { a: null };

      expect(dotPathGet(obj, 'a.b.c')).toBeUndefined();
    });

    it('should return undefined when path goes through string primitive', () => {
      const obj = { a: 'hello' };

      expect(dotPathGet(obj, 'a.b')).toBeUndefined();
    });

    it('should return undefined when path goes through boolean primitive', () => {
      const obj = { a: true };

      expect(dotPathGet(obj, 'a.b')).toBeUndefined();
    });

    it('should return undefined when path goes through number primitive', () => {
      const obj = { a: 42 };

      expect(dotPathGet(obj, 'a.b')).toBeUndefined();
    });

    it('should return undefined when path goes through undefined', () => {
      const obj = {};

      expect(dotPathGet(obj, 'a.b.c')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set a simple property', () => {
      const obj = { a: 1 };
      const result = dotPathSet(obj, 'b', 2);

      expect(result).toEqual({ a: 1, b: 2 });
      expect(obj).toEqual({ a: 1 });
    });

    it('should set a nested property', () => {
      const obj = { a: { b: 1 } };
      const result = dotPathSet(obj, 'a.b', 2);

      expect(result).toEqual({ a: { b: 2 } });
      expect(obj.a.b).toBe(1);
    });

    it('should create nested structure if not exists', () => {
      const obj = {};
      const result = dotPathSet(obj, 'a.b.c', 3);

      expect(result).toEqual({ a: { b: { c: 3 } } });
    });

    it('should handle arrays immutably', () => {
      const obj = { a: [1, 2, 3] };
      const result = dotPathSet(obj, 'a.1', 5);

      expect(result).toEqual({ a: [1, 5, 3] });
      expect(obj.a[1]).toBe(2);
    });

    it('should handle $end for arrays', () => {
      const obj = { a: [1, 2, 3] };
      const result = dotPathSet(obj, 'a.$end', 9);

      expect(result).toEqual({ a: [1, 2, 9] });
    });

    it('should handle function values', () => {
      const obj = { a: { b: 5 } };
      const result = dotPathSet(obj, 'a.b', (current: unknown) => (current as number) * 2);

      expect(result).toEqual({ a: { b: 10 } });
    });

    it('should handle array of paths', () => {
      const obj = { a: { b: 1 } };
      const result = dotPathSet(obj, ['a', 'b'], 2);

      expect(result).toEqual({ a: { b: 2 } });
    });

    it('should handle numeric prop', () => {
      const obj = {};
      const result = dotPathSet(obj, 123, 'value');

      expect(result).toEqual({ '123': 'value' });
    });

    it('should throw error for invalid array index', () => {
      const obj = { a: [1, 2, 3] };

      expect(() => dotPathSet(obj, 'a.invalid', 5)).toThrow(
        "Array index 'invalid' has to be an integer"
      );
    });

    it('should handle escaped dots in path', () => {
      const obj = { 'a.b': { c: 1 } };
      const result = dotPathSet(obj, String.raw`a\.b.c`, 2);

      expect(result).toEqual({ 'a.b': { c: 2 } });
    });
  });
});
