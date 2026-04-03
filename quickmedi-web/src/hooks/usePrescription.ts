/**
 * usePrescription – manage prescription upload and history
 */
import { useState, useCallback } from "react";
import { prescriptionService } from "@/services/prescription.service";
import type { Prescription } from "@/types/api-types";

interface UsePrescriptionReturn {
  prescriptions: Prescription[];
  currentPrescription: Prescription | null;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  fetchHistory: (params?: { page?: number; limit?: number }) => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  upload: (file: File, notes?: string) => Promise<Prescription | null>;
  remove: (id: string) => Promise<void>;
}

export function usePrescription(): UsePrescriptionReturn {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [currentPrescription, setCurrentPrescription] = useState<Prescription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (_params?: { page?: number; limit?: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await prescriptionService.getPrescriptionHistory();
      if (res.success) setPrescriptions(res.data ?? []);
      else setError(res.message ?? "Failed to load prescriptions");
    } catch (e: any) {
      setError(e.message ?? "Failed to load prescriptions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchById = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await prescriptionService.getPrescriptionById(id);
      if (res.success) setCurrentPrescription(res.data ?? null);
      else setError(res.message ?? "Failed to load prescription");
    } catch (e: any) {
      setError(e.message ?? "Failed to load prescription");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upload = useCallback(async (file: File, _notes?: string): Promise<Prescription | null> => {
    setIsUploading(true);
    setError(null);
    try {
      const res = await prescriptionService.uploadPrescription(file);
      if (res.success) {
        if (res.data) {
          setPrescriptions((prev) => [res.data!, ...prev]);
          setCurrentPrescription(res.data);
        }
        return res.data ?? null;
      } else {
        setError(res.message ?? "Upload failed");
        return null;
      }
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await prescriptionService.deletePrescription(id);
      if (res.success) {
        setPrescriptions((prev) => prev.filter((p) => p._id !== id));
        if (currentPrescription?._id === id) setCurrentPrescription(null);
      } else {
        setError(res.message ?? "Failed to delete prescription");
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to delete prescription");
    } finally {
      setIsLoading(false);
    }
  }, [currentPrescription]);

  return { prescriptions, currentPrescription, isLoading, isUploading, error, fetchHistory, fetchById, upload, remove };
}
