import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useFormState, convert, z } from '../src';
import { schema } from './fixtures';

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('createSelector', () => {
  it('selects a single primitive field', () => {
    const { result } = renderHook(() => useFormState(schema));
    const {
      formState,
      formHooks: { useSelector },
    } = result.current;

    const selectorHook = renderHook(() => useSelector((state) => state.name));
    const selectName = selectorHook.result.current;

    expect(selectName(formState.data)).toBe(formState.data.name);
  });

  it('derives a value from a single field', () => {
    const { result } = renderHook(() => useFormState(schema));
    const {
      formState,
      formHooks: { useSelector },
    } = result.current;

    const selectorHook = renderHook(() =>
      useSelector(
        (state) => state.isActive,
        (isActive) => (isActive ? 'yes' : 'no')
      )
    );

    const selectActive = selectorHook.result.current;
    const value = selectActive(formState.data);

    expect(value).toBe('yes');
  });

  it('combines multiple fields', () => {
    const { result } = renderHook(() => useFormState(schema));
    const {
      formState,
      formHooks: { useSelector },
    } = result.current;

    const selectorHook = renderHook(() =>
      useSelector(
        [(state) => state.name, (state) => state.version],
        (name, version) => `${name || 'unnamed'} v${String(version)}`
      )
    );

    const selectSummary = selectorHook.result.current;
    const value = selectSummary(formState.data);

    expect(value).toBe('unnamed v0');
  });

  it('filters an array field', () => {
    const tagSchema = z.strictObject({
      tags: z.formArray(z.string()),
      archived: z.formBoolean(),
    });

    const initialData = { tags: ['alpha', 'beta', 'gamma'], archived: false };

    const { result } = renderHook(() => useFormState(tagSchema, { initialData }));
    const {
      formState,
      formHooks: { useSelector },
    } = result.current;

    const selectorHook = renderHook(() =>
      useSelector(
        (state) => state.tags,
        (tags) => tags.filter((t) => t.length > 4)
      )
    );

    const selectLongTags = selectorHook.result.current;
    const value = selectLongTags(formState.data);

    expect(value).toEqual(['alpha', 'gamma']);
  });

  it('composes selectors', () => {
    const tagSchema = z.strictObject({
      tags: z.formArray(z.string()),
      archived: z.formBoolean(),
    });

    const initialData = { tags: ['a', 'bb', 'ccc', 'dddd'], archived: false };

    const { result } = renderHook(() => useFormState(tagSchema, { initialData }));
    const {
      formState,
      formHooks: { useSelector },
    } = result.current;

    const tagSelectorHook = renderHook(() => useSelector((state) => state.tags));
    const longTagSelectorHook = renderHook(() =>
      useSelector(tagSelectorHook.result.current, (tags) => tags.filter((t) => t.length >= 3))
    );
    const selectLongTagSelectorHook = renderHook(() =>
      useSelector(longTagSelectorHook.result.current, (tags) => tags.length)
    );

    const selectLongTagCount = selectLongTagSelectorHook.result.current;
    const value = selectLongTagCount(formState.data);

    expect(value).toBe(2);
  });

  it('fans out from one upstream selector to two independent downstream selectors', () => {
    const tagSchema = z.strictObject({
      tags: z.formArray(z.string()),
      archived: z.formBoolean(),
    });

    const initialData = { tags: ['a', 'bb', 'ccc', 'dddd'], archived: false };

    const { result } = renderHook(() => useFormState(tagSchema, { initialData }));
    const {
      formState,
      formHooks: { useSelector },
    } = result.current;

    const longTagSelectorHook = renderHook(() =>
      useSelector(
        (state) => state.tags,
        (tags) => tags.filter((t) => t.length >= 3)
      )
    );
    const longTagCountHook = renderHook(() =>
      useSelector(longTagSelectorHook.result.current, (tags) => tags.length)
    );
    const longTagCountNames = renderHook(() =>
      useSelector(longTagSelectorHook.result.current, (tags) => tags.map((tag) => tag))
    );

    const selectLongTagCount = longTagCountHook.result.current;
    const selectLongTagNames = longTagCountNames.result.current;

    const countValue = selectLongTagCount(formState.data);
    const nameValue = selectLongTagNames(formState.data);

    expect(countValue).toBe(2);
    expect(nameValue).toEqual(['ccc', 'dddd']);
  });

  it('combines a composed selector with a raw field as inputs', () => {
    const orderSchema = z.strictObject({
      orders: z.array(
        z.object({
          product: z.formString({ required: true }),
          quantity: z.formNumber({ required: true }),
          unitPrice: z.formNumber({ required: true }),
          shipped: z.formBoolean({ required: true }),
        })
      ),
      discountPct: z.formNumber(),
    });

    const initialData = {
      orders: [
        { product: 'Widget', quantity: 2, unitPrice: 10, shipped: false },
        { product: 'Gadget', quantity: 1, unitPrice: 50, shipped: true },
        { product: 'Doohickey', quantity: 4, unitPrice: 5, shipped: false },
      ],
      discountPct: 20,
    };
    const { result } = renderHook(() => useFormState(orderSchema, { initialData }));
    const {
      formState,
      formHooks: { useSelector },
    } = result.current;

    const selectPendingOrdersHook = renderHook(() =>
      useSelector(
        (state) => state.orders,
        (orders) => orders.filter((order) => !order.shipped)
      )
    );

    const selectOrderSummaryHook = renderHook(() =>
      useSelector(
        [selectPendingOrdersHook.result.current, (state) => state.discountPct],
        (pending, discountPct) => {
          const subtotal = pending.reduce((sum, order) => {
            return sum + convert.asNumber(order.quantity) * convert.asNumber(order.unitPrice);
          }, 0);
          const discount = typeof discountPct === 'number' ? discountPct / 100 : 0;

          return { count: pending.length, subtotal, total: subtotal * (1 - discount) };
        }
      )
    );
    const selectOrderSummary = selectOrderSummaryHook.result.current;

    const summary = selectOrderSummary(formState.data);

    // pending: Widget (2×10=20) + Doohickey (4×5=20) = subtotal 40, 20% off, total 32
    expect(summary.count).toBe(2);
    expect(summary.subtotal).toBe(40);
    expect(summary.total).toBe(32);
  });

  describe('memoization', () => {
    it('does not recompute when the state reference is the same', () => {
      const { result, rerender } = renderHook(() => useFormState(schema));
      const {
        formHooks: { useSelector },
        formState,
      } = result.current;

      const resultFn = vi.fn((name: string) => name.toUpperCase());

      const selectNameHook = renderHook(() =>
        useSelector(
          (state) => state.name,
          (name) => resultFn(name)
        )
      );
      const selectName = selectNameHook.result.current;

      selectName(formState.data);

      rerender();
      selectNameHook.rerender();

      selectName(formState.data);

      expect(resultFn).toHaveBeenCalledTimes(1);
    });

    it('recomputes when a tracked field changes', () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formHooks: { useSelector },
        formState,
      } = result.current;

      const resultFn = vi.fn((name: string) => name.toUpperCase());

      const selectNameHook = renderHook(() =>
        useSelector(
          (state) => state.name,
          (name) => resultFn(name)
        )
      );
      const selectName = selectNameHook.result.current;

      selectName(formState.data);

      const updated = { ...formState.data, name: 'updated' } as typeof formState.data;
      selectName(updated);

      expect(resultFn).toHaveBeenCalledTimes(2);
    });

    it('recomputes when a tracked field changes (with rerender)', () => {
      const { result, rerender } = renderHook(() => useFormState(schema));
      const {
        formHooks: { useSelector },
        formState,
      } = result.current;

      const resultFn = vi.fn((name: string) => name.toUpperCase());

      const selectNameHook = renderHook(() =>
        useSelector(
          (state) => state.name,
          (name) => resultFn(name)
        )
      );
      const selectName = selectNameHook.result.current;

      selectName(formState.data);

      rerender();
      selectNameHook.rerender();

      const updated = { ...formState.data, name: 'updated' } as typeof formState.data;
      selectName(updated);

      expect(resultFn).toHaveBeenCalledTimes(2);
    });

    it('does not recompute when only unrelated fields change', () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formHooks: { useSelector },
        formState,
      } = result.current;

      const resultFn = vi.fn((name: string) => name.toUpperCase());
      const selectNameHook = renderHook(() =>
        useSelector(
          (state) => state.name,
          (name) => resultFn(name)
        )
      );
      const selectName = selectNameHook.result.current;

      selectName(formState.data);

      const updated = { ...formState.data, version: 99 } as typeof formState.data;
      selectName(updated);

      expect(resultFn).toHaveBeenCalledTimes(1);
    });

    it('does not recompute when only unrelated fields change (with rerender)', () => {
      const { result, rerender } = renderHook(() => useFormState(schema));
      const {
        formHooks: { useSelector },
        formState,
      } = result.current;

      const resultFn = vi.fn((name: string) => name.toUpperCase());
      const selectNameHook = renderHook(() =>
        useSelector(
          (state) => state.name,
          (name) => resultFn(name)
        )
      );
      const selectName = selectNameHook.result.current;

      selectName(formState.data);

      rerender();
      selectNameHook.rerender();

      const updated = { ...formState.data, version: 99 } as typeof formState.data;
      selectName(updated);

      expect(resultFn).toHaveBeenCalledTimes(1);
    });

    it('returns the same reference when inputs have not changed', () => {
      const tagSchema = z.strictObject({ tags: z.formArray(z.string()) });

      const initialData = { tags: ['a', 'b'] };

      const { result } = renderHook(() => useFormState(tagSchema, { initialData }));
      const {
        formHooks: { useSelector },
        formState,
      } = result.current;

      const selectTagsHooks = renderHook(() =>
        useSelector(
          (state) => state.tags,
          (tags) => [...tags]
        )
      );
      const selectTags = selectTagsHooks.result.current;

      const first = selectTags(formState.data);
      const second = selectTags(formState.data);

      expect(first).toBe(second);
    });

    it('returns the same reference when inputs have not changed (with rerender)', () => {
      const tagSchema = z.strictObject({ tags: z.formArray(z.string()) });

      const initialData = { tags: ['a', 'b'] };

      const { result, rerender } = renderHook(() => useFormState(tagSchema, { initialData }));
      const {
        formHooks: { useSelector },
        formState,
      } = result.current;

      const selectTagsHooks = renderHook(() =>
        useSelector(
          (state) => state.tags,
          (tags) => [...tags]
        )
      );
      const selectTags = selectTagsHooks.result.current;

      const first = selectTags(formState.data);

      rerender();
      selectTagsHooks.rerender();

      const second = selectTags(formState.data);

      expect(first).toBe(second);
    });

    it('caches only the last result — recomputes when switching between two states', () => {
      const { result } = renderHook(() => useFormState(schema));
      const {
        formHooks: { useSelector },
        formState,
      } = result.current;

      const resultFn = vi.fn((active: boolean | string) => (active ? 'active' : 'inactive'));

      const selectStatusHook = renderHook(() =>
        useSelector(
          (state) => state.isActive,
          (active) => resultFn(active)
        )
      );
      const selectStatus = selectStatusHook.result.current;

      const stateA = formState.data;
      const stateB = { ...formState.data, isActive: false } as typeof formState.data;

      selectStatus(stateA);
      selectStatus(stateB);
      selectStatus(stateA);

      expect(resultFn).toHaveBeenCalledTimes(3);
    });

    it('caches only the last result — recomputes when switching between two states (with rerender)', () => {
      const { result, rerender } = renderHook(() => useFormState(schema));
      const {
        formHooks: { useSelector },
        formState,
      } = result.current;

      const resultFn = vi.fn((active: boolean | string) => (active ? 'active' : 'inactive'));

      const selectStatusHook = renderHook(() =>
        useSelector(
          (state) => state.isActive,
          (active) => resultFn(active)
        )
      );
      const selectStatus = selectStatusHook.result.current;

      const stateA = formState.data;
      const stateB = { ...formState.data, isActive: false } as typeof formState.data;

      selectStatus(stateA);

      rerender();
      selectStatusHook.rerender();

      selectStatus(stateB);

      rerender();
      selectStatusHook.rerender();

      selectStatus(stateA);

      expect(resultFn).toHaveBeenCalledTimes(3);
    });
  });
});
