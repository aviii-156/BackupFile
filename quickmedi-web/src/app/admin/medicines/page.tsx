"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Search,
  RefreshCw,
  Building2,
  Layers,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Store,
  AlertTriangle,
} from "lucide-react";
import { adminService } from "@/services/admin.service";

type ActiveIngredient = {
  name: string;
  strength: string;
  full_description: string;
};

type CatalogMedicine = {
  _id: string;
  product_id: number;
  brand_name: string;
  name_normalized?: string;
  manufacturer?: string;
  price?: number;
  dosage_form?: string;
  packaging?: string;
  pack_size?: number;
  pack_unit?: string;
  num_active_ingredients?: number;
  primary_ingredient?: string;
  primary_strength?: string;
  active_ingredients?: ActiveIngredient[];
  composition_normalized?: string;
  therapeutic_class?: string;
  vendor_count: number;
};

const DOSAGE_FORMS = [
  "all",
  "tablet",
  "capsule",
  "syrup",
  "injection",
  "cream",
  "drops",
  "inhaler",
  "powder",
  "lotion",
  "gel",
  "solution",
  "suspension",
  "ointment",
  "spray",
];

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<CatalogMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalMedicines: 0,
  });
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterForm, setFilterForm] = useState("all");
  const [filterTherapy, setFilterTherapy] = useState("");
  const [therapyClasses, setTherapyClasses] = useState<string[]>([]);

  // Modals
  const [viewMedicine, setViewMedicine] = useState<CatalogMedicine | null>(
    null,
  );
  const [editMedicine, setEditMedicine] = useState<CatalogMedicine | null>(
    null,
  );
  const [editForm, setEditForm] = useState<Partial<CatalogMedicine>>({});
  const [deleteTarget, setDeleteTarget] = useState<CatalogMedicine | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllMedicines({
        search: debouncedSearch || undefined,
        form: filterForm === "all" ? undefined : filterForm,
        therapeutic_class: filterTherapy || undefined,
        page,
        limit: 20,
      });
      if (res.success && res.data) {
        const meds = res.data.medicines as CatalogMedicine[];
        setMedicines(meds);
        setPagination(
          res.data.pagination as {
            currentPage: number;
            totalPages: number;
            totalMedicines: number;
          },
        );
        const classes = [
          ...new Set(meds.map((m) => m.therapeutic_class).filter(Boolean)),
        ] as string[];
        setTherapyClasses((prev) =>
          [...new Set([...prev, ...classes])].sort().slice(0, 80),
        );
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterForm, filterTherapy, page]);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  console.log({ medicines });
  // Edit handlers
  const openEdit = (m: CatalogMedicine) => {
    setEditMedicine(m);
    setEditForm({
      brand_name: m.brand_name,
      manufacturer: m.manufacturer,
      price: m.price,
      dosage_form: m.dosage_form,
      packaging: m.packaging,
      therapeutic_class: m.therapeutic_class,
      primary_ingredient: m.primary_ingredient,
      primary_strength: m.primary_strength,
    });
  };

  const handleSaveEdit = async () => {
    if (!editMedicine) return;
    setSaving(true);
    try {
      const res = await adminService.updateMedicine(
        editMedicine.product_id,
        editForm,
      );
      if (res.success) {
        setMedicines((prev) =>
          prev.map((m) =>
            m.product_id === editMedicine.product_id
              ? { ...m, ...editForm }
              : m,
          ),
        );
        setEditMedicine(null);
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminService.deleteMedicine(deleteTarget.product_id);
      if (res.success) {
        setMedicines((prev) =>
          prev.filter((m) => m.product_id !== deleteTarget.product_id),
        );
        setPagination((p) => ({ ...p, totalMedicines: p.totalMedicines - 1 }));
        setDeleteTarget(null);
      }
    } catch {
      /* ignore */
    } finally {
      setDeleting(false);
    }
  };

  const uniqueManufacturers = [
    ...new Set(medicines.map((m) => m.manufacturer).filter(Boolean)),
  ].length;
  const uniqueClasses = [
    ...new Set(medicines.map((m) => m.therapeutic_class).filter(Boolean)),
  ].length;
  const priced = medicines.filter((m) => m.price != null && m.price! > 0);
  const avgPrice =
    priced.length > 0
      ? (
          priced.reduce((s, m) => s + (m.price ?? 0), 0) / priced.length
        ).toFixed(2)
      : "0";

  return (
    <div className="space-y-4">
      {/* ── View Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={viewMedicine !== null}
        onOpenChange={(open) => !open && setViewMedicine(null)}
      >
        <DialogContent
          showCloseButton
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>{viewMedicine?.brand_name}</DialogTitle>
            <DialogDescription>
              Product ID: #{viewMedicine?.product_id}
            </DialogDescription>
          </DialogHeader>

          {viewMedicine && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {(
                  [
                    ["Manufacturer", viewMedicine.manufacturer],
                    [
                      "Price",
                      viewMedicine.price
                        ? `₹${viewMedicine.price.toFixed(2)}`
                        : "N/A",
                    ],
                    ["Dosage Form", viewMedicine.dosage_form],
                    ["Packaging", viewMedicine.packaging],
                    [
                      "Pack Size",
                      viewMedicine.pack_size
                        ? `${viewMedicine.pack_size} ${viewMedicine.pack_unit ?? ""}`
                        : undefined,
                    ],
                    ["Therapy Class", viewMedicine.therapeutic_class],
                    [
                      "No. of Ingredients",
                      viewMedicine.num_active_ingredients?.toString(),
                    ],
                    ["Vendors Using", String(viewMedicine.vendor_count)],
                  ] as [string, string | undefined][]
                )
                  .filter(([, val]) => Boolean(val))
                  .map(([label, val]) => (
                    <div key={label} className="bg-muted/40 rounded-lg p-3">
                      <p className="text-[11px] text-muted-foreground">
                        {label}
                      </p>
                      <p className="font-medium mt-0.5 capitalize">{val}</p>
                    </div>
                  ))}
              </div>

              {viewMedicine.active_ingredients &&
                viewMedicine.active_ingredients.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Active Ingredients
                    </h3>
                    <div className="space-y-2">
                      {viewMedicine.active_ingredients.map((ing, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2"
                        >
                          <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{ing.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {ing.strength} {ing.full_description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {viewMedicine.composition_normalized && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Composition (normalized)
                  </p>
                  <p className="text-xs font-mono">
                    {viewMedicine.composition_normalized}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={editMedicine !== null}
        onOpenChange={(open) => !open && setEditMedicine(null)}
      >
        <DialogContent showCloseButton className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
            <DialogDescription>
              Update the medicine details below. Changes are saved immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit_brand_name">Brand Name</Label>
              <Input
                id="edit_brand_name"
                value={editForm.brand_name ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, brand_name: e.target.value }))
                }
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit_manufacturer">Manufacturer</Label>
              <Input
                id="edit_manufacturer"
                value={editForm.manufacturer ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, manufacturer: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_dosage_form">Dosage Form</Label>
              <Input
                id="edit_dosage_form"
                value={editForm.dosage_form ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, dosage_form: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_price">Price (₹)</Label>
              <Input
                id="edit_price"
                type="number"
                value={editForm.price?.toString() ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    price: parseFloat(e.target.value) || undefined,
                  }))
                }
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit_packaging">Packaging</Label>
              <Input
                id="edit_packaging"
                value={editForm.packaging ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, packaging: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_primary_ingredient">
                Primary Ingredient
              </Label>
              <Input
                id="edit_primary_ingredient"
                value={editForm.primary_ingredient ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    primary_ingredient: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_primary_strength">Primary Strength</Label>
              <Input
                id="edit_primary_strength"
                value={editForm.primary_strength ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    primary_strength: e.target.value,
                  }))
                }
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit_therapeutic_class">Therapy Class</Label>
              <Input
                id="edit_therapeutic_class"
                value={editForm.therapeutic_class ?? ""}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    therapeutic_class: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ───────────────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent showCloseButton className="max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <DialogTitle className="text-center">Delete Medicine?</DialogTitle>
            <DialogDescription className="text-center">
              <span className="font-semibold text-foreground">
                {deleteTarget?.brand_name}
              </span>
              <br />
              This will also remove it from all vendor inventories. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Medicine Catalog</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Indian pharmaceutical catalog —{" "}
            {loading
              ? "loading..."
              : `${pagination.totalMedicines.toLocaleString()} medicines`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          onClick={loadMedicines}
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total (catalog)",
            value: pagination.totalMedicines.toLocaleString(),
            icon: Package,
            bg: "bg-blue-50",
            color: "text-blue-600",
          },
          {
            label: "Manufacturers (page)",
            value: String(uniqueManufacturers),
            icon: Building2,
            bg: "bg-purple-50",
            color: "text-purple-600",
          },
          {
            label: "Therapy Classes (page)",
            value: String(uniqueClasses),
            icon: Layers,
            bg: "bg-orange-50",
            color: "text-orange-600",
          },
          {
            label: "Avg Price (page)",
            value: `₹${avgPrice}`,
            icon: IndianRupee,
            bg: "bg-green-50",
            color: "text-green-600",
          },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div
            key={label}
            className="bg-white rounded-lg p-4 border border-border card-shadow"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}
              >
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{loading ? "—" : value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg p-3 border border-border card-shadow space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by brand, ingredient, manufacturer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <select
            value={filterTherapy}
            onChange={(e) => {
              setFilterTherapy(e.target.value);
              setPage(1);
            }}
            className="h-9 text-sm border border-input rounded-md px-3 bg-background min-w-[180px]"
          >
            <option value="">All Therapy Classes</option>
            {therapyClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1 flex-wrap">
          {DOSAGE_FORMS.slice(0, 12).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilterForm(f);
                setPage(1);
              }}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                filterForm === f
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-border card-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Name / Manufacturer</TableHead> 
              <TableHead className="w-[200px]">Composition</TableHead>
              <TableHead>Form &amp; Pack</TableHead>
              <TableHead className="w-[90px]">Price</TableHead>
              <TableHead>Therapy Class</TableHead>
              <TableHead className="w-[80px]">Vendors</TableHead>
              <TableHead className="w-[110px] text-right pr-4">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-sm text-muted-foreground"
                >
                  Loading catalog...
                </TableCell>
              </TableRow>
            ) : medicines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-sm text-muted-foreground"
                >
                  No medicines found.
                </TableCell>
              </TableRow>
            ) : (
              medicines.map((m) => (
                <TableRow key={m._id ?? m.product_id}>
                  {/* Brand / Manufacturer */}
                  <TableCell>
                    <p className="text-md font-semibold leading-tight">
                      {m.brand_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 font-mono">
                      {m.manufacturer}
                    </p> 
                  </TableCell>

                  {/* Composition */}
                  <TableCell className="max-w-[200px]">
                    {m.active_ingredients && m.active_ingredients.length > 0 ? (
                      m.active_ingredients.slice(0, 2).map((ing, i) => (
                        <p
                          key={i}
                          className={
                            i === 0
                              ? "text-xs font-medium truncate"
                              : "text-[11px] text-muted-foreground mt-0.5 truncate"
                          }
                        >
                          {ing.full_description}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs font-medium truncate">
                        {m.primary_ingredient ?? "—"}{" "}
                        {m.primary_strength ? `(${m.primary_strength})` : ""}
                      </p>
                    )}
                  </TableCell>

                  {/* Form & Pack */}
                  <TableCell>
                    {m.dosage_form && (
                      <Badge variant="info" className="capitalize text-[10px]">
                        {m.dosage_form}
                      </Badge>
                    )}
                    {m.packaging && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {m.packaging}
                      </p>
                    )}
                  </TableCell>

                  {/* Price */}
                  <TableCell>
                    {m.price && m.price > 0 ? (
                      <span className="text-sm font-bold">
                        ₹{m.price.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </TableCell>

                  {/* Therapy Class */}
                  <TableCell>
                    {m.therapeutic_class && (
                      <Badge
                        variant="warning"
                        className="text-[10px] whitespace-normal leading-4"
                      >
                        {m.therapeutic_class}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Vendor Count */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Store className="w-3 h-3 text-muted-foreground" />
                      <Badge
                        variant={m.vendor_count > 0 ? "success" : "secondary"}
                      >
                        {m.vendor_count}
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right pr-4">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => setViewMedicine(m)}
                        className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 rounded-md hover:bg-green-50 text-green-600"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(m)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Page {pagination.currentPage} of {pagination.totalPages} —{" "}
            {pagination.totalMedicines.toLocaleString()} medicines
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3 h-3" /> Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
