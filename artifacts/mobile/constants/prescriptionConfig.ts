import {
  PrescriptionConfig,
  PrescriptionSectionConfig,
  PrescriptionSubsectionConfig,
  RxPadOverlayConfig,
  RxPadOverlayField,
} from "@/types";
import {
  constrainRxPadOverlayField,
  normalizeRxPadImageFit,
  normalizeRxPadPaperSize,
} from "@/utils/rxPadOverlay";

export const INVESTIGATION_GROUPS = [
  {
    title: "Blood work",
    options: [
      "CBC",
      "RBS",
      "FBS",
      "2hrABF",
      "HbA1c",
      "S. Creatinine",
      "CRP",
      "S. Lysozyme",
      "Fasting lipid profile",
      "TSH, FT3, FT4",
      "HbsAg",
      "BT, CT",
      "PT",
      "APTT",
    ],
  },
  {
    title: "Radiology",
    options: [
      "CXR-PA",
      "X-Ray of the Orbits AP View and Lateral View looking up & down",
      "X-Ray PNS OM View",
      "CT of Head & Orbits",
      "MRI of Brain and Orbits",
      "MRA",
      "MRV",
    ],
  },
  {
    title: "Ophthalmic",
    options: [
      "CFP",
      "FFA",
      "ICGA",
      "FAF",
      "OCT-Macula",
      "OCT-Optic Disc",
      "HVFA 30-2",
      "HVFA 24-2",
      "HVFA 10-2",
      "Biometry",
      "B-Scan",
      "Hess Chart",
      "AS-OCT",
      "UBM",
      "Dry Eye Analysis",
      "Pentacam",
      "Specular Biomicroscopy",
    ],
  },
] as const;

export const DEFAULT_INVESTIGATION_OPTIONS = INVESTIGATION_GROUPS.flatMap((group) => [...group.options]);

export const DEFAULT_PRESCRIPTION_CONFIG: PrescriptionConfig = {
  version: 8,
  rxPadOverlay: {
    id: "nabil-a4-pad",
    name: "Nabil A4 Rx Pad",
    paperWidthMm: 210,
    paperHeightMm: 297,
    fields: [
      { id: "patient", label: "Patient particulars", enabled: true, x: 6, y: 27, width: 198, height: 8, fontSize: 9 },
      { id: "chiefComplaints", label: "Chief complaints", enabled: true, x: 42, y: 35, width: 112, height: 10, fontSize: 9 },
      { id: "pastHistory", label: "History", enabled: true, x: 159, y: 36, width: 44, height: 24, fontSize: 8 },
      { id: "visualAcuity", label: "Visual acuity", enabled: true, x: 6, y: 35, width: 36, height: 20, fontSize: 8 },
      { id: "examination", label: "Examination findings", enabled: true, x: 6, y: 55, width: 36, height: 150, fontSize: 8 },
      { id: "gat", label: "IOP", enabled: true, x: 6, y: 205, width: 36, height: 8, fontSize: 8 },
      { id: "diagnosis", label: "Diagnosis", enabled: true, x: 42, y: 47, width: 112, height: 10, fontSize: 9 },
      { id: "drugs", label: "Treatment (Rx)", enabled: true, x: 42, y: 58, width: 112, height: 143, fontSize: 9 },
      { id: "spectacle", label: "Spectacle correction", enabled: true, x: 6, y: 221, width: 138, height: 32, fontSize: 8 },
      { id: "lens", label: "Lens options", enabled: true, x: 145, y: 221, width: 58, height: 32, fontSize: 8 },
      { id: "investigations", label: "Investigations", enabled: true, x: 42, y: 202, width: 112, height: 12, fontSize: 8 },
      { id: "advice", label: "Advice", enabled: true, x: 159, y: 62, width: 44, height: 145, fontSize: 8 },
      { id: "followUp", label: "Follow-up", enabled: true, x: 159, y: 216, width: 44, height: 12, fontSize: 8 },
    ],
  },
  categoryTitles: {
    chiefComplaints: "Chief Complaints",
    visualAcuity: "Visual Acuity",
    distanceVA: "Distance spectacle VA",
    nearVA: "Near spectacle VA",
    drugRoutes: "Drug routes",
    lensUsage: "Lens usage",
    lensType: "Lens type",
    lensCoating: "Lens coating",
    lensMaterial: "Lens material",
    followUp: "Follow-up",
  },
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
    { id: "patient", title: "Patient Particulars", enabled: true, builtIn: true },
    { id: "chiefComplaints", title: "Chief Complaints", enabled: true, builtIn: true },
    { id: "pastHistory", title: "History", enabled: true, builtIn: true },
    { id: "visualAcuity", title: "Visual Acuity", enabled: true, builtIn: true },
    {
      id: "examination",
      title: "Other Examination Findings",
      enabled: true,
      builtIn: true,
      subsections: [
        { id: "adnexa", title: "Adnexa", enabled: true, builtIn: true, options: [] },
        { id: "anteriorSegment", title: "Anterior Segment", enabled: true, builtIn: true, options: [] },
        { id: "posteriorSegment", title: "Posterior Segment", enabled: true, builtIn: true, options: [] },
      ],
    },
    { id: "gat", title: "IOP", enabled: true, builtIn: true },
    { id: "diagnosis", title: "Diagnosis", enabled: true, builtIn: true, options: [] },
    { id: "drugs", title: "Treatment (Rx)", enabled: true, builtIn: true },
    { id: "spectacle", title: "Spectacle Correction", enabled: true, builtIn: true },
    { id: "lens", title: "Lens Options", enabled: true, builtIn: true },
    { id: "investigations", title: "Investigations", enabled: true, builtIn: true, options: DEFAULT_INVESTIGATION_OPTIONS },
    {
      id: "advice",
      title: "Advice/উপদেশ",
      enabled: true,
      builtIn: true,
      options: [
        "নিয়মিত ঔষধ ব্যবহার করবেন।",
        "দেখানো নিয়মে ব্যায়াম করবেন।",
        "দেখানো নিয়মে আলতো ভাবে গরম সেঁক দিবেন, ১৫-২০ মিঃ করে, দিনে ৪/৫ বার।",
        "বেশী শ্যাম্পু দিয়ে চোখের পাতা এবং পাপড়ি পরিষ্কার করবেন।",
        "চোখে পানি লাগাবেন না পরবর্তী নির্দেশনা না দেয়া পর্যন্ত।",
        "চোখে পানি লাগাবেন না ৭ দিন।",
        "চোখে পানি লাগাবেন না ১৫ দিন।",
        "চোখের ময়লা/পিঁচুটি/কেতর ঔষধ দিয়ে নিয়মিত পরিষ্কার করবেন।",
        "সবসময় চশমা পরতে হবে, শুধুমাত্র গোসল ও ঘুমানোর সময় চশমা খোলা যাবে।",
        "মোবাইল/টিভি/কম্পিউটার বা যেকোনো ডিজিটাল স্ক্রিন টানা ৪০মিঃ ব্যবহারের পর ৫-১০মিঃ বিরতি দিতে হবে।",
        "মোবাইল/টিভি/কম্পিউটার বা যেকোনো ডিজিটাল স্ক্রিন ব্যবহার সীমিত করতে হবে।",
        "অন্ধকারে মোবাইল/টিভি/কম্পিউটার বা যেকোনো ডিজিটাল স্ক্রিন ব্যবহার পুরোপুরি বন্ধ করতে হবে।",
      ],
    },
    { id: "followUp", title: "Follow-Up Time", enabled: true, builtIn: true },
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

const DEFAULT_RX_PAD_OVERLAY = DEFAULT_PRESCRIPTION_CONFIG.rxPadOverlay as RxPadOverlayConfig;

function normalizeOverlayField(fallback: RxPadOverlayField, savedValue: unknown): RxPadOverlayField {
  const saved = savedValue && typeof savedValue === "object" ? savedValue as Partial<RxPadOverlayField> : {};
  const numberOr = (value: unknown, fallbackValue: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallbackValue;
  return {
    ...fallback,
    label: typeof saved.label === "string" && saved.label.trim() ? saved.label.trim() : fallback.label,
    enabled: saved.enabled !== false,
    printMode: saved.printMode === "selected" ? "selected" : "all",
    contentSelection: saved.printMode === "selected" && Array.isArray(saved.contentSelection)
      ? saved.contentSelection.filter((item): item is string => typeof item === "string")
      : undefined,
    x: Math.max(0, numberOr(saved.x, fallback.x)),
    y: Math.max(0, numberOr(saved.y, fallback.y)),
    width: Math.max(5, numberOr(saved.width, fallback.width)),
    height: Math.max(4, numberOr(saved.height, fallback.height)),
    fontSize: Math.max(5, Math.min(48, numberOr(saved.fontSize, fallback.fontSize))),
  };
}

function normalizeRxPadOverlay(value: unknown, fallbackId = "rx-pad", fallbackName = "Rx Pad Overlay"): RxPadOverlayConfig {
  const saved = value && typeof value === "object" ? value as Partial<RxPadOverlayConfig> : {};
  const paperWidthMm = normalizeRxPadPaperSize(
    typeof saved.paperWidthMm === "number" ? saved.paperWidthMm : DEFAULT_RX_PAD_OVERLAY.paperWidthMm,
    DEFAULT_RX_PAD_OVERLAY.paperWidthMm,
  );
  const paperHeightMm = normalizeRxPadPaperSize(
    typeof saved.paperHeightMm === "number" ? saved.paperHeightMm : DEFAULT_RX_PAD_OVERLAY.paperHeightMm,
    DEFAULT_RX_PAD_OVERLAY.paperHeightMm,
  );
  const fields = DEFAULT_RX_PAD_OVERLAY.fields.map((fallback) => {
    const savedField = Array.isArray(saved.fields) ? saved.fields.find((item) => item?.id === fallback.id) : undefined;
    return constrainRxPadOverlayField(normalizeOverlayField(fallback, savedField), paperWidthMm, paperHeightMm);
  });
  return {
    id: typeof saved.id === "string" && saved.id.trim() ? saved.id.trim() : fallbackId,
    name: typeof saved.name === "string" && saved.name.trim() ? saved.name.trim() : fallbackName,
    imageUri: typeof saved.imageUri === "string" && saved.imageUri ? saved.imageUri : undefined,
    imageWidthPx: typeof saved.imageWidthPx === "number" && Number.isFinite(saved.imageWidthPx) && saved.imageWidthPx > 0 ? saved.imageWidthPx : undefined,
    imageHeightPx: typeof saved.imageHeightPx === "number" && Number.isFinite(saved.imageHeightPx) && saved.imageHeightPx > 0 ? saved.imageHeightPx : undefined,
    imageFit: normalizeRxPadImageFit(saved.imageFit),
    paperWidthMm,
    paperHeightMm,
    fields,
  };
}

function canonicalizeSavedValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeSavedValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonicalizeSavedValue((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

function savedOverlaysMatch(left: unknown, right: unknown): boolean {
  if (!left || typeof left !== "object" || !right || typeof right !== "object") return false;
  return JSON.stringify(canonicalizeSavedValue(left)) === JSON.stringify(canonicalizeSavedValue(right));
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
  const legacyTitles: Record<string, string[]> = {
    patient: ["Patient"],
    pastHistory: ["Past History"],
    examination: ["Examination Findings"],
    gat: ["GAT / Intraocular Pressure"],
    drugs: ["Rx — Drugs & Medications"],
    advice: ["Advice (উপদেশ)"],
    followUp: ["Follow-up (পরবর্তী ভিজিট)"],
  };
  const sections = DEFAULT_PRESCRIPTION_CONFIG.sections.map((fallback) => {
    const saved = rawSections.find((section) => section?.id === fallback.id)
      || (fallback.id === "investigations"
        ? rawSections.find((section) => typeof section?.title === "string" && section.title.trim().toLowerCase() === "investigations")
        : undefined);
    const savedOptions = saved?.options;
    const options = fallback.id === "advice" && (!input.version || input.version < 4)
      ? cleanOptions([...(fallback.options || []), ...(Array.isArray(savedOptions) ? savedOptions : [])], fallback.options || [])
      : fallback.id === "investigations" && (!input.version || input.version < 6)
        ? cleanOptions([...(fallback.options || []), ...(Array.isArray(savedOptions) ? savedOptions : [])], fallback.options || [])
      : cleanOptions(savedOptions, fallback.options || []);
    const savedTitle = typeof saved?.title === "string" && saved.title.trim() ? saved.title.trim() : "";
    const title = input.version && input.version < 5 && legacyTitles[fallback.id]?.includes(savedTitle)
      ? fallback.title
      : savedTitle || fallback.title;
    return {
      ...fallback,
      ...(saved && typeof saved === "object" ? saved : {}),
      id: fallback.id,
      builtIn: true,
      title,
      enabled: saved?.enabled !== false,
      options,
      subsections: normalizeSubsections(fallback.subsections, saved?.subsections),
    };
  });
  rawSections
    .filter((section) => {
      if (!section || typeof section !== "object" || !section.id) return false;
      const title = typeof section.title === "string" ? section.title.trim().toLowerCase() : "";
      return !sections.some((item) => item.id === section.id) && title !== "investigations";
    })
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
  const chiefComplaints = input.version && input.version >= 3
    ? cleanOptions(savedChiefComplaints, DEFAULT_PRESCRIPTION_CONFIG.chiefComplaints)
    : cleanOptions([...DEFAULT_PRESCRIPTION_CONFIG.chiefComplaints, ...savedChiefComplaints], DEFAULT_PRESCRIPTION_CONFIG.chiefComplaints);
  const rawOverlays = Array.isArray(input.rxPadOverlays) ? input.rxPadOverlays : [];
  const overlayValues = rawOverlays.length ? rawOverlays : [input.rxPadOverlay || DEFAULT_RX_PAD_OVERLAY];
  const requestedActiveId = typeof input.activeRxPadOverlayId === "string" ? input.activeRxPadOverlayId : undefined;
  const savedActiveOverlay = input.rxPadOverlay && typeof input.rxPadOverlay === "object"
    ? input.rxPadOverlay
    : undefined;
  const activeCandidates = overlayValues
    .map((value, index) => ({ value, index, overlay: normalizeRxPadOverlay(value, `rx-pad-${index + 1}`, index === 0 ? "Nabil A4 Rx Pad" : `Rx Pad ${index + 1}`) }))
    .filter(({ overlay }) => !requestedActiveId || overlay.id === requestedActiveId);
  const savedActiveCandidate = savedActiveOverlay
    ? activeCandidates.find(({ value }) => value === savedActiveOverlay || savedOverlaysMatch(value, savedActiveOverlay))
    : undefined;
  const activeIndex = savedActiveCandidate?.index ?? activeCandidates[0]?.index ?? 0;
  const usedOverlayIds = new Set<string>();
  const overlays = overlayValues
    .map((value, index) => {
      const overlay = normalizeRxPadOverlay(value, `rx-pad-${index + 1}`, index === 0 ? "Nabil A4 Rx Pad" : `Rx Pad ${index + 1}`);
      let id = overlay.id;
      let suffix = 2;
      while (usedOverlayIds.has(id)) id = `${overlay.id}-${suffix++}`;
      usedOverlayIds.add(id);
      return id === overlay.id ? overlay : { ...overlay, id };
    });
  const activeRxPadOverlay = overlays[activeIndex] || overlays[0];
  const activeRxPadOverlayId = activeRxPadOverlay.id;

  return {
    version: DEFAULT_PRESCRIPTION_CONFIG.version,
    rxPadOverlay: activeRxPadOverlay,
    rxPadOverlays: overlays,
    activeRxPadOverlayId,
    categoryTitles: Object.fromEntries(
      Object.entries(DEFAULT_PRESCRIPTION_CONFIG.categoryTitles || {}).map(([id, fallback]) => [
        id,
        typeof input.categoryTitles?.[id] === "string" && input.categoryTitles[id].trim()
          ? input.categoryTitles[id].trim()
          : fallback,
      ]),
    ),
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