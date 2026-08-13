import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createSlice, createEntityAdapter, PayloadAction, configureStore } from '@reduxjs/toolkit';

// =========================================================================
// 1. Production Custom Hook: useDebouncedValue
// =========================================================================
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler); // Cleanup avoids memory leaks & stale execution
    };
  }, [value, delayMs]);

  return debouncedValue;
}

// =========================================================================
// 2. Production Custom Hook: useIntersectionObserver (Lazy Load / Infinite Scroll)
// =========================================================================
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = { threshold: 0.1 }
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref, options.threshold, options.root, options.rootMargin]);

  return isIntersecting;
}

// =========================================================================
// 3. Normalized Redux Toolkit Slice with createEntityAdapter
// =========================================================================
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

// Normalizes state to { ids: ['1', '2'], entities: { '1': { ... }, '2': { ... } } }
const productsAdapter = createEntityAdapter<Product>({
  selectId: (product) => product.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
});

export const productsSlice = createSlice({
  name: 'products',
  initialState: productsAdapter.getInitialState({
    status: 'idle' as 'idle' | 'loading' | 'succeeded' | 'failed',
    error: null as string | null
  }),
  reducers: {
    productAdded: productsAdapter.addOne,
    productsReceived: productsAdapter.setAll,
    productUpdated: productsAdapter.updateOne,
    productRemoved: productsAdapter.removeOne
  }
});

export const { productAdded, productsReceived, productUpdated, productRemoved } = productsSlice.actions;

// Export memoized selectors
export const productsSelectors = productsAdapter.getSelectors<{ products: ReturnType<typeof productsSlice.reducer> }>(
  (state) => state.products
);

// Sample store configuration
export const store = configureStore({
  reducer: {
    products: productsSlice.reducer
  }
});
