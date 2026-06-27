import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import type { TravelPackage } from "@/types";
import { useLocalStorage } from "@/hooks/useDebounce";

export interface CartItem {
  package_id: string;
  title: string;
  price: number;
  currency: string;
  region: string;
  url_thumbnail_storage: string;
  tenant_id: string;
}

interface CartState {
  items: CartItem[];
  addItem: (pkg: TravelPackage) => void;
  removeItem: (packageId: string) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLocalStorage<CartItem[]>("lpav_cart", []);

  const addItem = useCallback(
    (pkg: TravelPackage) => {
      setItems((prev) => {
        if (prev.some((i) => i.package_id === pkg.package_id)) return prev;
        return [
          ...prev,
          {
            package_id: pkg.package_id,
            title: pkg.title,
            price: pkg.price,
            currency: pkg.currency,
            region: pkg.region,
            url_thumbnail_storage: pkg.url_thumbnail_storage,
            tenant_id: pkg.tenant_id,
          },
        ];
      });
    },
    [setItems],
  );

  const removeItem = useCallback(
    (packageId: string) => {
      setItems((prev) => prev.filter((i) => i.package_id !== packageId));
    },
    [setItems],
  );

  const clearCart = useCallback(() => setItems([]), [setItems]);

  const itemCount = items.length;
  const total = items.reduce((sum, i) => sum + i.price, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, clearCart, itemCount, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
