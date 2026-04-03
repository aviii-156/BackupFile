"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CartItem {
  inventoryId: string;   // VendorInventory._id
  medicineId: string;    // Medicine._id — required by order creation API
  storeId: string;
  storeName: string;
  medicineName: string;
  genericName: string;
  vendorPrice: number;
  mrp: number;
  discount: number;
  quantity: number;
  unit: string;
  category?: string;
  form?: string;
  manufacturer?: string;
  maxStock: number;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  storeId: string | null;
  storeName: string | null;
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (inventoryId: string) => void;
  updateQuantity: (inventoryId: string, quantity: number) => void;
  clearCart: () => void;
  getQuantity: (inventoryId: string) => number;
}

const CART_KEY = "quickmedi_cart";

// ─── Context ──────────────────────────────────────────────────────────────────
const CartContext = createContext<CartContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const storeId   = items.length > 0 ? items[0].storeId   : null;
  const storeName = items.length > 0 ? items[0].storeName : null;

  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      // Enforce single-store cart
      setItems((prev) => {
        if (prev.length > 0 && prev[0].storeId !== item.storeId) {
          if (
            !window.confirm(
              `Your cart has items from "${prev[0].storeName}". Clear cart and start fresh from "${item.storeName}"?`
            )
          )
            return prev;
          // Clear and start fresh
          return [{ ...item, quantity: 1 }];
        }

        const existing = prev.find((i) => i.inventoryId === item.inventoryId);
        if (existing) {
          return prev.map((i) =>
            i.inventoryId === item.inventoryId
              ? { ...i, quantity: Math.min(i.quantity + 1, i.maxStock) }
              : i
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    },
    []
  );

  const removeFromCart = useCallback((inventoryId: string) => {
    setItems((prev) => prev.filter((i) => i.inventoryId !== inventoryId));
  }, []);

  const updateQuantity = useCallback((inventoryId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.inventoryId !== inventoryId));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.inventoryId === inventoryId
            ? { ...i, quantity: Math.min(quantity, i.maxStock) }
            : i
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const getQuantity = useCallback(
    (inventoryId: string) =>
      items.find((i) => i.inventoryId === inventoryId)?.quantity ?? 0,
    [items]
  );

  const subtotal = items.reduce(
    (acc, item) => acc + item.vendorPrice * item.quantity,
    0
  );

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        storeId,
        storeName,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

// Safe version — returns zeros when outside provider (used in Navbar)
const CART_DEFAULTS: CartContextValue = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  storeId: null,
  storeName: null,
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getQuantity: () => 0,
};

export function useCartSafe(): CartContextValue {
  return useContext(CartContext) ?? CART_DEFAULTS;
}
