import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { mergeRefs } from '../../src/helpers/ref-merge';

describe('mergeRefs', () => {
  it('assigns the node to object refs and nulls them on cleanup', () => {
    const ref = createRef<HTMLDivElement>();
    const node = document.createElement('div');

    const cleanupRefs = mergeRefs<HTMLDivElement>(ref)(node);

    expect(ref.current).toBe(node);

    cleanupRefs();

    expect(ref.current).toBeNull();
  });

  it('calls a legacy function ref with the node and again with null on cleanup', () => {
    const fn = vi.fn();
    const node = document.createElement('div');

    const cleanupRefs = mergeRefs<HTMLDivElement>(fn)(node);

    expect(fn).toHaveBeenCalledWith(node);

    cleanupRefs();

    expect(fn).toHaveBeenLastCalledWith(null);
  });

  it('invokes the cleanup returned by a function ref instead of calling it with null', () => {
    const refCleanup = vi.fn();
    const fn = vi.fn(() => refCleanup);
    const node = document.createElement('div');

    const cleanupRefs = mergeRefs<HTMLDivElement>(fn)(node);

    expect(fn).toHaveBeenCalledWith(node);
    expect(refCleanup).not.toHaveBeenCalled();

    cleanupRefs();

    expect(refCleanup).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('skips null or undefined refs', () => {
    const ref = createRef<HTMLDivElement>();
    const node = document.createElement('div');

    const cleanupRefs = mergeRefs<HTMLDivElement>(null, undefined, ref)(node);

    expect(ref.current).toBe(node);

    cleanupRefs();

    expect(ref.current).toBeNull();
  });
});
