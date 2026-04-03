"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
MapPin,
Plus,
Check,
ChevronRight,
ArrowLeft,
Home,
Briefcase,
LocateFixed,
Package,
Loader2,
Banknote,
CreditCard,
Store,
IndianRupee,
AlertCircle,
CheckCircle2,
ShoppingBag,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG } from "@/lib/api-config";
import type { Address } from "@/types/api-types";

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentMethod = "cod" | "online";
type Step = "address" | "payment" | "review";

interface NewAddressForm {
addressLine1: string;
addressLine2: string;
city: string;
state: string;
pincode: string;
label: "home" | "work" | "other";
latitude: string;
longitude: string;
isDefault: boolean;
}

const EMPTY_FORM: NewAddressForm = {
addressLine1: "",
addressLine2: "",
city: "",
state: "",
pincode: "",
label: "home",
latitude: "",
longitude: "",
isDefault: false,
};

const STEPS: { id: Step; label: string }[] = [
{ id: "address", label: "Delivery Address" },
{ id: "payment", label: "Payment" },
{ id: "review", label: "Review & Place" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
const router = useRouter();
const { items, storeId, storeName, subtotal, totalItems, clearCart } = useCart();

// Step control
const [step, setStep] = useState<Step>("address");

// Addresses
const [addresses, setAddresses] = useState<Address[]>([]);
const [addrLoading, setAddrLoading] = useState(true);
const [selectedAddressId, setSelectedAddressId] = useState<string>("");
const [showAddForm, setShowAddForm] = useState(false);
const [form, setForm] = useState<NewAddressForm>(EMPTY_FORM);
const [formErrors, setFormErrors] = useState<Partial<NewAddressForm>>({});
const [savingAddr, setSavingAddr] = useState(false);
const [locating, setLocating] = useState(false);

// Payment
const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

// Order placement
const [placing, setPlacing] = useState(false);
const [orderError, setOrderError] = useState<string | null>(null);
const [orderId, setOrderId] = useState<string | null>(null);

// Pricing
const deliveryFee = subtotal >= 500 ? 0 : 40;
const tax = subtotal * 0.05;
const total = subtotal + deliveryFee + tax;

// ── Load addresses ────────────────────────────────────────────────────────
useEffect(() => {
setAddrLoading(true);
apiClient
.get<any>(API_CONFIG.API.PATIENT.ADDRESSES)
.then((res) => {
const list: Address[] = res.data?.addresses ?? [];
setAddresses(list);
const def = list.find((a) => a.isDefault) ?? list[0];
if (def?._id) setSelectedAddressId(def._id);
})
.catch(() => setAddresses([]))
.finally(() => setAddrLoading(false));
}, []);

// ── Geolocation ───────────────────────────────────────────────────────────
const getLocation = useCallback(() => {
if (!navigator.geolocation) {
alert("Geolocation is not supported by your browser");
return;
}
setLocating(true);
navigator.geolocation.getCurrentPosition(
(pos) => {
setForm((f) => ({
...f,
latitude: pos.coords.latitude.toFixed(6),
longitude: pos.coords.longitude.toFixed(6),
}));
setLocating(false);
},
() => {
alert("Unable to retrieve location. Please enter coordinates manually or use 0,0");
setLocating(false);
}
);
}, []);

// ── Form validation ───────────────────────────────────────────────────────
const validateForm = (): boolean => {
const errors: Partial<NewAddressForm> = {};
if (!form.addressLine1.trim()) errors.addressLine1 = "Required";
if (!form.city.trim()) errors.city = "Required";
if (!form.state.trim()) errors.state = "Required";
if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode.trim()))
errors.pincode = "Enter a valid 6-digit pincode";
if (!form.latitude || isNaN(Number(form.latitude)))
errors.latitude = "Required — use location button";
if (!form.longitude || isNaN(Number(form.longitude)))
errors.longitude = "Required — use location button";
setFormErrors(errors);
return Object.keys(errors).length === 0;
};

// ── Save new address ──────────────────────────────────────────────────────
const saveAddress = async () => {
if (!validateForm()) return;
setSavingAddr(true);
try {
const res = await apiClient.post<any>(API_CONFIG.API.PATIENT.ADDRESSES, {
addressLine1: form.addressLine1.trim(),
addressLine2: form.addressLine2.trim(),
city: form.city.trim(),
state: form.state.trim(),
pincode: form.pincode.trim(),
label: form.label,
latitude: Number(form.latitude),
longitude: Number(form.longitude),
isDefault: form.isDefault,
});
const saved: Address = res.data?.address;
if (saved?._id) {
setAddresses((prev) => [...prev, saved]);
setSelectedAddressId(saved._id!);
}
setShowAddForm(false);
setForm(EMPTY_FORM);
setFormErrors({});
} catch (err: any) {
alert(err?.message ?? "Could not save address");
} finally {
setSavingAddr(false);
}
};

// ── Place order ───────────────────────────────────────────────────────────
const placeOrder = async () => {
if (!selectedAddressId) {
setOrderError("Please select a delivery address.");
return;
}
if (!storeId) {
setOrderError("Cart has no store info. Please re-add items from a store.");
return;
}
if (items.length === 0) {
setOrderError("Your cart is empty.");
return;
}
setPlacing(true);
setOrderError(null);
try {
const res = await apiClient.post<any>(API_CONFIG.API.ORDER.CREATE, {
vendorId: storeId,
deliveryAddressId: selectedAddressId,
paymentMethod,
fallbackRadius: 10,
items: items.map((ci) => ({
  inventoryId: ci.inventoryId?.startsWith("__unmatched__") ? undefined : ci.inventoryId,
  medicineId: ci.medicineId || undefined,
  medicineName: ci.medicineName,
  genericName: ci.genericName || undefined,
  quantity: ci.quantity,
  unitPrice: ci.vendorPrice,
  mrp: ci.mrp,
})),
});
const createdOrderId: string = res.data?.order?._id ?? res.data?.orderId ?? "";
setOrderId(createdOrderId);
clearCart();
} catch (err: any) {
setOrderError(err?.response?.data?.message ?? err?.message ?? "Failed to place order. Try again.");
} finally {
setPlacing(false);
}
};

// ── Redirect if cart empty (guard) ────────────────────────────────────────
if (!orderId && totalItems === 0) {
return (
<div className="text-center py-20">
<ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
<h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
<Link href="/user/nearby-stores">
<Button className="mt-4">
<Store className="w-4 h-4 mr-2" /> Find Medicines
</Button>
</Link>
</div>
);
}

// ── Order success screen ──────────────────────────────────────────────────
if (orderId) {
return (
<div className="max-w-lg mx-auto text-center py-16">
<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
<CheckCircle2 className="w-10 h-10 text-green-600" />
</div>
<h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
<p className="text-gray-600 mb-1">
Your order has been placed successfully.
</p>
<p className="text-sm text-gray-400 mb-8">Order ID: <span className="font-mono">{orderId}</span></p>
<div className="flex gap-3 justify-center">
<Link href={`/user/order/${orderId}`}>
<Button variant="outline">
<Package className="w-4 h-4 mr-2" /> Track Order
</Button>
</Link>
<Link href="/user/dashboard">
<Button>Go to Dashboard</Button>
</Link>
</div>
</div>
);
}

const selectedAddress = addresses.find((a) => a._id === selectedAddressId);

return (
<div className="space-y-6 max-w-4xl mx-auto">
{/* Header */}
<div className="flex items-center gap-3">
<Link href="/user/order/cart">
<Button variant="ghost" size="icon">
<ArrowLeft className="w-5 h-5" />
</Button>
</Link>
<div>
<h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
<p className="text-sm text-gray-500">
{totalItems} items · {storeName}
</p>
</div>
</div>

{/* Step Indicators */}
<div className="flex gap-2 bg-white rounded-md border border-gray-200 p-4">
{STEPS.map((s, idx) => {
const stepOrder = STEPS.findIndex((x) => x.id === step);
const isActive = s.id === step;
const isDone = STEPS.findIndex((x) => x.id === s.id) < stepOrder;
return (
<div key={s.id} className="flex-1 flex items-center gap-2">
<div
className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
isDone
? "bg-green-500 text-white"
: isActive
? "bg-primary text-primary-foreground"
: "bg-gray-100 text-gray-400"
}`}
>
{isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
</div>
<span
className={`text-sm font-medium whitespace-nowrap ${
isActive ? "text-primary" : isDone ? "text-green-600" : "text-gray-400"
}`}
>
{s.label}
</span>
{idx < STEPS.length - 1 && (
<ChevronRight className="w-4 h-4 text-gray-300 ml-auto shrink-0" />
)}
</div>
);
})}
</div>

<div className="grid lg:grid-cols-3 gap-6">
{/* Left — Step Content */}
<div className="lg:col-span-2 space-y-4">
{/* ── STEP 1: ADDRESS ─────────────────────────────────── */}
{step === "address" && (
<>
<Card>
<CardHeader>
<CardTitle className="text-base flex items-center gap-2">
<MapPin className="w-5 h-5 text-primary" />
Delivery Address
</CardTitle>
</CardHeader>
<CardContent className="space-y-3">
{addrLoading ? (
<div className="flex items-center gap-3 py-6 text-muted-foreground">
<Loader2 className="w-5 h-5 animate-spin" />
Loading saved addresses…
</div>
) : addresses.length === 0 && !showAddForm ? (
<div className="text-center py-8">
<MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
<p className="text-gray-500 mb-4">No saved addresses</p>
<Button onClick={() => setShowAddForm(true)}>
<Plus className="w-4 h-4 mr-2" /> Add Address
</Button>
</div>
) : (
addresses.map((addr) => (
<div
key={addr._id}
onClick={() => setSelectedAddressId(addr._id!)}
className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
selectedAddressId === addr._id
? "border-primary bg-primary/5"
: "border-gray-200 hover:border-primary/40"
}`}
>
<div className="flex items-start gap-3">
<div className={`mt-0.5 ${selectedAddressId === addr._id ? "text-primary" : "text-gray-400"}`}>
{addr.label === "home" ? (
<Home className="w-5 h-5" />
) : addr.label === "work" ? (
<Briefcase className="w-5 h-5" />
) : (
<MapPin className="w-5 h-5" />
)}
</div>
<div className="flex-1">
<div className="flex items-center gap-2 mb-1">
<span className="font-semibold capitalize">{addr.label}</span>
{addr.isDefault && (
<Badge className="text-xs bg-teal-100 text-teal-700 border-teal-200">
Default
</Badge>
)}
{selectedAddressId === addr._id && (
<div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
<Check className="w-3 h-3 text-white" />
</div>
)}
</div>
<p className="text-sm text-gray-700">{addr.addressLine1}</p>
{addr.addressLine2 && (
<p className="text-sm text-gray-500">{addr.addressLine2}</p>
)}
<p className="text-sm text-gray-500">
{addr.city}, {addr.state} — {addr.pincode}
</p>
</div>
</div>
</div>
))
)}

{!showAddForm && !addrLoading && (
<Button
variant="outline"
className="w-full"
onClick={() => setShowAddForm(true)}
>
<Plus className="w-4 h-4 mr-2" /> Add New Address
</Button>
)}
</CardContent>
</Card>

{/* New Address Form */}
{showAddForm && (
<Card>
<CardHeader>
<CardTitle className="text-base">New Delivery Address</CardTitle>
</CardHeader>
<CardContent className="space-y-4">
{/* Label */}
<div>
<label className="block text-sm font-medium mb-1.5">Address Type</label>
<div className="flex gap-2">
{(["home", "work", "other"] as const).map((l) => (
<button
key={l}
type="button"
onClick={() => setForm((f) => ({ ...f, label: l }))}
className={`flex-1 py-1.5 rounded-lg border text-sm font-medium capitalize transition-all ${
form.label === l
? "border-primary bg-primary text-primary-foreground"
: "border-gray-200 text-gray-600 hover:border-primary/50"
}`}
>
{l}
</button>
))}
</div>
</div>

{/* Address Line 1 */}
<div>
<label className="block text-sm font-medium mb-1">
House / Flat / Building *
</label>
<Input
placeholder="e.g. 12B, Rose Tower"
value={form.addressLine1}
onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
className={formErrors.addressLine1 ? "border-red-400" : ""}
/>
{formErrors.addressLine1 && (
<p className="text-xs text-red-500 mt-1">{formErrors.addressLine1}</p>
)}
</div>

{/* Address Line 2 */}
<div>
<label className="block text-sm font-medium mb-1">
Street / Landmark (optional)
</label>
<Input
placeholder="e.g. Near City Park"
value={form.addressLine2}
onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
/>
</div>

{/* City + State */}
<div className="grid grid-cols-2 gap-3">
<div>
<label className="block text-sm font-medium mb-1">City *</label>
<Input
placeholder="Mumbai"
value={form.city}
onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
className={formErrors.city ? "border-red-400" : ""}
/>
{formErrors.city && (
<p className="text-xs text-red-500 mt-1">{formErrors.city}</p>
)}
</div>
<div>
<label className="block text-sm font-medium mb-1">State *</label>
<Input
placeholder="Maharashtra"
value={form.state}
onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
className={formErrors.state ? "border-red-400" : ""}
/>
{formErrors.state && (
<p className="text-xs text-red-500 mt-1">{formErrors.state}</p>
)}
</div>
</div>

{/* Pincode */}
<div>
<label className="block text-sm font-medium mb-1">Pincode *</label>
<Input
placeholder="400001"
maxLength={6}
value={form.pincode}
onChange={(e) =>
setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/, "") }))
}
className={formErrors.pincode ? "border-red-400" : ""}
/>
{formErrors.pincode && (
<p className="text-xs text-red-500 mt-1">{formErrors.pincode}</p>
)}
</div>

{/* Location */}
<div>
<label className="block text-sm font-medium mb-1">
Location Coordinates *
</label>
<div className="flex gap-2">
<Input
placeholder="Latitude"
value={form.latitude}
onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
className={`flex-1 ${formErrors.latitude ? "border-red-400" : ""}`}
/>
<Input
placeholder="Longitude"
value={form.longitude}
onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
className={`flex-1 ${formErrors.longitude ? "border-red-400" : ""}`}
/>
<Button
type="button"
variant="outline"
onClick={getLocation}
disabled={locating}
className="shrink-0"
>
{locating ? (
<Loader2 className="w-4 h-4 animate-spin" />
) : (
<LocateFixed className="w-4 h-4" />
)}
</Button>
</div>
<p className="text-xs text-gray-400 mt-1">
Click the locate button to auto-fill from your device
</p>
{(formErrors.latitude || formErrors.longitude) && (
<p className="text-xs text-red-500 mt-1">Coordinates are required</p>
)}
</div>

{/* Default */}
<label className="flex items-center gap-2 cursor-pointer">
<input
type="checkbox"
checked={form.isDefault}
onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
className="w-4 h-4 accent-primary"
/>
<span className="text-sm">Set as default address</span>
</label>

<div className="flex gap-2 pt-2">
<Button
className="flex-1"
onClick={saveAddress}
disabled={savingAddr}
>
{savingAddr ? (
<Loader2 className="w-4 h-4 mr-2 animate-spin" />
) : (
<Plus className="w-4 h-4 mr-2" />
)}
Save Address
</Button>
<Button
variant="outline"
onClick={() => {
setShowAddForm(false);
setForm(EMPTY_FORM);
setFormErrors({});
}}
>
Cancel
</Button>
</div>
</CardContent>
</Card>
)}

<Button
className="w-full"
size="lg"
disabled={!selectedAddressId}
onClick={() => setStep("payment")}
>
Continue to Payment
<ChevronRight className="w-5 h-5 ml-1" />
</Button>
</>
)}

{/* ── STEP 2: PAYMENT ─────────────────────────────────── */}
{step === "payment" && (
<>
<Card>
<CardHeader>
<CardTitle className="text-base flex items-center gap-2">
<CreditCard className="w-5 h-5 text-primary" />
Payment Method
</CardTitle>
</CardHeader>
<CardContent className="space-y-3">
{/* COD */}
<div
onClick={() => setPaymentMethod("cod")}
className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
paymentMethod === "cod"
? "border-primary bg-primary/5"
: "border-gray-200 hover:border-primary/40"
}`}
>
<div className="flex items-center gap-3">
<Banknote
className={`w-6 h-6 ${
paymentMethod === "cod" ? "text-primary" : "text-gray-400"
}`}
/>
<div className="flex-1">
<p className="font-semibold">Cash on Delivery</p>
<p className="text-sm text-gray-500">Pay in cash when your order arrives</p>
</div>
{paymentMethod === "cod" && (
<div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
<Check className="w-3 h-3 text-white" />
</div>
)}
</div>
</div>

{/* Online */}
<div
onClick={() => setPaymentMethod("online")}
className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
paymentMethod === "online"
? "border-primary bg-primary/5"
: "border-gray-200 hover:border-primary/40"
}`}
>
<div className="flex items-center gap-3">
<CreditCard
className={`w-6 h-6 ${
paymentMethod === "online" ? "text-primary" : "text-gray-400"
}`}
/>
<div className="flex-1">
<p className="font-semibold">Online Payment</p>
<p className="text-sm text-gray-500">Pay via UPI, card, or net banking</p>
</div>
{paymentMethod === "online" && (
<div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
<Check className="w-3 h-3 text-white" />
</div>
)}
</div>
</div>
</CardContent>
</Card>

<div className="flex gap-2">
<Button variant="outline" onClick={() => setStep("address")} className="flex-1">
<ArrowLeft className="w-4 h-4 mr-1" /> Back
</Button>
<Button className="flex-1" size="lg" onClick={() => setStep("review")}>
Review Order
<ChevronRight className="w-5 h-5 ml-1" />
</Button>
</div>
</>
)}

{/* ── STEP 3: REVIEW ──────────────────────────────────── */}
{step === "review" && (
<>
{/* Address Summary */}
<Card>
<CardContent className="p-4">
<div className="flex items-start gap-3">
<MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
<div className="flex-1">
<p className="text-sm font-semibold text-gray-500 mb-0.5">Delivering to</p>
{selectedAddress ? (
<>
<p className="font-medium capitalize">{selectedAddress.label}</p>
<p className="text-sm text-gray-600">
{selectedAddress.addressLine1}
{selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ""}
</p>
<p className="text-sm text-gray-500">
{selectedAddress.city}, {selectedAddress.state} — {selectedAddress.pincode}
</p>
</>
) : (
<p className="text-sm text-red-500">Address not found</p>
)}
</div>
<Button
variant="ghost"
size="sm"
className="text-primary shrink-0"
onClick={() => setStep("address")}
>
Change
</Button>
</div>
</CardContent>
</Card>

{/* Payment Summary */}
<Card>
<CardContent className="p-4 flex items-center gap-3">
{paymentMethod === "cod" ? (
<Banknote className="w-5 h-5 text-primary shrink-0" />
) : (
<CreditCard className="w-5 h-5 text-primary shrink-0" />
)}
<div className="flex-1">
<p className="text-sm font-semibold text-gray-500">Payment</p>
<p className="font-medium">
{paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
</p>
</div>
<Button
variant="ghost"
size="sm"
className="text-primary"
onClick={() => setStep("payment")}
>
Change
</Button>
</CardContent>
</Card>

{/* Items Summary */}
<Card>
<CardHeader>
<CardTitle className="text-sm text-gray-500 font-medium">
Order Items ({totalItems})
</CardTitle>
</CardHeader>
<CardContent className="space-y-3 pt-0">
{items.map((item) => (
<div key={item.inventoryId} className="flex items-center gap-3">
<div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
<Package className="w-5 h-5 text-gray-400" />
</div>
<div className="flex-1 min-w-0">
<p className="font-medium text-sm truncate">{item.medicineName}</p>
<p className="text-xs text-gray-500">{item.genericName}</p>
</div>
<div className="text-right shrink-0">
<p className="text-sm font-semibold">
₹{(item.vendorPrice * item.quantity).toFixed(0)}
</p>
<p className="text-xs text-gray-400">×{item.quantity}</p>
</div>
</div>
))}
</CardContent>
</Card>

{/* Error */}
{orderError && (
<div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-md p-4">
<AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
<p className="text-sm text-red-800">{orderError}</p>
</div>
)}

<div className="flex gap-2">
<Button variant="outline" onClick={() => setStep("payment")} className="flex-1">
<ArrowLeft className="w-4 h-4 mr-1" /> Back
</Button>
<Button
className="flex-1"
size="lg"
onClick={placeOrder}
disabled={placing}
>
{placing ? (
<Loader2 className="w-5 h-5 mr-2 animate-spin" />
) : (
<IndianRupee className="w-4 h-4 mr-1" />
)}
{placing ? "Placing Order…" : `Place Order · ₹${total.toFixed(0)}`}
</Button>
</div>
</>
)}
</div>

{/* Right — Order summary (sticky) */}
<div className="lg:col-span-1">
<div className="bg-white rounded-md border border-gray-200 p-5 sticky top-6">
<h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
<Store className="w-4 h-4 text-primary" /> {storeName ?? "Your Order"}
</h2>

<div className="space-y-2 mb-4 text-sm">
{items.map((item) => (
<div key={item.inventoryId} className="flex justify-between text-gray-700">
<span className="truncate mr-2">
{item.medicineName} ×{item.quantity}
</span>
<span className="font-medium shrink-0">
₹{(item.vendorPrice * item.quantity).toFixed(0)}
</span>
</div>
))}
</div>

<div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
<div className="flex justify-between text-gray-600">
<span>Subtotal</span>
<span>₹{subtotal.toFixed(2)}</span>
</div>
<div className="flex justify-between text-gray-600">
<span>Delivery</span>
{deliveryFee === 0 ? (
<span className="text-green-600">FREE</span>
) : (
<span>₹{deliveryFee.toFixed(2)}</span>
)}
</div>
<div className="flex justify-between text-gray-600">
<span>GST (5%)</span>
<span>₹{tax.toFixed(2)}</span>
</div>
<div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
<span>Total</span>
<span className="text-teal-600">₹{total.toFixed(2)}</span>
</div>
</div>
</div>
</div>
</div>
</div>
);
}
