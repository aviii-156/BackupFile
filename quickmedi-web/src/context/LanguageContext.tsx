"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG, STORAGE_KEYS } from "@/lib/api-config";

type SupportedLanguage = "en" | "hi";

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const LANG_KEY = "quickmedi_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<SupportedLanguage>("en");

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY) as SupportedLanguage;
      if (stored === "en" || stored === "hi") setLang(stored);
    } catch {}
  }, []);

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    setLang(lang);
    localStorage.setItem(LANG_KEY, lang);

    // Persist to backend if authenticated
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
      if (token && role === "patient") {
        await apiClient.put("/api/patient/language", { language: lang });
      }
    } catch {}
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
