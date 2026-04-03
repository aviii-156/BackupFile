/**
 * useAdminStats – fetch and cache admin dashboard statistics
 */
import { useState, useCallback } from "react";
import { adminService } from "@/services/admin.service";

interface AdminDashboardData {
  stats: Record<string, any>;
  recentActivity: any[];
  pendingVendors: number;
}

export function useAdminStats() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminService.getDashboard();
      if (res.success && res.data) setData(res.data as any);
      else setError(res.message ?? "Failed to load dashboard");
    } catch (e: any) {
      setError(e.message ?? "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, fetchDashboard };
}
