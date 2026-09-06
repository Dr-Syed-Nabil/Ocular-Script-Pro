import { PrescriptionConfig, PrescriptionSectionConfig, PrescriptionSubsectionConfig } from "@/types";

export const DEFAULT_PRESCRIPTION_CONFIG: PrescriptionConfig = {
  version: 3,
  chiefComplaints: [
    "DOV",
    "Double Vision",
    "Distorted Vision",
    "Floaters/Moving Black Spots",
    "Flashes of light",
    "Dark Shadow in Visual Field",
    "Eyeache",
    "Headache",
    "Light Intolerance",
    "Redness",
    "Itching",
    "Burning Sensation",
    "FB Sensation",
    "Non-Specific Discomfort",
    "Watering",
    "Discharge",
    "Deviation of the Eye",
    "Eyelid Drooping",
    "Eyelid Swelling",
    "Forward Bulging of the Eye",
    "Impairment of Eye Movement",
  ],
  visualAcuity: ["6/6", "6/6P", "6/9", "6/9P", "6/12", "6/18", "6/24", "6/36", "6/60", "CF", "HM", "PL", "NI"],
  distanceVA: ["6/6", "6/6p", "6/9", "6/9p", "6/12", "6/18", "6/24", "6/36", "6/60", "5/60", "4/60", "3/60", "2/60", "1/60"],
  nearVA: ["N5", "N6", "N8", "N10", "N12", "Presbyopic"],
  drugRoutes: ["Eye Drops", "Eye Ointment", "Oral", "Injection", "Topical"],
  lensUsage: ["Constant use", "Distance only", "Near only", "Computer/intermediate"],
  lensType: ["Monofocal", "Bifocal", "Progressive"],
  lensCoating: ["Blue-Cut", "Photosun", "Anti-Reflective"],
  lensMaterial: ["Glass", "Plastic"],
  followUp: ["1 week", "2 weeks", "1 month", "3 months", "6 months", "1 year", "As needed"],
  sections: [
    { id: "patient", title: "Patient", enabled: true, builtIn: true },
    { id: "chiefComplaints", title: "Chief Complaints", enabled: true, builtIn: true },
    { id: "pastHistory", title: "Past History", enabled: true, builtIn: true },
    { id: "visualAcuity", title: "Visual Acuity", enabled: true, builtIn: true },
    {
      id: "examination",
      title: "Examination Findings",
      enabled: true,
      builtIn: true,
      subsections: [
        { id: "adnexa", title: "Adnexa", enabled: true, builtIn: true, options: [] },
        { id: "anteriorSegment", title: "Anterior Segment", enabled: true, builtIn: true, options: [] },
        { id: "posteriorSegment", title: "Posterior Segment", enabled: true, builtIn: true, options: [] },
      ],
    },
    { id: "gat", title: "GAT / Intraocular Pressure", enabled: true, builtIn: true },
    { id: "drugs", title: "Rx — Drugs & Medications", enabled: true, builtIn: true },
    { id: "spectacle", title: "Spectacle Correction", enabled: true, builtIn: true },
    { id: "lens", title: "Lens Options", enabled: true, builtIn: true },
    { id: "advice", title: "Advice (উপদেশ)", enabled: true, builtIn: true, options: [] },
    { id: "followUp", title: "Follow-up (পরবর্তী ভিজিট)", enabled: true, builtIn: true },
  ],
};

function cleanOptions(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const result: string[] = [];
  value.forEach((item) => {
    if (typeof item !== "string") return;
    const trimmed = item.trim();
    if (trimmed && !result.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      result.push(trimmed);
    }
  });
  return result;
}

function normalizeSubsections(
  fallback: PrescriptionSubsectionConfig[] = [],
  savedValue: unknown,
): PrescriptionSubsectionConfig[] {
  const saved = Array.isArray(savedValue) ? savedValue : [];
  const result = fallback.map((defaultSubsection) => {
    const savedSubsection = saved.find((item) => item?.id === defaultSubsection.id);
    return {
      ...defaultSubsection,
      ...(savedSubsection && typeof savedSubsection === "object" ? savedSubsection : {}),
      id: defaultSubsection.id,
      builtIn: true,
      title: typeof savedSubsection?.title === "string" && savedSubsection.title.trim()
        ? savedSubsection.title.trim()
        : defaultSubsection.title,
      enabled: savedSubsection?.enabled !== false,
      options: cleanOptions(savedSubsection?.options, defaultSubsection.options),
    };
  });
  saved
    .filter((item) => item && typeof item === "object" && item.id && !result.some((subsection) => subsection.id === item.id))
    .forEach((item) => {
      if (typeof item.title === "string" && item.title.trim()) {
        result.push({
          id: String(item.id),
          title: item.title.trim(),
          enabled: item.enabled !== false,
          builtIn: false,
          options: cleanOptions(item.options, []),
        });
      }
    });
  return result;
}

export function normalizePrescriptionConfig(raw: unknown): PrescriptionConfig {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<PrescriptionConfig>;
  const rawSections = Array.isArray(input.sections) ? input.sections : [];
  const sections = DEFAULT_PRESCRIPTION_CONFIG.sections.map((fallback) => {
    const saved = rawSections.find((section) => section?.id === fallback.id);
    return {
      ...fallback,
      ...(saved && typeof saved === "object" ? saved : {}),
      id: fallback.id,
      builtIn: true,
      title: typeof saved?.title === "string" && saved.title.trim() ? saved.title.trim() : fallback.title,
      enabled: saved?.enabled !== false,
      options: cleanOptions(saved?.options, fallback.options || []),
      subsections: normalizeSubsections(fallback.subsections, saved?.subsections),
    };
  });
  rawSections
    .filter((section) => section && typeof section === "object" && section.id && !sections.some((item) => item.id === section.id))
    .forEach((section) => {
      if (typeof section.title === "string" && section.title.trim()) {
        sections.push({
          id: String(section.id),
          title: section.title.trim(),
          enabled: section.enabled !== false,
          builtIn: false,
          options: cleanOptions(section.options, []),
          subsections: normalizeSubsections([], section.subsections),
        });
      }
    });

  const savedChiefComplaints = cleanOptions(input.chiefComplaints, []);
  const chiefComplaints = input.version === DEFAULT_PRESCRIPTION_CONFIG.version
    ? cleanOptions(savedChiefComplaints, DEFAULT_PRESCRIPTION_CONFIG.chiefComplaints)
    : cleanOptions([...DEFAULT_PRESCRIPTION_CONFIG.chiefComplaints, ...savedChiefComplaints], DEFAULT_PRESCRIPTION_CONFIG.chiefComplaints);

  return {
    version: DEFAULT_PRESCRIPTION_CONFIG.version,
    chiefComplaints,
    visualAcuity: cleanOptions(input.visualAcuity, DEFAULT_PRESCRIPTION_CONFIG.visualAcuity),
    distanceVA: cleanOptions(input.distanceVA, DEFAULT_PRESCRIPTION_CONFIG.distanceVA),
    nearVA: cleanOptions(input.nearVA, DEFAULT_PRESCRIPTION_CONFIG.nearVA),
    drugRoutes: cleanOptions(input.drugRoutes, DEFAULT_PRESCRIPTION_CONFIG.drugRoutes),
    lensUsage: cleanOptions(input.lensUsage, DEFAULT_PRESCRIPTION_CONFIG.lensUsage),
    lensType: cleanOptions(input.lensType, DEFAULT_PRESCRIPTION_CONFIG.lensType),
    lensCoating: cleanOptions(input.lensCoating, DEFAULT_PRESCRIPTION_CONFIG.lensCoating),
    lensMaterial: cleanOptions(input.lensMaterial, DEFAULT_PRESCRIPTION_CONFIG.lensMaterial),
    followUp: cleanOptions(input.followUp, DEFAULT_PRESCRIPTION_CONFIG.followUp),
    sections,
  };
}