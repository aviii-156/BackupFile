"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShoppingCart,
  MessageSquare,
  Search,
  Star,
  MapPin,
  Plus,
  Minus,
  Pill,
  X,
  ScanLine,
  FileText,
  TrendingDown,
  Truck,
  Clock,
  Zap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/context/CartContext";
import { useMedicineCart } from "@/context/MedicineCartContext";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG } from "@/lib/api-config";
import { MedicineGrid, type MedicineData } from "@/components/shared/MedicineCard";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScannedMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  confidence: number;
}

interface ScanResult {
  extractedText: string;
  detectedMedicines: ScannedMedicine[];
  doctorName?: string;
  prescriptionDate?: string;
}

interface InventoryItem {
  _id: string;
  medicineId: string | { _id: string };
  medicineName: string;
  genericName: string;
  vendorPrice: number;
  mrp: number;
  discount: number;
  unit: string;
  category?: string;
  form?: string;
  manufacturer?: string;
  stock: number;
}

interface VendorResult {
  store: {
    _id: string;
    storeName: string;
    ownerName: string;
    address: {
      addressLine1?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    rating: number;
    deliveryAvailable: boolean;
    deliveryCharge: number;
    minimumOrderAmount: number;
    operatingHours?: Record<
      string,
      { open: string; close: string; isClosed: boolean }
    >;
  };
  matchedItems: InventoryItem[];
}

type Step = "upload" | "scanning" | "results" | "finding" | "vendors";

// ─── Generic Alternatives Types ───────────────────────────────────────────────
interface GenericOption {
  name: string;
  mrp?: number;
  pack_size?: string;
  form?: string;
  therapeutic_class?: string;
}

interface BrandAlternative {
  brand_name: string;
  manufacturer?: string;
  price?: number;
  dosage_form?: string;
  pack_size?: string | number;
}

interface GenericMedResult {
  medicine: string;
  success: boolean;
  result?: {
    searched_medicine: { name: string; price?: number; dosage_form?: string; manufacturer?: string } | null;
    best_generic_option: GenericOption | null;
    cheaper_brand_alternatives: BrandAlternative[];
    price_comparison: { original_price?: number; generic_price?: number; total_savings?: number };
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function isOpenNow(
  operatingHours?: Record<
    string,
    { open: string; close: string; isClosed: boolean }
  >,
): boolean {
  if (!operatingHours) return false;
  const today = DAY_NAMES[new Date().getDay()];
  const h = operatingHours[today];
  if (!h || h.isClosed) return false;
  try {
    const [oH, oM] = h.open.split(":").map(Number);
    const [cH, cM] = h.close.split(":").map(Number);
    const mins = new Date().getHours() * 60 + new Date().getMinutes();
    return mins >= oH * 60 + oM && mins < cH * 60 + cM;
  } catch {
    return false;
  }
}

function confidenceLabel(c: number): { label: string; cls: string } {
  if (c >= 0.8) return { label: "High", cls: "bg-green-100 text-green-700" };
  if (c >= 0.5)
    return { label: "Medium", cls: "bg-yellow-100 text-yellow-700" };
  return { label: "Low", cls: "bg-red-100 text-red-700" };
}

function stripDosage(name: string): string {
  return name.replace(/\s+\d+\s*(mg|mcg|ml|g|%|iu|units?)/gi, "").trim();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ScanPage() {
  const router = useRouter();
  const {
    addToCart,
    getQuantity,
    updateQuantity,
    storeId: cartStoreId,
  } = useCart();
  const { addToWishlist, getWishlistQuantity, updateWishlistQuantity, removeFromWishlist } = useMedicineCart();

  const [step, setStep] = useState<Step>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStage, setScanStage] = useState(0); // 0-3 for animation steps
  const [vendors, setVendors] = useState<VendorResult[]>([]);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});
  const [genericResults, setGenericResults] = useState<GenericMedResult[] | null>(null);
  const [genericLoading, setGenericLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scanStageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ── Restore scan state from sessionStorage after navigation ──────────────
  useEffect(() => {
    const saved = sessionStorage.getItem("scan_page_state");
    if (!saved) return;
    try {
      const s = JSON.parse(saved);
      if (s.step === "results" || s.step === "vendors") {
        setScanResult(s.scanResult ?? null);
        setVendors(s.vendors ?? []);
        setAddedMap(s.addedMap ?? {});
        setScanError(s.scanError ?? null);
        setGenericResults(s.genericResults ?? null);
        setStep(s.step);
      }
    } catch {
      /* ignore corrupt state */
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist scan state to sessionStorage on change ───────────────────────
  useEffect(() => {
    if (step === "upload" || step === "scanning" || step === "finding") return;
    sessionStorage.setItem(
      "scan_page_state",
      JSON.stringify({ step, scanResult, vendors, addedMap, scanError, genericResults }),
    );
  }, [step, scanResult, vendors, addedMap, scanError]);

  // ── Scan Stage Animation ────────────────────────────────────────────────
  const startScanAnimation = useCallback(() => {
    setScanStage(0);
    let stage = 0;
    scanStageRef.current = setInterval(() => {
      stage += 1;
      setScanStage(stage);
      if (stage >= 3 && scanStageRef.current) {
        clearInterval(scanStageRef.current);
      }
    }, 900);
  }, []);

  // ── File Processing ─────────────────────────────────────────────────────
  const processFile = useCallback(
    async (file: File) => {
      // Validate
      const allowed = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
        "application/pdf",
      ];
      if (!allowed.includes(file.type)) {
        setScanError("Please upload a JPG, PNG, WEBP, or PDF file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setScanError("File too large. Maximum size is 5MB.");
        return;
      }

      setScanError(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setStep("scanning");
      startScanAnimation();

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await apiClient.upload<any>(
          API_CONFIG.API.PRESCRIPTION.SCAN,
          formData,
        );
        // Response shape: { success, message, data: { doctorName, prescriptionDate, medicines, diagnosis, instructions } }
        const body = (res as any).data ?? (res as any);
        const rawMeds: any[] = body?.medicines ?? [];
        const detectedMedicines: ScannedMedicine[] = rawMeds
          .map((m: any) => ({
            name: m.name ?? m.medicine_name ?? m.medicineName ?? String(m),
            dosage: m.dosage ?? m.dose ?? undefined,
            frequency: m.frequency ?? m.freq ?? undefined,
            duration: m.duration ?? undefined,
            confidence: typeof m.confidence === "number" ? m.confidence : 0.85,
          }))
          .filter((m) => m.name);
        // diagnosis may be an object — convert to readable string
        const diagRaw = body?.diagnosis;
        const diagText = !diagRaw
          ? ""
          : typeof diagRaw === "string"
            ? diagRaw
            : [
                diagRaw.impression_diagnosis,
                diagRaw.chief_complaints?.join(", "),
                diagRaw.vitals_on_examination
                  ? `BP: ${diagRaw.vitals_on_examination.blood_pressure ?? "-"}, PR: ${diagRaw.vitals_on_examination.pulse_rate ?? "-"}`
                  : null,
              ]
                .filter(Boolean)
                .join(" | ");
        setScanResult({
          extractedText:
            diagText ||
            (typeof body?.instructions === "string" ? body.instructions : ""),
          detectedMedicines,
          doctorName: body?.doctorName ?? undefined,
          prescriptionDate: body?.prescriptionDate ?? undefined,
        });
        // Kick off generic alternatives lookup in the background
        if (detectedMedicines.length > 0) {
          fetchGenericAlternatives(detectedMedicines);
        }
      } catch (err: any) {
        console.error("Scan error:", err);
        // Graceful fallback: still show results step but with empty medicines
        setScanResult({
          extractedText: "",
          detectedMedicines: [],
          doctorName: undefined,
          prescriptionDate: undefined,
        });
        setScanError(
          "OCR service unavailable. Could not extract medicines automatically. You can search manually.",
        );
      } finally {
        if (scanStageRef.current) clearInterval(scanStageRef.current);
        setScanStage(4);
        setTimeout(() => setStep("results"), 500);
      }
    },
    [startScanAnimation],
  );

  // ── Find Vendors ────────────────────────────────────────────────────────
  const findVendors = useCallback(async () => {
    if (!scanResult?.detectedMedicines?.length) return;
    setVendorError(null);
    setStep("finding");

    const names = scanResult.detectedMedicines.map((m) => stripDosage(m.name));

    try {
      const res = await apiClient.post<any>(
        API_CONFIG.API.STORE.SEARCH_BY_MEDICINES,
        { medicines: names },
      );
      const data = (res as any).data;
      setVendors(data?.vendors ?? []);
    } catch {
      setVendorError("Could not find vendors. Please try again.");
      setVendors([]);
    } finally {
      setStep("vendors");
    }
  }, [scanResult]);

  // ── Generic Alternatives ─────────────────────────────────────────────────
  const fetchGenericAlternatives = useCallback(
    async (medicines: ScannedMedicine[]) => {
      if (!medicines.length) return;
      setGenericLoading(true);
      setGenericResults(null);
      try {
        const names = medicines.map((m) => stripDosage(m.name));
        const res = await apiClient.post<any>(
          API_CONFIG.API.MEDICINE.GENERIC_ALTERNATIVES,
          { medicines: names },
        );
        const data = (res as any).data;
        setGenericResults(data?.results ?? []);
      } catch {
        setGenericResults([]);
      } finally {
        setGenericLoading(false);
      }
    },
    [],
  );

  // ── Ask Assistant ───────────────────────────────────────────────────────
  const askAssistant = useCallback(() => {
    if (!scanResult?.detectedMedicines?.length) return;
    const names = scanResult.detectedMedicines.map((m) => m.name).join(", ");
    sessionStorage.setItem(
      "chatbot_prefill",
      `I have a prescription with these medicines: ${names}. Can you explain what each one is for and any important precautions?`,
    );
    router.push("/user/chatbot");
  }, [scanResult, router]);

  // ── Cart Helpers ────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(
    (item: InventoryItem, vendor: VendorResult) => {
      const medicineId =
        typeof item.medicineId === "object" && item.medicineId !== null
          ? (item.medicineId as { _id: string })._id
          : ((item.medicineId as string) ?? "");

      addToCart({
        inventoryId: item._id,
        medicineId,
        storeId: vendor.store._id,
        storeName: vendor.store.storeName,
        medicineName: item.medicineName,
        genericName: item.genericName,
        vendorPrice: item.vendorPrice,
        mrp: item.mrp,
        discount: item.discount,
        unit: item.unit,
        category: item.category,
        form: item.form,
        manufacturer: item.manufacturer,
        maxStock: item.stock,
      });
      setAddedMap((prev) => ({ ...prev, [item._id]: true }));
    },
    [addToCart],
  );

  // ── Drag & Drop ─────────────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setScanResult(null);
    setScanError(null);
    setScanStage(0);
    setVendors([]);
    setVendorError(null);
    setAddedMap({});
    setGenericResults(null);
    setGenericLoading(false);
    setStep("upload");
    sessionStorage.removeItem("scan_page_state");
  }, [previewUrl]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER STEPS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Step: Upload ─────────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Prescription Scanner
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Scan Your Prescription
          </h1>
          <p className="text-muted-foreground">
            Upload a photo and instantly find medicines at nearby pharmacies
          </p>
        </div>

        {/* Upload Zone */}
        <div className="max-w-4xl mx-auto">
          {scanError && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {scanError}
            </div>
          )}

          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`relative border-2 py-6 border-dashed rounded-md p-10 text-center transition-all duration-200 bg-white cursor-pointer
							${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/60 hover:bg-accent/30"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className={`w-20 h-20 rounded-md flex items-center justify-center transition-colors ${isDragging ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}
              >
                <Upload className="w-9 h-9" />
              </div>
              <div>
                <p className="text-lg font-semibold mb-1">
                  {isDragging ? "Drop it here!" : "Drop prescription here"}
                </p>
                <p className="text-muted-foreground text-sm">
                  or click to browse your files
                </p>
              </div>
              <div
                className="flex flex-col sm:flex-row gap-3 mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Choose File
                </Button>
                <Button
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WEBP, PDF • Max 5MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={onFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              {
                icon: ScanLine,
                label: "AI OCR",
                sub: "Accurate text extraction",
                color: "orange",
              },
              {
                icon: Shield,
                label: "Safe & Private",
                sub: "Data never stored",
                color: "orange",
              },
              {
                icon: Zap,
                label: "Instant Results",
                sub: "Under 10 seconds",
                color: "orange",
              },
            ].map(({ icon: Icon, label, sub, color }) => (
              <div
                key={label}
                className="bg-white rounded-md p-4 text-center border border-border"
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-${color}-50 flex items-center justify-center mx-auto mb-2`}
                >
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Scanning ───────────────────────────────────────────────────────
  if (step === "scanning") {
    const stages = [
      "Uploading image…",
      "Extracting text…",
      "Detecting medicines…",
      "Verifying details…",
    ];
    return (
      <div className="">
        {/* Stepper */}
        <div className="max-w-5xl mx-auto mb-6">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs mt-1.5 font-medium text-green-600 text-center">Scan Uploaded</p>
            </div>
            <div className="h-0.5 w-20 md:w-32 bg-green-500 mx-2 mb-5" />
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-sm animate-pulse">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <p className="text-xs mt-1.5 font-medium text-primary text-center">Processing Prescription</p>
            </div>
            <div className="h-0.5 w-20 md:w-32 bg-border mx-2 mb-5" />
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              </div>
              <p className="text-xs mt-1.5 font-medium text-muted-foreground text-center">Results &amp; Alternatives</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* Image preview with scan line */}
            <div className="bg-white rounded-md overflow-hidden border border-border relative">
              {previewUrl && (
                <div style={{ height: "360px", overflow: "hidden" }}>
                  <img
                    src={previewUrl}
                    alt="Prescription"
                    style={{ width: "100%", height: "360px", objectFit: "cover", objectPosition: "top" }}
                  />
                </div>
              )}
              {/* Animated scan line */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                  className="absolute left-0 right-0 h-0.5 bg-primary/60 shadow-[0_0_8px_2px_hsl(var(--primary)/0.4)]"
                  style={{ animation: "scanLine 2s ease-in-out infinite", top: "30%" }}
                />
              </div>
              <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
            </div>

            {/* Progress */}
            <div className="bg-white rounded-md p-5 border border-border flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
                <div>
                  <p className="font-semibold">Analyzing Prescription</p>
                  <p className="text-xs text-muted-foreground">Using AI to extract medicine data</p>
                </div>
              </div>

              <div className="space-y-4">
                {stages.map((s, i) => {
                  const done = i < scanStage;
                  const active = i === scanStage;
                  return (
                    <div
                      key={s}
                      className={`flex items-center gap-3 transition-all duration-300 ${i > scanStage ? "opacity-30" : ""}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all
                          ${done ? "bg-green-500" : active ? "bg-primary animate-pulse" : "bg-muted"}`}
                      >
                        {done ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : active ? (
                          <Loader2 className="w-3 h-3 text-white animate-spin" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                        )}
                      </div>
                      <span className={`text-sm ${done ? "text-green-700 font-medium" : active ? "text-primary font-medium" : "text-muted-foreground"}`}>
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 bg-accent rounded-md p-3 text-xs text-muted-foreground flex gap-2">
                <ScanLine className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                For best results, ensure the prescription is flat, well-lit, and fully visible.
              </div>
            </div>
          </div>
        </div>
        <style>{`@keyframes scanLine { 0%,100% { top:5%; } 50% { top:90%; } }`}</style>
      </div>
    );
  }

  // ── Step: Results ────────────────────────────────────────────────────────
  if (step === "results") {
    const meds = scanResult?.detectedMedicines ?? [];

    return (
      <div className="">
        {/* Stepper */}
        <div className="max-w-5xl mx-auto mb-6">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs mt-1.5 font-medium text-green-600 text-center">Scan Uploaded</p>
            </div>
            <div className="h-0.5 w-20 md:w-32 bg-green-500 mx-2 mb-5" />
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs mt-1.5 font-medium text-green-600 text-center">Processing Prescription</p>
            </div>
            <div className="h-0.5 w-20 md:w-32 bg-border mx-2 mb-5" />
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-sm ring-4 ring-primary/20">
                <div className="w-3 h-3 rounded-full bg-white" />
              </div>
              <p className="text-xs mt-1.5 font-medium text-primary text-center">Results &amp; Alternatives</p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-4">
          {scanError && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-md p-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {scanError}
            </div>
          )}

          <div className="grid md:grid-cols-5 gap-4">
            {/* Left: image + prescription info */}
            <div className="md:col-span-2 space-y-3">
              <div className="bg-white rounded-md border border-border overflow-hidden">
                {previewUrl ? (
                  <div style={{ height: "220px", overflow: "hidden" }}>
                    <img
                      src={previewUrl}
                      alt="Prescription"
                      style={{ width: "100%", height: "220px", objectFit: "cover", objectPosition: "top" }}
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-accent/50 flex items-center justify-center">
                    <FileText className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-4 border-t border-border">
                  <h3 className="font-semibold text-sm mb-3">Prescription Info</h3>
                  <div className="space-y-2.5">
                    {scanResult?.prescriptionDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium text-right">{scanResult.prescriptionDate}</span>
                      </div>
                    )}
                    {scanResult?.doctorName && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Doctor</span>
                        <span className="font-medium text-right max-w-[55%] truncate">{scanResult.doctorName}</span>
                      </div>
                    )}
                    {scanResult?.extractedText && (
                      <div className="flex items-start justify-between text-sm gap-2">
                        <span className="text-muted-foreground shrink-0">Notes</span>
                        <span className="font-medium text-right text-xs text-muted-foreground max-w-[60%] line-clamp-2">
                          {scanResult.extractedText.slice(0, 80)}{scanResult.extractedText.length > 80 ? "…" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={reset}
                className="w-full py-2.5 rounded-md border border-border text-sm text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Upload className="w-4 h-4" />
                Upload Another Prescription
              </button>
            </div>

            {/* Right: detected medicines */}
            <div className="md:col-span-3">
              {/* Green header banner */}
              <div className={`${meds.length > 0 ? "bg-green-500" : "bg-amber-500"} text-white rounded-t-md px-4 py-3 flex items-center gap-2`}>
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm">
                  {meds.length > 0
                    ? `${meds.length} Medicine${meds.length !== 1 ? "s" : ""} Detected from Prescription`
                    : "No Medicines Detected"}
                </span>
              </div>

              {meds.length === 0 ? (
                <div className="bg-white rounded-b-xl border border-border border-t-0 p-8 text-center">
                  <Pill className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No medicines detected. Try a clearer image.</p>
                </div>
              ) : (
                <div
                  className={`p-3 bg-white rounded-b-xl border border-border border-t-0 grid gap-3 ${
                    meds.length === 1 ? "grid-cols-1" : meds.length === 2 ? "grid-cols-2" : "grid-cols-3"
                  }`}
                >
                  {meds.map((med, i) => {
                    const { label, cls } = confidenceLabel(med.confidence);
                    return (
                      <div key={i} className="border border-border rounded-md p-3 bg-white">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded font-bold uppercase mb-2 ${cls}`}>
                          {label} Confidence
                        </span>
                        <p className="font-semibold text-sm leading-tight">{med.name}</p>
                        {med.dosage && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            <span className="font-medium text-foreground/70">Type:</span> {med.dosage}
                          </p>
                        )}
                        {med.frequency && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/70">Quantity:</span> {med.frequency}
                          </p>
                        )}
                        {med.duration && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/70">Duration:</span> {med.duration}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Generic & Cheaper Alternatives ─────────────────────────── */}
          {(genericLoading || (genericResults && genericResults.length > 0)) && (
            <div className="bg-white rounded-md border border-border p-5 space-y-5">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-green-600" />
                Generic &amp; Cheaper Alternatives
                {genericLoading && (
                  <Loader2 className="w-4 h-4 animate-spin ml-auto text-muted-foreground" />
                )}
              </h3>

              {genericLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Finding cheaper alternatives for your medicines…
                </p>
              ) : (
                <div className="space-y-6">
                  {genericResults?.map((item) => {
                    if (!item.success || !item.result) return null;
                    const { best_generic_option, cheaper_brand_alternatives, price_comparison } = item.result;

                    const cards: MedicineData[] = [];

                    if (best_generic_option) {
                      cards.push({
                        id: `generic-${item.medicine}`,
                        name: best_generic_option.name,
                        manufacturer: "Generic Medicine",
                        price: best_generic_option.mrp ?? 0,
                        originalPrice: price_comparison.original_price ?? undefined,
                        form: best_generic_option.form || String(best_generic_option.pack_size ?? ""),
                      });
                    }

                    cheaper_brand_alternatives.slice(0, 4).forEach((alt, idx) => {
                      cards.push({
                        id: `alt-${item.medicine}-${idx}`,
                        name: alt.brand_name,
                        manufacturer: alt.manufacturer || "",
                        price: alt.price ?? 0,
                        originalPrice: price_comparison.original_price ?? undefined,
                        form: alt.dosage_form || String(alt.pack_size ?? ""),
                      });
                    });

                    if (!cards.length) return null;

                    const savings = price_comparison.total_savings;

                    return (
                      <div key={item.medicine}>
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            Alternatives for:{" "}
                            <span className="text-foreground font-semibold">{item.medicine}</span>
                          </p>
                          {savings != null && savings > 0 && (
                            <span className="shrink-0 text-xs bg-green-500 text-white px-3 py-1 rounded-full font-medium flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />
                              Potential Savings: ₹{savings.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <MedicineGrid
                          medicines={cards}
                          onAddToCart={(medicine) =>
                            addToWishlist({
                              id: String(medicine.id),
                              medicineName: medicine.name,
                              genericName: medicine.genericName ?? medicine.name,
                              mrp: medicine.price,
                              unit: medicine.form ?? "strip",
                              source: medicine.source ?? "ai",
                              isGeneric: medicine.isGeneric ?? true,
                              manufacturer: medicine.manufacturer,
                              form: medicine.form,
                            })
                          }
                          getQuantity={(medicine) =>
                            getWishlistQuantity(String(medicine.id))
                          }
                          onIncrement={(medicine) => {
                            const qty = getWishlistQuantity(String(medicine.id));
                            updateWishlistQuantity(String(medicine.id), qty + 1);
                          }}
                          onDecrement={(medicine) => {
                            const qty = getWishlistQuantity(String(medicine.id));
                            if (qty > 1) updateWishlistQuantity(String(medicine.id), qty - 1);
                            else removeFromWishlist(String(medicine.id));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Quick Actions ─────────────────────────────────────────── */}
          <div className="bg-white rounded-md border border-border p-5">
            <h3 className="font-semibold text-sm mb-4">Quick Actions</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 gap-2"
                disabled={meds.length === 0}
                onClick={findVendors}
              >
                <MapPin className="w-4 h-4" />
                Find Nearby Pharmacies
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() =>
                  router.push(
                    `/user/medicines?q=${encodeURIComponent(meds[0]?.name ?? "")}`,
                  )
                }
              >
                <Search className="w-4 h-4" />
                Search Medicine Manually
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                disabled={meds.length === 0}
                onClick={askAssistant}
              >
                <MessageSquare className="w-4 h-4" />
                Ask AI About Prescription
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Finding Vendors ─────────────────────────────────────────────────
  if (step === "finding") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-linear-to-br from-primary/5 via-background to-secondary/5 p-6">
        <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">Finding Nearby Pharmacies</p>
          <p className="text-muted-foreground text-sm mt-1">
            Scanning vendors with your medicines in stock…
          </p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Step: Vendors ────────────────────────────────────────────────────────
  if (step === "vendors") {
    const meds = scanResult?.detectedMedicines ?? [];
    return (
      <div className="min-h-screen bg-linear-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-6 pb-28">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("results")}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-bold text-lg">
                {vendors.length > 0
                  ? `${vendors.length} Pharmacie${vendors.length !== 1 ? "s" : ""} Found`
                  : "No Pharmacies Found"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Searching for:{" "}
                {meds
                  .slice(0, 3)
                  .map((m) => m.name)
                  .join(", ")}
                {meds.length > 3 ? ` +${meds.length - 3} more` : ""}
              </p>
            </div>
          </div>

          {vendorError && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-md p-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {vendorError}
              <button
                onClick={findVendors}
                className="ml-auto underline font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {vendors.length === 0 && !vendorError && (
            <div className="bg-white rounded-md border border-border p-10 text-center">
              <MapPin className="w-14 h-14 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-semibold text-lg">No pharmacies found</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                None of our partner pharmacies have these medicines in stock
                right now.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setStep("results")}>
                  Search Manually
                </Button>
                <Button onClick={askAssistant} className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Ask AI Assistant
                </Button>
              </div>
            </div>
          )}

          {/* Vendor Cards */}
          <div className="space-y-4">
            {vendors.map((v) => {
              const open = isOpenNow(v.store.operatingHours);
              const allRequestedNames = meds.map((m) =>
                stripDosage(m.name).toLowerCase(),
              );
              const matchCount = v.matchedItems.length;
              const totalRequested = meds.length;

              return (
                <div
                  key={v.store._id}
                  className="bg-white rounded-md border border-border overflow-hidden"
                >
                  {/* Store header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-bold text-base">
                            {v.store.storeName}
                          </h2>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${open ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {open ? "Open Now" : "Closed"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {v.store.rating > 0 && (
                            <span className="text-xs flex items-center gap-0.5 text-amber-600">
                              <Star className="w-3 h-3 fill-current" />
                              {v.store.rating.toFixed(1)}
                            </span>
                          )}
                          {v.store.address?.city && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {[
                                v.store.address.addressLine1,
                                v.store.address.city,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-sm font-bold ${matchCount === totalRequested ? "text-green-600" : matchCount > 0 ? "text-amber-600" : "text-red-500"}`}
                        >
                          {matchCount}/{totalRequested}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          medicines
                        </p>
                      </div>
                    </div>

                    {/* Delivery / min order */}
                    <div className="flex items-center gap-4 mt-2">
                      {v.store.deliveryAvailable ? (
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                          <Truck className="w-3 h-3 text-green-500" />
                          Delivery{" "}
                          {v.store.deliveryCharge === 0
                            ? "Free"
                            : `₹${v.store.deliveryCharge}`}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Pickup only
                        </span>
                      )}
                      {v.store.minimumOrderAmount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Min. ₹{v.store.minimumOrderAmount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Matched medicines */}
                  <div className="p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Available Medicines
                    </p>
                    <div className="space-y-2">
                      {v.matchedItems.map((item) => {
                        const qty = getQuantity(item._id);
                        const inCart = qty > 0;
                        const justAdded = addedMap[item._id];

                        return (
                          <div
                            key={item._id}
                            className="flex items-center gap-3 p-2.5 rounded-md bg-accent/40 hover:bg-accent/70 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Pill className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.medicineName}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-bold text-primary">
                                  ₹{item.vendorPrice}
                                </span>
                                {item.mrp > item.vendorPrice && (
                                  <>
                                    <span className="text-xs text-muted-foreground line-through">
                                      ₹{item.mrp}
                                    </span>
                                    <span className="text-xs text-green-600 flex items-center gap-0.5">
                                      <TrendingDown className="w-3 h-3" />
                                      {Math.round(
                                        ((item.mrp - item.vendorPrice) /
                                          item.mrp) *
                                          100,
                                      )}
                                      % off
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {inCart ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    updateQuantity(item._id, qty - 1)
                                  }
                                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-medium">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => handleAddToCart(item, v)}
                                  className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddToCart(item, v)}
                                className="flex items-center gap-1 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap"
                              >
                                <Plus className="w-3 h-3" />
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Show un-matched medicines */}
                      {meds
                        .filter(
                          (m) =>
                            !v.matchedItems.some(
                              (i) =>
                                i.medicineName
                                  .toLowerCase()
                                  .includes(
                                    stripDosage(m.name).toLowerCase(),
                                  ) ||
                                i.genericName
                                  ?.toLowerCase()
                                  .includes(stripDosage(m.name).toLowerCase()),
                            ),
                        )
                        .map((m, idx) => (
                          <div
                            key={`nm-${idx}`}
                            className="flex items-center gap-3 p-2.5 rounded-md bg-red-50/60 opacity-60"
                          >
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                              <X className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-muted-foreground truncate">
                                {m.name}
                              </p>
                              <p className="text-xs text-red-400">
                                Not available at this store
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        router.push(`/user/pharmacy/${v.store._id}`)
                      }
                    >
                      View Store
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => {
                        v.matchedItems.forEach((item) => {
                          if (getQuantity(item._id) === 0)
                            handleAddToCart(item, v);
                        });
                      }}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add All to Cart
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border p-3 flex gap-3 max-w-4xl mx-auto">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={askAssistant}
          >
            <MessageSquare className="w-4 h-4" />
            Ask AI Assistant
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => router.push("/user/order/cart")}
          >
            <ShoppingCart className="w-4 h-4" />
            View Cart
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
