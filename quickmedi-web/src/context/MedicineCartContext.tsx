"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A medicine in the "wishlist" pre-cart.
 * Medicines here do NOT yet have a vendor/store assigned.
 * Users proceed to the select-store page to match them to a vendor.
 */
export interface WishlistItem {
  /** Unique ID: inventoryId (vendor) || medicineId || slugified name */
  id: string;
  medicineName: string;
  genericName: string;
  quantity: number;
  mrp: number;
  unit: string;
  /** Where this item came from so we know how reliable the data is */
  source: "vendor" | "medicine" | "ai";
  isGeneric: boolean;
  /** Only set when source === "vendor" */
  inventoryId?: string;
  vendorId?: string;
  vendorPrice?: number;
  storeId?: string;
  storeName?: string;
  /** Medicine._id from mongodb medicine_db */
  medicineId?: string;
  /** Extras for display */
  manufacturer?: string;
  form?: string;
  category?: string;
  composition?: string;
  /** Max units available (from vendor) */
  maxStock?: number;
}

interface MedicineCartContextValue {
  items: WishlistItem[];
  totalItems: number;
  addToWishlist: (item: Omit<WishlistItem, "quantity">) => void;
  removeFromWishlist: (id: string) => void;
  updateWishlistQuantity: (id: string, quantity: number) => void;
  clearWishlist: () => void;
  getWishlistQuantity: (id: string) => number;
  isInWishlist: (id: string) => boolean;
}

const WISHLIST_KEY = "quickmedi_medicine_cart";

// ─── Context ──────────────────────────────────────────────────────────────────
const MedicineCartContext = createContext<MedicineCartContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function MedicineCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const addToWishlist = useCallback((item: Omit<WishlistItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                quantity: i.maxStock
                  ? Math.min(i.quantity + 1, i.maxStock)
                  : i.quantity + 1,
              }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeFromWishlist = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateWishlistQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                quantity: i.maxStock ? Math.min(quantity, i.maxStock) : quantity,
              }
            : i
        )
      );
    }
  }, []);

  const clearWishlist = useCallback(() => setItems([]), []);

  const getWishlistQuantity = useCallback(
    (id: string) => items.find((i) => i.id === id)?.quantity ?? 0,
    [items]
  );

  const isInWishlist = useCallback(
    (id: string) => items.some((i) => i.id === id),
    [items]
  );

  return (
    <MedicineCartContext.Provider
      value={{
        items,
        totalItems,
        addToWishlist,
        removeFromWishlist,
        updateWishlistQuantity,
        clearWishlist,
        getWishlistQuantity,
        isInWishlist,
      }}
    >
      {children}
    </MedicineCartContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useMedicineCart() {
  const ctx = useContext(MedicineCartContext);
  if (!ctx) throw new Error("useMedicineCart must be used inside MedicineCartProvider");
  return ctx;
}

const MEDICINE_CART_DEFAULTS: MedicineCartContextValue = {
  items: [],
  totalItems: 0,
  addToWishlist: () => {},
  removeFromWishlist: () => {},
  updateWishlistQuantity: () => {},
  clearWishlist: () => {},
  getWishlistQuantity: () => 0,
  isInWishlist: () => false,
};

export function useMedicineCartSafe(): MedicineCartContextValue {
  return useContext(MedicineCartContext) ?? MEDICINE_CART_DEFAULTS;
}
