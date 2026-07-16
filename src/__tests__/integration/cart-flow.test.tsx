import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider, useCart } from '@/context/CartContext';
import type { TravelPackage } from '@/types';

describe('Cart Flow Integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const createMockPackage = (overrides: Partial<TravelPackage> = {}): TravelPackage => ({
    package_id: 'pkg-1',
    title: 'Test Package',
    price: 100,
    currency: 'MXN',
    region: 'Test Region',
    url_flyer_storage: 'https://example.com/flyer.jpg',
    url_thumbnail_storage: 'https://example.com/image.jpg',
    has_coordinator: false,
    publication_status: 'published',
    departure_date: '2026-12-01',
    created_at: '2026-01-01',
    tenant_id: 'tenant-1',
    ...overrides,
  });

  const TestComponent = () => {
    const { items, addItem, removeItem, clearCart, itemCount, total } = useCart();
    
    return (
      <div>
        <div data-testid="item-count">{itemCount}</div>
        <div data-testid="total">{total}</div>
        <div data-testid="items">{JSON.stringify(items)}</div>
        <button
          data-testid="add-btn"
          onClick={() => addItem(createMockPackage({ package_id: 'pkg-1', price: 100 }))}
        >
          Add Item
        </button>
        <button
          data-testid="add-btn-2"
          onClick={() => addItem(createMockPackage({ package_id: 'pkg-2', price: 200 }))}
        >
          Add Item 2
        </button>
        <button data-testid="remove-btn" onClick={() => removeItem('pkg-1')}>
          Remove Item
        </button>
        <button data-testid="clear-btn" onClick={clearCart}>
          Clear Cart
        </button>
      </div>
    );
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  describe('Complete Cart Flow', () => {
    it('adds items to cart and calculates total', async () => {
      const user = userEvent.setup();
      
      render(<TestComponent />, { wrapper });
      
      expect(screen.getByTestId('item-count')).toHaveTextContent('0');
      expect(screen.getByTestId('total')).toHaveTextContent('0');
      
      await user.click(screen.getByTestId('add-btn'));
      expect(screen.getByTestId('item-count')).toHaveTextContent('1');
      expect(screen.getByTestId('total')).toHaveTextContent('100');
      
      await user.click(screen.getByTestId('add-btn-2'));
      expect(screen.getByTestId('item-count')).toHaveTextContent('2');
      expect(screen.getByTestId('total')).toHaveTextContent('300');
    });

    it('removes items from cart and updates total', async () => {
      const user = userEvent.setup();
      
      render(<TestComponent />, { wrapper });
      
      await user.click(screen.getByTestId('add-btn'));
      await user.click(screen.getByTestId('add-btn-2'));
      expect(screen.getByTestId('item-count')).toHaveTextContent('2');
      expect(screen.getByTestId('total')).toHaveTextContent('300');
      
      await user.click(screen.getByTestId('remove-btn'));
      expect(screen.getByTestId('item-count')).toHaveTextContent('1');
      expect(screen.getByTestId('total')).toHaveTextContent('200');
    });

    it('clears entire cart', async () => {
      const user = userEvent.setup();
      
      render(<TestComponent />, { wrapper });
      
      await user.click(screen.getByTestId('add-btn'));
      await user.click(screen.getByTestId('add-btn-2'));
      expect(screen.getByTestId('item-count')).toHaveTextContent('2');
      
      await user.click(screen.getByTestId('clear-btn'));
      expect(screen.getByTestId('item-count')).toHaveTextContent('0');
      expect(screen.getByTestId('total')).toHaveTextContent('0');
    });

    it('prevents duplicate items in cart', async () => {
      const user = userEvent.setup();
      
      render(<TestComponent />, { wrapper });
      
      await user.click(screen.getByTestId('add-btn'));
      await user.click(screen.getByTestId('add-btn'));
      await user.click(screen.getByTestId('add-btn'));
      
      expect(screen.getByTestId('item-count')).toHaveTextContent('1');
      expect(screen.getByTestId('total')).toHaveTextContent('100');
    });

    it('persists cart in localStorage', async () => {
      const user = userEvent.setup();
      
      render(<TestComponent />, { wrapper });
      
      await user.click(screen.getByTestId('add-btn'));
      await user.click(screen.getByTestId('add-btn-2'));
      
      const stored = window.localStorage.getItem('lpav_cart');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].package_id).toBe('pkg-1');
      expect(parsed[1].package_id).toBe('pkg-2');
    });

    it('loads cart from localStorage on mount', async () => {
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
      
      render(<TestComponent />, { wrapper });
      
      expect(screen.getByTestId('item-count')).toHaveTextContent('1');
      expect(screen.getByTestId('total')).toHaveTextContent('500');
    });

    it('handles rapid add/remove operations', async () => {
      const user = userEvent.setup();
      
      render(<TestComponent />, { wrapper });
      
      await user.click(screen.getByTestId('add-btn'));
      await user.click(screen.getByTestId('add-btn-2'));
      await user.click(screen.getByTestId('remove-btn'));
      await user.click(screen.getByTestId('add-btn'));
      
      expect(screen.getByTestId('item-count')).toHaveTextContent('2');
      expect(screen.getByTestId('total')).toHaveTextContent('300');
    });
  });

  describe('Cart State Management', () => {
    it('maintains correct state across multiple operations', async () => {
      const user = userEvent.setup();
      
      render(<TestComponent />, { wrapper });
      
      await user.click(screen.getByTestId('add-btn'));
      expect(screen.getByTestId('item-count')).toHaveTextContent('1');
      
      await user.click(screen.getByTestId('add-btn-2'));
      expect(screen.getByTestId('item-count')).toHaveTextContent('2');
      
      await user.click(screen.getByTestId('remove-btn'));
      expect(screen.getByTestId('item-count')).toHaveTextContent('1');
      
      await user.click(screen.getByTestId('clear-btn'));
      expect(screen.getByTestId('item-count')).toHaveTextContent('0');
      
      await user.click(screen.getByTestId('add-btn'));
      expect(screen.getByTestId('item-count')).toHaveTextContent('1');
    });

    it('updates items array correctly', async () => {
      const user = userEvent.setup();
      
      render(<TestComponent />, { wrapper });
      
      await user.click(screen.getByTestId('add-btn'));
      
      const itemsText = screen.getByTestId('items').textContent;
      const items = JSON.parse(itemsText!);
      
      expect(items).toHaveLength(1);
      expect(items[0].package_id).toBe('pkg-1');
      expect(items[0].price).toBe(100);
    });
  });
});
