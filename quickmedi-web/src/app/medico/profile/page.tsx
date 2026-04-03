"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Clock,
  Edit,
  Save,
  X,
  CheckCircle,
  ShieldCheck,
  Package,
  Truck,
  AlertCircle,
  FileText,
  Globe,
  Loader2,
  BadgeCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { vendorService } from "@/services/vendor.service";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type Day = typeof DAYS[number];

interface OperatingHours {
  open: string;
  close: string;
  isClosed: boolean;
}

interface VendorProfile {
  _id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  gstNumber?: string;
  approvalStatus: "pending" | "approved" | "rejected";
  approvalNote?: string;
  isActive: boolean;
  language: string;
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  location?: { coordinates: [number, number] };
  operatingHours: Record<Day, OperatingHours>;
  deliveryAvailable: boolean;
  deliveryRadius: number;
  minimumOrderAmount: number;
  deliveryCharge: number;
  acceptsEmergency: boolean;
  totalOrders?: number;
  totalRevenue?: number;
  averageRating?: number;
  totalRatings?: number;
}

type Section = "info" | "location" | "hours" | "delivery" | "emergency" | null;

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({
  title,
  icon: Icon,
  sectionKey,
  editingSection,
  saving,
  onEdit,
  onSave,
  onCancel,
  children,
}: {
  title: string;
  icon: any;
  sectionKey: Section;
  editingSection: Section;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const isEditing = editingSection === sectionKey;
  return (
    <div className="bg-white rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="h-7 px-3 text-xs gap-1">
              <X className="w-3 h-3" /> Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving} className="h-7 px-3 text-xs gap-1">
              {saving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</> : <><Save className="w-3 h-3" /> Save</>}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-3 text-xs gap-1"
            disabled={editingSection !== null}>
            <Edit className="w-3 h-3" /> Edit
          </Button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Field row (view / edit) ─────────────────────────────────────────────────
function Field({ label, value, isEditing, inputProps }: {
  label: string;
  value: string | number | undefined;
  isEditing: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {isEditing ? (
        <Input {...inputProps} />
      ) : (
        <p className="text-sm font-medium">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<Section>(null);
  const [editData, setEditData] = useState<Partial<VendorProfile>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await vendorService.getMyStore();
        if (res.success && res.data?.vendor) setVendor(res.data.vendor as VendorProfile);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    load();
  }, []);

  const startEdit = (section: Section) => {
    if (!vendor) return;
    setSaveError(null);
    setEditingSection(section);
    setEditData(JSON.parse(JSON.stringify(vendor)));
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditData({});
    setSaveError(null);
  };

  const saveSection = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await vendorService.updateStoreProfile(payload);
      if (res.success && res.data?.vendor) {
        setVendor(res.data.vendor as VendorProfile);
        cancelEdit();
      } else {
        setSaveError((res as any).message || "Failed to save. Please try again.");
      }
    } catch (e: any) {
      setSaveError(e.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const patchEdit = (path: string, value: unknown) => {
    setEditData((prev) => {
      const next = { ...prev } as Record<string, unknown>;
      const keys = path.split(".");
      let cur = next as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...(cur[keys[i]] as object) };
        cur = cur[keys[i]] as Record<string, unknown>;
      }
      cur[keys[keys.length - 1]] = value;
      return next as Partial<VendorProfile>;
    });
  };

  const patchHours = (day: Day, field: keyof OperatingHours, value: string | boolean) => {
    setEditData((prev) => ({
      ...prev,
      operatingHours: {
        ...(prev.operatingHours as Record<Day, OperatingHours>),
        [day]: {
          ...((prev.operatingHours as Record<Day, OperatingHours>)?.[day] || {}),
          [field]: value,
        },
      } as Record<Day, OperatingHours>,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h3 className="text-base font-semibold mb-1">Could not load profile</h3>
        <p className="text-sm text-muted-foreground">Check your connection and try refreshing the page.</p>
      </div>
    );
  }

  const isEditing = (s: Section) => editingSection === s;
  const D = editData as VendorProfile;

  const statusBadge =
    vendor.approvalStatus === "approved"
      ? { label: "Verified", cls: "bg-green-50 text-green-700 border-green-200", icon: BadgeCheck }
      : vendor.approvalStatus === "rejected"
      ? { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200", icon: XCircle }
      : { label: "Pending Review", cls: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: AlertCircle };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{vendor.storeName}</h1>
          <p className="text-muted-foreground text-sm mt-1">{vendor.address.city}, {vendor.address.state}</p>
        </div>
        <span className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border", statusBadge.cls)}>
          <statusBadge.icon className="w-3.5 h-3.5" />
          {statusBadge.label}
        </span>
      </div>

      {/* Rejection note */}
      {vendor.approvalStatus === "rejected" && vendor.approvalNote && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <p className="font-medium mb-0.5">Application Note:</p>
          <p>{vendor.approvalNote}</p>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Orders", value: vendor.totalOrders ?? 0, icon: Package },
          { label: "Revenue", value: `${((vendor.totalRevenue ?? 0) / 1000).toFixed(1)}k`, icon: Store },
          { label: "Rating", value: vendor.averageRating?.toFixed(1) ?? "—", icon: ShieldCheck },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-md border p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <s.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Store Information ── */}
      <Section
        title="Store Information"
        icon={Store}
        sectionKey="info"
        editingSection={editingSection}
        saving={saving}
        onEdit={() => startEdit("info")}
        onCancel={cancelEdit}
        onSave={() =>
          saveSection({
            storeName: D.storeName,
            ownerName: D.ownerName,
            phone: D.phone,
            language: D.language,
            address: D.address,
          })
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Store Name"
            value={vendor.storeName}
            isEditing={isEditing("info")}
            inputProps={{ value: D.storeName ?? "", onChange: (e) => patchEdit("storeName", e.target.value) }}
          />
          <Field
            label="Owner Name"
            value={vendor.ownerName}
            isEditing={isEditing("info")}
            inputProps={{ value: D.ownerName ?? "", onChange: (e) => patchEdit("ownerName", e.target.value) }}
          />
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <p className="text-sm text-muted-foreground italic flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {vendor.email}
            </p>
          </div>
          <Field
            label="Phone"
            value={vendor.phone}
            isEditing={isEditing("info")}
            inputProps={{ value: D.phone ?? "", onChange: (e) => patchEdit("phone", e.target.value), type: "tel" }}
          />
          <Field
            label="Address Line 1"
            value={vendor.address.addressLine1}
            isEditing={isEditing("info")}
            inputProps={{ value: D.address?.addressLine1 ?? "", onChange: (e) => patchEdit("address.addressLine1", e.target.value) }}
          />
          <Field
            label="Address Line 2"
            value={vendor.address.addressLine2}
            isEditing={isEditing("info")}
            inputProps={{ value: D.address?.addressLine2 ?? "", onChange: (e) => patchEdit("address.addressLine2", e.target.value), placeholder: "Apartment, suite (optional)" }}
          />
          <Field
            label="City"
            value={vendor.address.city}
            isEditing={isEditing("info")}
            inputProps={{ value: D.address?.city ?? "", onChange: (e) => patchEdit("address.city", e.target.value) }}
          />
          <Field
            label="State"
            value={vendor.address.state}
            isEditing={isEditing("info")}
            inputProps={{ value: D.address?.state ?? "", onChange: (e) => patchEdit("address.state", e.target.value) }}
          />
          <Field
            label="Pincode"
            value={vendor.address.pincode}
            isEditing={isEditing("info")}
            inputProps={{ value: D.address?.pincode ?? "", onChange: (e) => patchEdit("address.pincode", e.target.value) }}
          />
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Language</label>
            {isEditing("info") ? (
              <select
                className="w-full h-9 px-3 text-sm border rounded-md"
                value={D.language ?? "en"}
                onChange={(e) => patchEdit("language", e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            ) : (
              <p className="text-sm font-medium">{vendor.language === "hi" ? "Hindi" : "English"}</p>
            )}
          </div>
        </div>

        {/* Readonly license / GST */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
              <FileText className="w-3 h-3" /> License Number
            </label>
            <p className="text-sm font-medium font-mono">{vendor.licenseNumber}</p>
          </div>
          {vendor.gstNumber && (
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                <FileText className="w-3 h-3" /> GST Number
              </label>
              <p className="text-sm font-medium font-mono">{vendor.gstNumber}</p>
            </div>
          )}
        </div>
        {saveError && editingSection === "info" && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 p-2 rounded">{saveError}</p>
        )}
      </Section>

      {/* ── Location ── */}
      <Section
        title="Store Location (GPS)"
        icon={MapPin}
        sectionKey="location"
        editingSection={editingSection}
        saving={saving}
        onEdit={() => startEdit("location")}
        onCancel={cancelEdit}
        onSave={() =>
          saveSection({
            latitude: (D as any).latitude,
            longitude: (D as any).longitude,
          })
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Latitude</label>
            {isEditing("location") ? (
              <Input
                type="number"
                step="any"
                value={(editData as any).latitude ?? vendor.location?.coordinates?.[1] ?? ""}
                onChange={(e) => setEditData((p) => ({ ...p, latitude: e.target.value } as any))}
                placeholder="e.g. 28.6139"
              />
            ) : (
              <p className="text-sm font-medium font-mono">{vendor.location?.coordinates?.[1] ?? <span className="text-muted-foreground italic">Not set</span>}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Longitude</label>
            {isEditing("location") ? (
              <Input
                type="number"
                step="any"
                value={(editData as any).longitude ?? vendor.location?.coordinates?.[0] ?? ""}
                onChange={(e) => setEditData((p) => ({ ...p, longitude: e.target.value } as any))}
                placeholder="e.g. 77.2090"
              />
            ) : (
              <p className="text-sm font-medium font-mono">{vendor.location?.coordinates?.[0] ?? <span className="text-muted-foreground italic">Not set</span>}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Used to match your store with nearby customers.</p>
        {saveError && editingSection === "location" && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 p-2 rounded">{saveError}</p>
        )}
      </Section>

      {/* ── Operating Hours ── */}
      <Section
        title="Operating Hours"
        icon={Clock}
        sectionKey="hours"
        editingSection={editingSection}
        saving={saving}
        onEdit={() => startEdit("hours")}
        onCancel={cancelEdit}
        onSave={() => saveSection({ operatingHours: D.operatingHours })}
      >
        <div className="space-y-2">
          {DAYS.map((day) => {
            const hours = (isEditing("hours") ? (D.operatingHours?.[day]) : vendor.operatingHours?.[day]) ?? { open: "09:00", close: "21:00", isClosed: false };
            return (
              <div key={day} className="flex items-center gap-3 py-2 border-b last:border-0">
                <span className="capitalize w-24 text-sm font-medium">{day}</span>
                {isEditing("hours") ? (
                  <>
                    <input
                      type="checkbox"
                      id={`closed-${day}`}
                      checked={hours.isClosed}
                      onChange={(e) => patchHours(day, "isClosed", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`closed-${day}`} className="text-xs text-muted-foreground mr-3">Closed</label>
                    <Input
                      type="time"
                      value={hours.open}
                      disabled={hours.isClosed}
                      onChange={(e) => patchHours(day, "open", e.target.value)}
                      className="w-32 h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={hours.close}
                      disabled={hours.isClosed}
                      onChange={(e) => patchHours(day, "close", e.target.value)}
                      className="w-32 h-8 text-xs"
                    />
                  </>
                ) : (
                  <span className={cn("text-sm", hours.isClosed ? "text-muted-foreground italic" : "")}>
                    {hours.isClosed ? "Closed" : `${hours.open} – ${hours.close}`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {saveError && editingSection === "hours" && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 p-2 rounded">{saveError}</p>
        )}
      </Section>

      {/* ── Delivery Settings ── */}
      <Section
        title="Delivery Settings"
        icon={Truck}
        sectionKey="delivery"
        editingSection={editingSection}
        saving={saving}
        onEdit={() => startEdit("delivery")}
        onCancel={cancelEdit}
        onSave={() =>
          saveSection({
            deliveryAvailable: D.deliveryAvailable,
            deliveryRadius: Number(D.deliveryRadius),
            minimumOrderAmount: Number(D.minimumOrderAmount),
            deliveryCharge: Number(D.deliveryCharge),
          })
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Delivery Available</label>
            {isEditing("delivery") ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={D.deliveryAvailable ?? false}
                  onChange={(e) => patchEdit("deliveryAvailable", e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{D.deliveryAvailable ? "Yes, delivering orders" : "No delivery"}</span>
              </label>
            ) : (
              <p className={cn("text-sm font-medium", vendor.deliveryAvailable ? "text-green-600" : "text-muted-foreground")}>
                {vendor.deliveryAvailable ? "✓ Available" : "Not available"}
              </p>
            )}
          </div>
          <Field
            label="Delivery Radius (km)"
            value={vendor.deliveryRadius}
            isEditing={isEditing("delivery")}
            inputProps={{ type: "number", value: D.deliveryRadius ?? "", onChange: (e) => patchEdit("deliveryRadius", e.target.value), min: 0 }}
          />
          <Field
            label="Minimum Order (₹)"
            value={vendor.minimumOrderAmount}
            isEditing={isEditing("delivery")}
            inputProps={{ type: "number", value: D.minimumOrderAmount ?? "", onChange: (e) => patchEdit("minimumOrderAmount", e.target.value), min: 0 }}
          />
          <Field
            label="Delivery Charge (₹)"
            value={vendor.deliveryCharge}
            isEditing={isEditing("delivery")}
            inputProps={{ type: "number", value: D.deliveryCharge ?? "", onChange: (e) => patchEdit("deliveryCharge", e.target.value), min: 0 }}
          />
        </div>
        {saveError && editingSection === "delivery" && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 p-2 rounded">{saveError}</p>
        )}
      </Section>

      {/* ── Emergency & Store Status ── */}
      <Section
        title="Emergency & Store Status"
        icon={AlertCircle}
        sectionKey="emergency"
        editingSection={editingSection}
        saving={saving}
        onEdit={() => startEdit("emergency")}
        onCancel={cancelEdit}
        onSave={() =>
          saveSection({ acceptsEmergency: D.acceptsEmergency, isActive: D.isActive })
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Store Active</label>
            {isEditing("emergency") ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={D.isActive ?? false}
                  onChange={(e) => patchEdit("isActive", e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{D.isActive ? "Store is open" : "Store is closed"}</span>
              </label>
            ) : (
              <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", vendor.isActive ? "text-green-600" : "text-red-500")}>
                {vendor.isActive ? <><CheckCircle className="w-4 h-4" /> Open</> : <><XCircle className="w-4 h-4" /> Closed</>}
              </span>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Accepts Emergency Orders</label>
            {isEditing("emergency") ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={D.acceptsEmergency ?? false}
                  onChange={(e) => patchEdit("acceptsEmergency", e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{D.acceptsEmergency ? "Yes, accepting emergency" : "No"}</span>
              </label>
            ) : (
              <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", vendor.acceptsEmergency ? "text-orange-600" : "text-muted-foreground")}>
                {vendor.acceptsEmergency ? <><AlertCircle className="w-4 h-4" /> Yes</> : "No"}
              </span>
            )}
          </div>
        </div>
        {saveError && editingSection === "emergency" && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 p-2 rounded">{saveError}</p>
        )}
      </Section>
    </div>
  );
}
