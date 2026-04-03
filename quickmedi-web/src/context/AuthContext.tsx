"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService } from "@/services/auth.service";
import { STORAGE_KEYS } from "@/lib/api-config";
import type { User, Vendor, Admin } from "@/types/api-types";

// ─── Types ────────────────────────────────────────────────────────────────────
type UserRole = "patient" | "vendor" | "admin" | null;
type CurrentUser = User | Vendor | Admin | null;

interface AuthState {
  user: CurrentUser;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  // OTP flow
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<{ tempToken: string }>;
  // Registration
  registerPatient: (data: Parameters<typeof authService.registerPatient>[0]) => Promise<void>;
  registerVendor: (data: Parameters<typeof authService.registerVendor>[0]) => Promise<void>;
  // Admin
  adminLogin: (email: string, password: string) => Promise<{ requires2FA?: boolean }>;
  adminVerify2FA: (tempToken: string, code: string) => Promise<void>;
  // Common
  logout: () => Promise<void>;
  refreshUser: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Hydrate from localStorage on mount
  const refreshUser = useCallback(() => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE) as UserRole;

      if (token && userData && role) {
        setState({
          user: JSON.parse(userData),
          role,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState({ user: null, role: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      setState({ user: null, role: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // ── OTP ─────────────────────────────────────────────────────────────────────
  const sendOTP = async (email: string) => {
    const res = await authService.sendOTP(email);
    if (!res.success) throw new Error(res.message || "Failed to send OTP");
  };

  const verifyOTP = async (email: string, otp: string) => {
    const res = await authService.verifyOTP(email, otp);
    if (!res.success || !res.data?.tempToken)
      throw new Error(res.message || "OTP verification failed");
    return { tempToken: res.data.tempToken };
  };

  // ── Registration ─────────────────────────────────────────────────────────────
  const registerPatient = async (data: Parameters<typeof authService.registerPatient>[0]) => {
    const res = await authService.registerPatient(data);
    if (!res.success) throw new Error(res.message || "Registration failed");
    refreshUser();
  };

  const registerVendor = async (data: Parameters<typeof authService.registerVendor>[0]) => {
    const res = await authService.registerVendor(data);
    if (!res.success) throw new Error(res.message || "Vendor registration failed");
    refreshUser();
  };

  // ── Admin Auth ───────────────────────────────────────────────────────────────
  const adminLogin = async (email: string, password: string) => {
    const res = await authService.adminLogin(email, password);
    if (!res.success) throw new Error(res.message || "Admin login failed");

    // If 2FA is required the service stores tempToken but not accessToken
    const data = res.data as any;
    if (data?.requires2FA) return { requires2FA: true };

    refreshUser();
    return {};
  };

  const adminVerify2FA = async (tempToken: string, code: string) => {
    const { apiClient } = await import("@/lib/api-client");
    const { API_CONFIG } = await import("@/lib/api-config");
    const res: any = await apiClient.post(API_CONFIG.API.AUTH.ADMIN_2FA, { tempToken, code });
    if (!res.success) throw new Error(res.message || "2FA verification failed");

    if (res.data?.accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, res.data.accessToken);
      if (res.data.refreshToken)
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, res.data.refreshToken);
      if (res.data.admin) {
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(res.data.admin));
        localStorage.setItem(STORAGE_KEYS.USER_ROLE, "admin");
      }
    }
    refreshUser();
  };

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = async () => {
    await authService.logout();
    setState({ user: null, role: null, isAuthenticated: false, isLoading: false });
  };

  const value: AuthContextValue = {
    ...state,
    sendOTP,
    verifyOTP,
    registerPatient,
    registerVendor,
    adminLogin,
    adminVerify2FA,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}
