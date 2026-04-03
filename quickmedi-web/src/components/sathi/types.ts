export type Symptom =
  | "Cramps"
  | "Headache"
  | "Fatigue"
  | "Bloating"
  | "Mood Swings"
  | "Back Pain"
  | "Acne"
  | "Nausea"
  | "Sleep Issues";

export type Phase = "Menstrual" | "Follicular" | "Ovulation" | "Luteal";

export interface CycleData {
  lastPeriodDate: string; // "YYYY-MM-DD"
  cycleLength: number;
}

export interface ComputedCycle {
  currentDay: number;
  progress: number;
  nextPeriodIn: number;
  phase: Phase;
  cycleLength: number;
  lastPeriodDate: string;
}

/** Derives live cycle metrics from raw user settings */
export function computeCycle(data: CycleData): ComputedCycle {
  const last = new Date(data.lastPeriodDate);
  const today = new Date();
  // Zero out time portions for accurate day diff
  last.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - last.getTime()) / 86_400_000);
  const currentDay = (diffDays % data.cycleLength) + 1;
  const progress = Math.round((currentDay / data.cycleLength) * 100);
  const nextPeriodIn = data.cycleLength - currentDay;

  let phase: Phase;
  if (currentDay <= 5) phase = "Menstrual";
  else if (currentDay <= 13) phase = "Follicular";
  else if (currentDay === 14) phase = "Ovulation";
  else phase = "Luteal";

  return {
    currentDay,
    progress,
    nextPeriodIn,
    phase,
    cycleLength: data.cycleLength,
    lastPeriodDate: data.lastPeriodDate,
  };
}

export const PHASE_CONFIG: Record<
  Phase,
  { color: string; bg: string; description: string }
> = {
  Menstrual: {
    color: "text-red-500",
    bg: "bg-red-100",
    description: "Your period is here. Rest and take it easy.",
  },
  Follicular: {
    color: "text-orange-400",
    bg: "bg-orange-50",
    description: "Energy rising. A great time to start new things.",
  },
  Ovulation: {
    color: "text-amber-500",
    bg: "bg-amber-50",
    description: "Peak energy and confidence. You're at your best.",
  },
  Luteal: {
    color: "text-orange-600",
    bg: "bg-orange-100",
    description: "Winding down. Listen to your body's needs.",
  },
};

export const SYMPTOM_RELIEF: Record<Symptom, { icon: string; text: string }[]> = {
  Cramps: [
    { icon: "pill", text: "Ibuprofen (pain relief) – follow dosage as advised by your clinician or on pack." },
    { icon: "flame", text: "Heating pad therapy – 15–20 minutes on your lower abdomen can ease cramps." },
  ],
  Headache: [
    { icon: "pill", text: "Paracetamol 500 mg – take with water as directed on pack." },
    { icon: "moon", text: "Rest in a cool, dark room and avoid screen glare." },
  ],
  Fatigue: [
    { icon: "droplets", text: "Hydration reminder – sip water regularly to support energy and mood." },
    { icon: "leaf", text: "Iron-rich snacks (spinach, nuts, seeds) can combat hormonal fatigue." },
  ],
  Bloating: [
    { icon: "leaf", text: "Fennel or peppermint tea – can relieve digestive discomfort naturally." },
    { icon: "ban", text: "Avoid carbonated drinks and salty foods until bloating subsides." },
  ],
  "Mood Swings": [
    { icon: "leaf", text: "Magnesium glycinate supplement may help stabilise mood hormones." },
    { icon: "activity", text: "A 20-minute walk can boost serotonin and ease emotional tension." },
  ],
  "Back Pain": [
    { icon: "flame", text: "Heat therapy on your lower back for 15–20 minutes can relax muscles." },
    { icon: "activity", text: "Gentle stretching or yoga poses (child's pose) can relieve tension." },
  ],
  Acne: [
    { icon: "droplets", text: "Salicylic acid face wash – gentle cleanse morning and night." },
    { icon: "ban", text: "Avoid touching your face and swap to a clean pillowcase." },
  ],
  Nausea: [
    { icon: "leaf", text: "Ginger tea or ginger chews – a natural remedy for hormonal nausea." },
    { icon: "utensils", text: "Eat small, frequent meals rather than large portions." },
  ],
  "Sleep Issues": [
    { icon: "moon", text: "Melatonin (0.5–1 mg) 30 minutes before bed can help regulate sleep." },
    { icon: "ban", text: "Limit screens 1 hour before bed and keep your room cool." },
  ],
};
