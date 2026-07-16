import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';
import type { TravelPackage } from '@/types';

describe('CartContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const createMockPackage = (overrides: Partial<TravelPackage> = {}): TravelPackage => ({
    package_id: 'pkg-1',
    title: 'Test Package',
    description: 'Test Description',
    price: 100,
    currency: 'MXN',
    region: 'Test Region',
    url_thumbnail_storage: 'https://example.com/image.jpg',
    tenant_id: 'tenant-1',
    ...overrides,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  describe('initial state', () => {
    it('starts with empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      expect(result.current.items).toEqual([]);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('addItem', () => {
    it('adds item to empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const pkg = createMockPackage();
      
      act(() => {
        result.current.addItem(pkg);
      });
      
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toEqual({
        package_id: 'pkg-1',
        title: 'Test Package',
        price: 100,
        currency: 'MXN',
        region: 'Test Region',
        url_thumbnail_storage: 'https://example.com/image.jpg',
        tenant_id: 'tenant-1',
      });
    });

    it('adds multiple items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const pkg1 = createMockPackage({ package_id: 'pkg-1', price: 100 });
      const pkg2 = createMockPackage({ package_id: 'pkg-2', price: 200 });
      
      act(() => {
        result.current.addItem(pkg1);
        result.current.addItem(pkg2);
      });
      
      expect(result.current.items).toHaveLength(2);
      expect(result.current.itemCount).toBe(2);
    });

    it('does not add duplicate items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const pkg = createMockPackage({ package_id: 'pkg-1' });
      
      act(() => {
        result.current.addItem(pkg);
        result.current.addItem(pkg);
      });
      
      expect(result.current.items).toHaveLength(1);
    });

    it('calculates correct total after adding items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const pkg1 = createMockPackage({ package_id: 'pkg-1', price: 100 });
      const pkg2 = createMockPackage({ package_id: 'pkg-2', price: 250 });
      
      act(() => {
        result.current.addItem(pkg1);
        result.current.addItem(pkg2);
      });
      
      expect(result.current.total).toBe(350);
    });
  });

  describe('removeItem', () => {
    it('removes item from cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const pkg1 = createMockPackage({ package_id: 'pkg-1' });
      const pkg2 = createMockPackage({ package_id: 'pkg-2' });
      
      act(() => {
        result.current.addItem(pkg1);
        result.current.addItem(pkg2);
      });
      
      act(() => {
        result.current.removeItem('pkg-1');
      });
      
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].package_id).toBe('pkg-2');
    });

    it('updates total after removing item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const pkg1 = createMockPackage({ package_id: 'pkg-1', price: 100 });
      const pkg2 = createMockPackage({ package_id: 'pkg-2', price: 200 });
      
      act(() => {
        result.current.addItem(pkg1);
        result.current.addItem(pkg2);
      });
      
      act(() => {
        result.current.removeItem('pkg-1');
      });
      
      expect(result.current.total).toBe(200);
    });

    it('handles removing non-existent item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const pkg = createMockPackage({ package_id: 'pkg-1' });
      
      act(() => {
        result.current.addItem(pkg);
      });
      
      act(() => {
        result.current.removeItem('non-existent');
      });
      
      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('clearCart', () => {
    it('clears all items from cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const pkg1 = createMockPackage({ package_id: 'pkg-1' });
      const pkg2 = createMockPackage({ package_id: 'pkg-2' });
      
      act(() => {
        result.current.addItem(pkg1);
        result.current.addItem(pkg2);
      });
      
      act(() => {
        result.current.clearCart();
      });
      
      expect(result.current.items).toEqual([]);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('itemCount', () => {
    it('returns correct count', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      expect(result.current.itemCount).toBe(0);
      
      act(() => {
        result.current.addItem(createMockPackage({ package_id: 'pkg-1' }));
      });
      expect(result.current.itemCount).toBe(1);
      
      act(() => {
        result.current.addItem(createMockPackage({ package_id: 'pkg-2' }));
      });
      expect(result.current.itemCount).toBe(2);
      
      act(() => {
        result.current.removeItem('pkg-1');
      });
      expect(result.current.itemCount).toBe(1);
      
      act(() => {
        result.current.clearCart();
      });
      expect(result.current.itemCount).toBe(0);
    });
  });

  describe('total', () => {
    it('calculates total correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      expect(result.current.total).toBe(0);
      
      act(() => {
        result.current.addItem(createMockPackage({ package_id: 'pkg-1', price: 100 }));
      });
      expect(result.current.total).toBe(100);
      
      act(() => {
        result.current.addItem(createMockPackage({ package_id: 'pkg-2', price: 250 }));
      });
      expect(result.current.total).toBe(350);
      
      act(() => {
        result.current.removeItem('pkg-1');
      });
      expect(result.current.total).toBe(250);
    });

    it('handles decimal prices', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      
      act(() => {
        result.current.addItem(createMockPackage({ package_id: 'pkg-1', price: 99.99 }));
        result.current.addItem(createMockPackage({ package_id: 'pkg-2', price: 100.01 }));
      });
      
      expect(result.current.total).toBe(200);
    });
  });

  describe('persistence', () => {
    it('persists cart to localStorage', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const pkg = createMockPackage();
      
      act(() => {
        result.current.addItem(pkg);
      });
      
      const stored = window.localStorage.getItem('lpav_cart');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].package_id).toBe('pkg-1');
    });

    it('loads cart from localStorage on mount', () => {
      const existingCart = [
        {
          package_id: 'pkg-1',
          title: 'Existing Package',
          price: 500,
          currency: 'MXN',
          region: 'Existing Region',
          url_thumbnail_storage: 'https://example.com/existing.jpg',
          tenant_id: 'tenant-1',
        },
      ];
      window.localStorage.setItem('lpav_cart', JSON.stringify(existingCart));
      
      const { result } = renderHook(() => useCart(), { wrapper });
      
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].package_id).toBe('pkg-1');
      expect(result.current.total).toBe(500);
    });
  });
});
