"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Store,
  Pill,
  MapPin,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useMedicineCart } from "@/context/MedicineCartContext";

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    totalItems,
    storeName,
  } = useCart();

  const {
    items: wishlist,
    totalItems: wishlistTotal,
    updateWishlistQuantity,
    removeFromWishlist,
    clearWishlist,
  } = useMedicineCart();

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const applyCoupon = () => {
    const upper = couponCode.toUpperCase();
    if (upper === "SAVE10") {
      setCouponApplied(true);
      setCouponDiscount(subtotal * 0.1);
    } else if (upper === "SAVE20") {
      setCouponApplied(true);
      setCouponDiscount(subtotal * 0.2);
    } else {
      alert("Invalid coupon code");
    }
  };

  const removeCoupon = () => {
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode("");
  };

  const savedAmount = items.reduce(
    (sum, item) =>
      sum + Math.max(0, item.mrp - item.vendorPrice) * item.quantity,
    0,
  );
  const deliveryFee = subtotal >= 500 ? 0 : 40;
  const tax = (subtotal - couponDiscount) * 0.05;
  const total = subtotal - couponDiscount + deliveryFee + tax;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Shopping Cart
          </h1>
          <p className="text-gray-600">
            {totalItems} {totalItems === 1 ? "item" : "items"} in cart
            {wishlistTotal > 0 && (
              <span className="ml-2 text-orange-600 font-medium">
                · {wishlistTotal} in medicine cart
              </span>
            )}
            {storeName && (
              <span className="ml-2 text-sm text-teal-600 inline-flex items-center gap-1">
                <Store className="w-3.5 h-3.5" /> {storeName}
              </span>
            )}
          </p>
        </div>
        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => {
              if (window.confirm("Clear all items from cart?")) clearCart();
            }}
          >
            Clear Cart
          </Button>
        )}
      </div>

      {items.length === 0 && wishlist.length === 0 ? (
        <div className="bg-white rounded-md p-12 border border-gray-200 text-center">
          <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Your cart is empty
          </h3>
          <p className="text-gray-600 mb-6">
            Browse medicines or nearby stores to get started
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/user/medicines">
              <Button>
                <Pill className="w-4 h-4 mr-2" />
                Browse Medicines
              </Button>
            </Link>
            <Link href="/user/nearby-stores">
              <Button variant="outline">
                <Store className="w-4 h-4 mr-2" />
                Nearby Stores
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Items List */}
            <div className="bg-white rounded-md border border-gray-200 divide-y divide-gray-200">
              {items.map((item) => (
                <div
                  key={item.inventoryId}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 border border-gray-200">
                      <Package className="w-7 h-7 text-gray-400" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 leading-tight">
                            {item.medicineName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {item.genericName}
                            {item.manufacturer ? ` · ${item.manufacturer}` : ""}
                            {item.form ? ` · ${item.form}` : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.inventoryId)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {item.discount > 0 && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            {item.discount}% OFF
                          </Badge>
                        )}
                        {item.category && (
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Qty Controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                item.inventoryId,
                                item.quantity - 1,
                              )
                            }
                            disabled={item.quantity <= 1}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <span className="w-10 text-center font-semibold text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                item.inventoryId,
                                item.quantity + 1,
                              )
                            }
                            disabled={item.quantity >= item.maxStock}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            ₹{(item.vendorPrice * item.quantity).toFixed(0)}
                          </p>
                          {item.mrp > item.vendorPrice && (
                            <p className="text-xs text-gray-400 line-through">
                              ₹{(item.mrp * item.quantity).toFixed(0)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Continue Shopping */}
            <div className="flex gap-2 flex-wrap">
              <Link href="/user/nearby-stores" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Store className="w-4 h-4 mr-2" />
                  Add More from Store
                </Button>
              </Link>
              <Link href="/user/medicines" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Pill className="w-4 h-4 mr-2" />
                  Browse Medicines
                </Button>
              </Link>
            </div>

            {/* Medicine Wishlist Section */}
            {wishlist.length > 0 && (
              <div className="bg-white rounded-md border border-orange-200 overflow-hidden">
                <div className="px-4 py-3 bg-orange-50 border-b border-orange-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-orange-600" />
                    <span className="font-semibold text-orange-900 text-sm">
                      Medicines Cart ({wishlistTotal} item{wishlistTotal > 1 ? "s" : ""})
                    </span>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                      Store not selected yet
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                    onClick={() => { if (window.confirm("Clear medicine cart?")) clearWishlist(); }}
                  >
                    Clear
                  </Button>
                </div>

                <div className="divide-y divide-gray-100">
                  {wishlist.map((w) => (
                    <div key={w.id} className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                        <Pill className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{w.medicineName}</p>
                        <p className="text-xs text-gray-400 truncate">{w.genericName}</p>
                        <p className="text-xs font-medium text-gray-700 mt-0.5">₹{w.mrp.toFixed(0)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateWishlistQuantity(w.id, w.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-semibold w-6 text-center">{w.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateWishlistQuantity(w.id, w.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeFromWishlist(w.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-orange-50 border-t border-orange-100">
                  <Link href="/user/medicines/select-store">
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2">
                      <MapPin className="w-4 h-4" />
                      Find Stores for These Medicines
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <p className="text-xs text-center text-orange-600 mt-2">
                    Choose a store near you — we&apos;ll match available medicines automatically
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-md border border-gray-200 p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between text-gray-700">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                {savedAmount > 0 && (
                  <div className="flex items-center justify-between text-green-600">
                    <span>You save</span>
                    <span className="font-medium">
                      -₹{savedAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {couponApplied && (
                  <div className="flex items-center justify-between text-green-600">
                    <span>Coupon ({couponCode})</span>
                    <span className="font-medium">
                      -₹{couponDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-gray-700">
                  <span>Delivery Fee</span>
                  {deliveryFee === 0 ? (
                    <span className="font-medium text-green-600">FREE</span>
                  ) : (
                    <span className="font-medium">
                      ₹{deliveryFee.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-gray-700">
                  <span>GST (5%)</span>
                  <span className="font-medium">₹{tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-lg font-bold mb-6">
                <span>Total</span>
                <span className="text-2xl text-teal-600">
                  ₹{total.toFixed(2)}
                </span>
              </div>

              {/* Coupon */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code
                </label>
                {couponApplied ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        {couponCode} applied!
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeCoupon}
                      className="text-red-600 hover:text-red-700 h-auto p-1 text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={applyCoupon}
                      disabled={!couponCode}
                    >
                      Apply
                    </Button>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1.5">
                  Try: <strong>SAVE10</strong> or <strong>SAVE20</strong>
                </p>
              </div>

              {items.length > 0 ? (
                <Link href="/user/order/checkout">
                  <Button className="w-full" size="lg">
                    Proceed to Checkout
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-3">
                    Select a store for your medicines first
                  </p>
                  <Link href="/user/medicines/select-store">
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="lg">
                      Find Stores
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
