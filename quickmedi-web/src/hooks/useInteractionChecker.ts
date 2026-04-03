/**
 * useInteractionChecker – check drug-drug interactions via AI service
 */
import { useState, useCallback } from "react";
import { interactionService } from "@/services/interaction.service";

interface DrugInteraction {
  medicine1: string;
  medicine2: string;
  severity: "minor" | "moderate" | "severe";
  description: string;
  recommendation: string;
}

interface InteractionResult {
  interactions: DrugInteraction[];
  duplicates: any[];
  warnings: string[];
  safe_to_take: boolean;
}

export function useInteractionChecker() {
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkInteractions = useCallback(
    async (medicines: string[], conditions?: string[], allergies?: string[]) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await interactionService.comprehensiveCheck(medicines, conditions, allergies);
        if (res.success && res.data) setResult(res.data as any);
        else setError(res.message ?? "Interaction check failed");
      } catch (e: any) {
        setError(e.message ?? "Interaction check failed");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, checkInteractions, reset };
}
