// ─── Core Data Types ──────────────────────────────────────────────────────────

export interface PregnancyData {
  dueDate: string; // "YYYY-MM-DD"
}

export interface ComputedPregnancy {
  weeksPregnant: number;
  progress: number; // 0–100
  trimester: "First" | "Second" | "Third";
  dueDate: string;
  dueDateFormatted: string;
}

// ─── Compute Pregnancy State ──────────────────────────────────────────────────

export function computePregnancy(data: PregnancyData): ComputedPregnancy {
  const due = new Date(data.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const totalDays = 280; // 40 weeks
  const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
  const daysPregnant = Math.max(0, Math.min(totalDays, totalDays - daysUntilDue));
  const weeksPregnant = Math.floor(daysPregnant / 7);
  const progress = Math.round((daysPregnant / totalDays) * 100);

  let trimester: "First" | "Second" | "Third";
  if (weeksPregnant <= 13) trimester = "First";
  else if (weeksPregnant <= 26) trimester = "Second";
  else trimester = "Third";

  const dueDateFormatted = due.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return { weeksPregnant, progress, trimester, dueDate: data.dueDate, dueDateFormatted };
}

// ─── Baby Info By Week ────────────────────────────────────────────────────────

export type BabyInfoEntry = {
  size: string;
  sizeEmoji: string;
  description: string;
  milestones: string[];
};

export const BABY_INFO_BY_WEEK: Record<number, BabyInfoEntry> = {
  4:  { size: "a poppy seed",         sizeEmoji: "🌱", description: "The embryo has just implanted. The neural tube that will become the brain and spinal cord is forming.",                          milestones: ["Implantation complete", "Neural tube forming", "Heart cells developing"] },
  5:  { size: "a sesame seed",        sizeEmoji: "🌿", description: "The embryo's heart has started to beat. Tiny buds that will become arms and legs are forming.",                                  milestones: ["Heart starts beating", "Arm & leg buds forming", "Brain developing rapidly"] },
  6:  { size: "a lentil",             sizeEmoji: "🟢", description: "Baby's heart beats around 100–160 times/min. Facial features are beginning to take shape.",                                     milestones: ["Heart beats ~110 times/min", "Facial features forming", "Lungs starting to develop"] },
  7:  { size: "a blueberry",          sizeEmoji: "🫐", description: "Growing rapidly. Hands and feet are forming and the embryo produces its own blood cells.",                                       milestones: ["Hands and feet forming", "Produces own blood cells", "Eyes and ears taking shape"] },
  8:  { size: "a raspberry",          sizeEmoji: "🍒", description: "Baby's fingers and toes have separated. Nerve cells are branching and connecting in the brain.",                                 milestones: ["Fingers and toes defined", "Nerve cells branching", "Taste buds forming"] },
  9:  { size: "a cherry",             sizeEmoji: "🍒", description: "Baby is officially a fetus now! All essential organs and structures are present and growing.",                                   milestones: ["Officially a fetus", "All organs present", "Eyelids forming"] },
  10: { size: "a strawberry",         sizeEmoji: "🍓", description: "Baby can swallow and kick. Tiny fingernails are starting to develop on the fingers.",                                           milestones: ["Baby can swallow", "Tiny fingernails growing", "Kidneys producing urine"] },
  11: { size: "a fig",                sizeEmoji: "🫘", description: "Baby's fingers and toes are no longer webbed. Hair follicles, tooth buds, and nail beds are forming.",                          milestones: ["Fingers fully separated", "Hair follicles forming", "Tooth buds developing"] },
  12: { size: "a lime",               sizeEmoji: "🍋", description: "Baby's reflexes are developing. Organs are formed and now focus on growth and maturation.",                                     milestones: ["Reflexes developing", "All organs fully formed", "Face looks more human"] },
  13: { size: "a peach",              sizeEmoji: "🍑", description: "Baby can make facial expressions. Fingerprints are beginning to form on the tiny fingers.",                                     milestones: ["Facial expressions beginning", "Fingerprints forming", "Intestines moving into belly"] },
  14: { size: "a lemon",              sizeEmoji: "🍋", description: "Baby is developing fine hair called lanugo over the body. The roof of the mouth is forming.",                                    milestones: ["Lanugo hair developing", "Roof of mouth forming", "Baby can squint"] },
  15: { size: "an apple",             sizeEmoji: "🍏", description: "Baby's senses are developing. They may respond to light, and their hearing is improving.",                                      milestones: ["Responds to light", "Hearing developing", "Skeleton hardening"] },
  16: { size: "an avocado",           sizeEmoji: "🥑", description: "Baby can make sucking movements and grasp with tiny hands. Eyes are sensitive to light.",                                       milestones: ["Sucking movements", "Can grasp", "Eyes sensitive to light"] },
  17: { size: "a pear",               sizeEmoji: "🍐", description: "Baby is developing fat stores under the skin. The umbilical cord is growing stronger.",                                         milestones: ["Fat stores developing", "Umbilical cord stronger", "Skeleton still hardening"] },
  18: { size: "a sweet potato",       sizeEmoji: "🍠", description: "You may soon feel baby's movements! The nervous system is rapidly developing.",                                                 milestones: ["Movements may be felt", "Nervous system developing", "Ears fully functional"] },
  19: { size: "a mango",              sizeEmoji: "🥭", description: "Baby is covered in vernix caseosa, a waxy coating that protects the skin.",                                                     milestones: ["Vernix coating forming", "Sensory brain developing", "Baby yawning and hiccupping"] },
  20: { size: "a banana",             sizeEmoji: "🍌", description: "Halfway there! Baby is swallowing and practising breathing with amniotic fluid.",                                              milestones: ["🎉 Halfway milestone!", "Swallowing amniotic fluid", "Sleep/wake cycles forming"] },
  21: { size: "a carrot",             sizeEmoji: "🥕", description: "Baby's eyebrows and eyelids are fully formed. They can now blink their eyes.",                                                  milestones: ["Eyebrows formed", "Baby can blink", "Sucking reflex strengthening"] },
  22: { size: "a coconut",            sizeEmoji: "🥥", description: "Baby looks like a tiny newborn. Lips, eyelids, and eyebrows are now distinct.",                                                 milestones: ["Looks like a newborn", "Grip reflex forming", "Responds to sound"] },
  23: { size: "a large mango",        sizeEmoji: "🥭", description: "Baby's muscle coordination is improving. They can now hear conversations around you.",                                          milestones: ["Hears conversations", "Muscle coordination", "Bones hardening more"] },
  24: { size: "an ear of corn",       sizeEmoji: "🌽", description: "Baby's face is almost fully formed. Brain is growing rapidly and baby responds to your voice.",                                 milestones: ["Face fully formed", "Responds to your voice", "Lungs developing air sacs"] },
  25: { size: "an acorn squash",      sizeEmoji: "🎃", description: "Baby is growing plump and filling out its wrinkled skin. The inner ear is fully developed.",                                    milestones: ["Inner ear developed", "Fat filling out skin", "Lung surfactant forming"] },
  26: { size: "a scallion",           sizeEmoji: "🌿", description: "Baby's eyes are beginning to open. They can even blink in response to bright light.",                                           milestones: ["Eyes beginning to open", "Responds to bright light", "Immune system developing"] },
  27: { size: "a cauliflower",        sizeEmoji: "🥦", description: "Third trimester begins! Baby is practising breathing and can recognise your voice.",                                            milestones: ["Third trimester starts!", "Practising breathing", "Recognises your voice"] },
  28: { size: "an eggplant",          sizeEmoji: "🍆", description: "Baby can open and close their eyes. Brain is developing rapidly with crucial folds and grooves.",                               milestones: ["Eyes open and close", "Brain growing rapidly", "REM sleep cycles beginning"] },
  29: { size: "a butternut squash",   sizeEmoji: "🎃", description: "Baby's muscles and lungs are continuing to develop. Head is growing to accommodate the brain.",                                 milestones: ["Muscles developing", "Head growing", "Bones fully developed"] },
  30: { size: "a head of cabbage",    sizeEmoji: "🥬", description: "Baby is gaining about half a pound a week. The lanugo hair is beginning to fall off.",                                         milestones: ["Gaining weight rapidly", "Lanugo falling off", "Toenails now visible"] },
  31: { size: "a bunch of asparagus", sizeEmoji: "🥦", description: "Baby can now turn their head from side to side. All five senses are functional.",                                              milestones: ["All five senses active", "Turns head side to side", "Immune system building"] },
  32: { size: "a jicama",             sizeEmoji: "🥔", description: "Baby is practising breathing and swallowing. Most major development is complete.",                                              milestones: ["Practising breathing", "Bones fully developed", "Iron stores building"] },
  33: { size: "a pineapple",          sizeEmoji: "🍍", description: "Baby's skull stays flexible to allow easy passage during birth. Gaining about 200g per week.",                                  milestones: ["Skull stays flexible", "Gaining 200g/week", "Baby dropping into position"] },
  34: { size: "a cantaloupe",         sizeEmoji: "🍈", description: "Central nervous system and lungs are maturing. If born now, very high chance of healthy development.",                          milestones: ["Lungs nearly mature", "CNS maturing", "High survival rate if born"] },
  35: { size: "a honeydew melon",     sizeEmoji: "🍈", description: "Baby's kidneys are fully developed. Most internal development is now complete.",                                                milestones: ["Kidneys fully developed", "Internal organs complete", "Muscles and bones strong"] },
  36: { size: "a large cantaloupe",   sizeEmoji: "🍈", description: "Baby is considered late preterm. Most systems are mature and baby is gaining about 30g per day.",                              milestones: ["Late preterm milestone", "Systems nearly mature", "Gaining 30g/day"] },
  37: { size: "a winter melon",       sizeEmoji: "🍈", description: "Baby is now considered early term! Lungs are likely mature. Practising breathing movements.",                                   milestones: ["Early term milestone!", "Lungs likely mature", "Practising breathing"] },
  38: { size: "a leek",               sizeEmoji: "🌿", description: "Baby may have a full head of hair! Most babies born now thrive without medical support.",                                       milestones: ["Full term approaching", "Vernix still present", "Baby in position for birth"] },
  39: { size: "a small watermelon",   sizeEmoji: "🍉", description: "Your baby is full term! All organs are ready and baby is just gaining weight now.",                                             milestones: ["Full term!", "All organs ready", "Ready for birth at any time"] },
  40: { size: "a pumpkin",            sizeEmoji: "🎃", description: "Baby is fully developed and ready to meet you! Average weight is about 3.4 kg (7.5 lbs).",                                    milestones: ["Fully developed", "Average weight ~3.4 kg", "Ready for birth 🎉"] },
};

export function getBabyInfo(week: number): BabyInfoEntry {
  if (BABY_INFO_BY_WEEK[week]) return BABY_INFO_BY_WEEK[week];
  const keys = Object.keys(BABY_INFO_BY_WEEK).map(Number).sort((a, b) => a - b);
  const nearest = keys.reduce((prev, curr) =>
    Math.abs(curr - week) < Math.abs(prev - week) ? curr : prev
  );
  return BABY_INFO_BY_WEEK[nearest];
}

// ─── Nutrition Tips By Trimester ──────────────────────────────────────────────

export const NUTRITION_BY_TRIMESTER: Record<
  "First" | "Second" | "Third",
  { icon: string; tip: string }[]
> = {
  First: [
    { icon: "leaf",     tip: "Take folic acid daily to support neural tube development." },
    { icon: "droplets", tip: "Stay hydrated — aim for 8–10 glasses of water per day." },
    { icon: "ban",      tip: "Avoid raw fish, unpasteurised cheese, and deli meats." },
    { icon: "utensils", tip: "Eat small, frequent meals to manage morning sickness." },
    { icon: "zap",      tip: "Ginger tea or crackers can ease nausea naturally." },
  ],
  Second: [
    { icon: "utensils", tip: "Increase iron intake — lean meats, spinach, and legumes." },
    { icon: "utensils", tip: "Boost calcium with dairy, tofu, or fortified plant milks." },
    { icon: "utensils", tip: "Include omega-3 foods like cooked salmon for brain development." },
    { icon: "leaf",     tip: "Eat vitamin A-rich vegetables like carrots and sweet potatoes." },
    { icon: "droplets", tip: "Keep drinking plenty of water as blood volume increases." },
  ],
  Third: [
    { icon: "zap",      tip: "Increase calorie intake slightly — about 300 extra calories/day." },
    { icon: "leaf",     tip: "Eat fibre-rich foods to ease constipation." },
    { icon: "droplets", tip: "Keep fluid intake high to prevent swelling and dehydration." },
    { icon: "ban",      tip: "Avoid large meals close to bedtime to reduce heartburn." },
    { icon: "utensils", tip: "Iron and calcium remain essential — keep up your supplements." },
  ],
};
