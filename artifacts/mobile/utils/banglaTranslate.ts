const EN_TO_BN_DIGIT: Record<string, string> = {
  "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
  "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯",
};

type Replacement = string | ((match: string, ...captures: string[]) => string);

export function tobnDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => EN_TO_BN_DIGIT[d] ?? d);
}

const PHRASE_MAP: [RegExp, Replacement][] = [
  // ── Dosing schedule patterns ──────────────────────────────────────────
  [/\b1\s*\+\s*1\s*\+\s*1\b/gi, "১+১+১"],
  [/\b1\s*\+\s*0\s*\+\s*1\b/gi, "১+০+১"],
  [/\b1\s*\+\s*0\s*\+\s*0\b/gi, "১+০+০"],
  [/\b0\s*\+\s*0\s*\+\s*1\b/gi, "০+০+১"],
  [/\b0\s*\+\s*1\s*\+\s*0\b/gi, "০+১+০"],
  [/\b1\s*\+\s*1\s*\+\s*0\b/gi, "১+১+০"],
  [/\b2\s*\+\s*0\s*\+\s*2\b/gi, "২+০+২"],
  [/\b2\s*\+\s*2\s*\+\s*2\b/gi, "২+২+২"],
  [/\b(\d)\s*\+\s*(\d)\s*\+\s*(\d)\b/g, (_match: string, a: string, b: string, c: string) =>
    `${tobnDigits(a)}+${tobnDigits(b)}+${tobnDigits(c)}`],

  // ── Frequency ──────────────────────────────────────────────────────────
  [/\b(once|1\s*time)\s*(a\s*day|daily|per\s*day)\b/gi, "দিনে ১ বার"],
  [/\b(twice|two\s*times?|2\s*times?)\s*(a\s*day|daily|per\s*day)\b/gi, "দিনে ২ বার"],
  [/\b(thrice|three\s*times?|3\s*times?)\s*(a\s*day|daily|per\s*day)\b/gi, "দিনে ৩ বার"],
  [/\b(four\s*times?|4\s*times?)\s*(a\s*day|daily|per\s*day)\b/gi, "দিনে ৪ বার"],
  [/\b(five\s*times?|5\s*times?)\s*(a\s*day|daily|per\s*day)\b/gi, "দিনে ৫ বার"],
  [/\b(six\s*times?|6\s*times?)\s*(a\s*day|daily|per\s*day)\b/gi, "দিনে ৬ বার"],
  [/\bQID\b/gi, "দিনে ৪ বার"],
  [/\bTDS\b/gi, "দিনে ৩ বার"],
  [/\bTID\b/gi, "দিনে ৩ বার"],
  [/\bBD\b/gi, "দিনে ২ বার"],
  [/\bBID\b/gi, "দিনে ২ বার"],
  [/\bOD\b/gi, "দিনে ১ বার"],
  [/\bHS\b/gi, "রাতে ঘুমানোর আগে"],
  [/\bat\s*bed\s*time\b/gi, "রাতে ঘুমানোর আগে"],
  [/\bat\s*night\b/gi, "রাতে"],

  // ── Drop count ────────────────────────────────────────────────────────
  [/\b1\s*drop\b/gi, "১ ফোটা"],
  [/\b2\s*drops?\b/gi, "২ ফোটা"],
  [/\b3\s*drops?\b/gi, "৩ ফোটা"],
  [/\bone\s*drop\b/gi, "১ ফোটা"],
  [/\btwo\s*drops?\b/gi, "২ ফোটা"],

  // ── Eye laterality ────────────────────────────────────────────────────
  [/\bin\s*both\s*eyes?\b/gi, "উভয় চোখে"],
  [/\bin\s*(the\s*)?right\s*eye\b/gi, "ডান চোখে"],
  [/\bin\s*(the\s*)?left\s*eye\b/gi, "বাম চোখে"],
  [/\bin\s*(the\s*)?affected\s*eye\b/gi, "আক্রান্ত চোখে"],
  [/\bRE\b/g, "ডান চোখে"],
  [/\bLE\b/g, "বাম চোখে"],
  [/\bBE\b/g, "উভয় চোখে"],

  // ── Duration ─────────────────────────────────────────────────────────
  [/\bfor\s*(\d+)\s*days?\b/gi, (_match: string, n: string) => `${tobnDigits(n)} দিন পর্যন্ত`],
  [/\bfor\s*(\d+)\s*weeks?\b/gi, (_match: string, n: string) => `${tobnDigits(n)} সপ্তাহ পর্যন্ত`],
  [/\bfor\s*(\d+)\s*months?\b/gi, (_match: string, n: string) => `${tobnDigits(n)} মাস পর্যন্ত`],
  [/\bfor\s*(\d+)\s*years?\b/gi, (_match: string, n: string) => `${tobnDigits(n)} বছর পর্যন্ত`],
  [/\b(\d+)\s*days?\b/gi, (_match: string, n: string) => `${tobnDigits(n)} দিন`],
  [/\b(\d+)\s*weeks?\b/gi, (_match: string, n: string) => `${tobnDigits(n)} সপ্তাহ`],
  [/\b(\d+)\s*months?\b/gi, (_match: string, n: string) => `${tobnDigits(n)} মাস`],
  [/\b(\d+)\s*years?\b/gi, (_match: string, n: string) => `${tobnDigits(n)} বছর`],

  // ── Follow-up periods ────────────────────────────────────────────────
  [/\b1\s*week\b/gi, "১ সপ্তাহ"],
  [/\b2\s*weeks?\b/gi, "২ সপ্তাহ"],
  [/\b1\s*month\b/gi, "১ মাস"],
  [/\b3\s*months?\b/gi, "৩ মাস"],
  [/\b6\s*months?\b/gi, "৬ মাস"],
  [/\b1\s*year\b/gi, "১ বছর"],
  [/\bas\s*needed\b/gi, "প্রয়োজন হলে"],
  [/\bSOS\b/gi, "প্রয়োজন হলে"],
  [/\bPRN\b/gi, "প্রয়োজন হলে"],

  // ── Common ophthalmic advice ─────────────────────────────────────────
  [/\bwear\s*glasses?\s*constantly\b/gi, "সার্বক্ষণিক চশমা পরুন"],
  [/\bfor\s*constant\s*use\b/gi, "সার্বক্ষণিক ব্যবহারের জন্য"],
  [/\bfor\s*distance\s*only\b/gi, "শুধুমাত্র দূরের জন্য"],
  [/\bfor\s*near\s*only\b/gi, "শুধুমাত্র কাছের জন্য"],
  [/\bfor\s*reading\b/gi, "পড়ার সময়"],
  [/\bdo\s*not\s*rub\s*your\s*eyes?\b/gi, "চোখ ঘষবেন না"],
  [/\bdo\s*not\s*rub\s*(the\s*)?eyes?\b/gi, "চোখ ঘষবেন না"],
  [/\bavoid\s*dusty\s*(environment|area)?\b/gi, "ধুলোবালি এড়িয়ে চলুন"],
  [/\buse\s*dark\s*glasses?\b/gi, "কালো চশমা ব্যবহার করুন"],
  [/\bwear\s*(sun|dark)\s*glasses?\b/gi, "রোদে কালো চশমা পরুন"],
  [/\bwash\s*your\s*hands\b/gi, "হাত ধুয়ে নিন"],
  [/\bbefore\s*instilling\s*(drops?)?\b/gi, "ড্রপ দেওয়ার আগে"],
  [/\bapply\s*ointment\b/gi, "মলম লাগান"],
  [/\buse\s*as\s*directed\b/gi, "নির্দেশমতো ব্যবহার করুন"],
  [/\bcontinue\s*medication\b/gi, "ওষুধ চালিয়ে যান"],
  [/\bdo\s*not\s*stop\s*medication\b/gi, "ওষুধ বন্ধ করবেন না"],
  [/\bcome\s*back\s*if\s*there\s*is\b/gi, "নিচের সমস্যা হলে আসুন:"],
  [/\bcome\s*back\s*if\b/gi, "যদি হয় তাহলে আসুন"],
  [/\breturn\s*to\s*clinic\b/gi, "ক্লিনিকে ফিরে আসুন"],
  [/\bfollow\s*up\s*in\b/gi, "পরবর্তী ভিজিট"],
  [/\bavoid\s*reading\s*in\s*dim\s*light\b/gi, "আবছা আলোতে পড়বেন না"],
  [/\brest\s*your\s*eyes?\b/gi, "চোখকে বিশ্রাম দিন"],
  [/\bscreen\s*time\b/gi, "স্ক্রিনের সামনে কম থাকুন"],
  [/\breduce\s*screen\s*time\b/gi, "স্ক্রিনের সামনে কম থাকুন"],
  [/\bdo\s*not\s*drive\b/gi, "গাড়ি চালাবেন না"],
  [/\bblood\s*pressure\b/gi, "রক্তচাপ"],
  [/\bblood\s*sugar\b/gi, "রক্তের সুগার"],
  [/\bblood\s*glucose\b/gi, "রক্তের গ্লুকোজ"],
  [/\bcontrol\s*diabetes\b/gi, "ডায়াবেটিস নিয়ন্ত্রণে রাখুন"],
  [/\bcontrol\s*blood\s*pressure\b/gi, "রক্তচাপ নিয়ন্ত্রণে রাখুন"],

  // ── Common drug route abbreviations ──────────────────────────────────
  [/\beye\s*drops?\b/gi, "আই ড্রপ"],
  [/\beye\s*ointment\b/gi, "আই অয়েন্টমেন্ট"],
  [/\boral\b/gi, "মুখে খাবার"],
  [/\btopical\b/gi, "সরাসরি চোখে"],

  // ── Remaining plain digits ────────────────────────────────────────────
  [/\d/g, (d: string) => tobnDigits(d)],
];

export function translateToBangla(text: string): string {
  if (!text.trim()) return text;
  let result = text;
  for (const [pattern, replacement] of PHRASE_MAP) {
    if (typeof replacement === "string") {
      result = result.replace(pattern, replacement);
    } else {
      result = result.replace(pattern, replacement);
    }
  }
  return result;
}

export function translateDosingSchedule(schedule: string): string {
  return tobnDigits(schedule).replace(/\+/g, "+");
}

export function isAlreadyBangla(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

const ACCEPTED_CLINICAL_TOKENS = new Set([
  "bd", "be", "bid", "hs", "le", "od", "prn", "qid", "re", "sos", "tds", "tid",
  "g", "gm", "mcg", "mg", "ml", "mm", "mmhg",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the meaningful Latin-script words that would still be patient-facing
 * in a Bangla instruction. Medication names and standard clinical shorthand are
 * intentionally ignored.
 */
export function getUntranslatedEnglishWords(
  text: string,
  medicationNames: string[] = [],
): string[] {
  if (!text.trim()) return [];

  let reviewText = text;
  for (const medicationName of medicationNames.map((name) => name.trim()).filter(Boolean)) {
    reviewText = reviewText.replace(new RegExp(`\\b${escapeRegExp(medicationName)}\\b`, "gi"), " ");
  }

  const words = reviewText.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  return words.filter((word, index) => {
    const normalized = word.toLowerCase().replace(/['-]/g, "");
    if (normalized.length < 2 || ACCEPTED_CLINICAL_TOKENS.has(normalized)) return false;
    return words.findIndex((candidate) => candidate.toLowerCase() === word.toLowerCase()) === index;
  });
}
