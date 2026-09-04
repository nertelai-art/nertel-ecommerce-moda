"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cartInputSchema, type CartInput } from "@/features/cart/cart-input";

type CartContextValue = {
  items: CartInput["items"];
  count: number;
  add: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  hydrated: boolean;
};
const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "moda.cart.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartInput["items"]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let active = true;
    let storedItems: CartInput["items"] = [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = cartInputSchema.safeParse(JSON.parse(stored));
        if (parsed.success) storedItems = parsed.data.items;
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
    queueMicrotask(() => {
      if (!active) return;
      setItems(storedItems);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (items.length)
      localStorage.setItem(storageKey, JSON.stringify({ items }));
    else localStorage.removeItem(storageKey);
  }, [hydrated, items]);
  const add = useCallback(
    (variantId: string) =>
      setItems((current) => {
        const found = current.find((item) => item.variantId === variantId);
        return found
          ? current.map((item) =>
              item.variantId === variantId
                ? { ...item, quantity: Math.min(99, item.quantity + 1) }
                : item,
            )
          : [...current, { variantId, quantity: 1 }];
      }),
    [],
  );
  const setQuantity = useCallback(
    (variantId: string, quantity: number) =>
      setItems((current) =>
        quantity < 1
          ? current.filter((item) => item.variantId !== variantId)
          : current.map((item) =>
              item.variantId === variantId
                ? { ...item, quantity: Math.min(99, Math.trunc(quantity)) }
                : item,
            ),
      ),
    [],
  );
  const remove = useCallback(
    (variantId: string) =>
      setItems((current) =>
        current.filter((item) => item.variantId !== variantId),
      ),
    [],
  );
  const clear = useCallback(() => setItems([]), []);
  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      hydrated,
    }),
    [items, add, setQuantity, remove, clear, hydrated],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
