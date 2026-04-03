/**
 * useMedicineScanner – upload prescription and extract medicine data via OCR + AI
 */
import { useState, useCallback } from "react";
import { prescriptionService } from "@/services/prescription.service";

interface ScannedMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  confidence: number;
}

interface ScanResult {
  extractedText: string;
  medicines: ScannedMedicine[];
  doctorName?: string;
  prescriptionDate?: string;
  warnings?: string[];
}

export function useMedicineScanner() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanPrescription = useCallback(async (file: File) => {
    setIsScanning(true);
    setError(null);
    try {
      // Try full AI parse first, fall back to extract-medicines
      try {
        const res = await prescriptionService.parsePrescription(file);
        if (res.success && res.data) {
          setScanResult({
            extractedText: res.data.extractedText,
            medicines: res.data.detectedMedicines,
            doctorName: res.data.doctorName,
            prescriptionDate: res.data.prescriptionDate,
          });
          return res.data;
        }
      } catch {}

      // Fallback: extract-medicines endpoint
      const res = await prescriptionService.extractMedicines(file);
      if (res.success && res.data) {
        setScanResult({
          extractedText: "",
          medicines: res.data.medicines.map((name) => ({ name, confidence: 1 })),
        });
        return res.data;
      } else {
        setError(res.message ?? "Scan failed");
        return null;
      }
    } catch (e: any) {
      setError(e.message ?? "Scan failed");
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setScanResult(null);
    setError(null);
  }, []);

  return { scanResult, isScanning, error, scanPrescription, reset };
}
