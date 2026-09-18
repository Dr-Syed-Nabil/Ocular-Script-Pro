import type { DrugFormulation, Patient, Prescription } from "@/types";

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeVA(value: unknown) {
  const source = isRecord(value) ? value : {};
  return {
    ua: text(source.ua),
    wa: text(source.wa),
    ph: text(source.ph),
    bcva: text(source.bcva),
  };
}

function normalizeEyeRx(value: unknown) {
  const source = isRecord(value) ? value : {};
  return {
    dsp: text(source.dsp ?? source.sphere),
    dcyl: text(source.dcyl ?? source.cylinder),
    axis: text(source.axis),
    va: text(source.va),
  };
}

function normalizeHistory(value: unknown) {
  const source = isRecord(value) ? value : {};
  return {
    dm: source.dm === true,
    htn: source.htn === true,
    ihd: source.ihd === true,
    ckd: source.ckd === true,
    ba: source.ba === true,
    thyDs: source.thyDs === true,
    uromax: source.uromax === true,
    others: text(source.others),
  };
}

function normalizeDrug(value: unknown): Prescription["drugs"][number] | null {
  if (!isRecord(value)) return null;
  const formulations: DrugFormulation[] = ["Tablet", "Capsule", "Syrup", "Eye Drop/Gel", "Eye Ointment", "Topical Ointment/Cream"];
  const dosePhases = Array.isArray(value.dosePhases)
    ? value.dosePhases.filter(isRecord).map((phase) => ({
      schedule: text(phase.schedule),
      durationValue: text(phase.durationValue),
      durationUnit: phase.durationUnit === "সপ্তাহ" || phase.durationUnit === "মাস" ? phase.durationUnit : "দিন" as const,
      amount: text(phase.amount) || undefined,
      unit: text(phase.unit) || undefined,
      frequency: text(phase.frequency) || undefined,
      site: text(phase.site) || undefined,
      connector: phase.connector === "তারপর" ? "তারপর" as const : phase.connector === "এবং" ? "এবং" as const : undefined,
    }))
    : undefined;
  return {
    id: text(value.id) || generateId(),
    name: text(value.name),
    schedule: text(value.schedule),
    scheduleBn: text(value.scheduleBn),
    duration: text(value.duration),
    durationBn: text(value.durationBn),
    route: text(value.route),
    notes: text(value.notes),
    formulation: formulations.includes(value.formulation as DrugFormulation) ? value.formulation as DrugFormulation : undefined,
    dosePhases,
  };
}

export function normalizePrescription(raw: unknown, patientsById: Map<string, Patient>): Prescription | null {
  if (!isRecord(raw)) return null;
  const patientId = text(raw.patientId);
  const patient = patientsById.get(patientId);
  const createdAt = text(raw.createdAt) || new Date().toISOString();
  const drugs = Array.isArray(raw.drugs) ? raw.drugs.map(normalizeDrug).filter(Boolean) as Prescription["drugs"] : [];
  const customSections = Array.isArray(raw.customSections)
    ? raw.customSections.filter(isRecord).map((section) => ({
      id: text(section.id) || generateId(),
      title: text(section.title) || "Custom section",
      content: text(section.content),
      selectedOptions: Array.isArray(section.selectedOptions) ? section.selectedOptions.filter((item): item is string => typeof item === "string") : undefined,
      freeText: text(section.freeText) || undefined,
    }))
    : [];
  const sectionFields = isRecord(raw.sectionFields) ? raw.sectionFields : {};
  return {
    id: text(raw.id) || generateId(),
    patientId,
    patientName: text(raw.patientName) || patient?.name || "Unknown patient",
    patientAge: text(raw.patientAge),
    patientWeight: text(raw.patientWeight) || undefined,
    patientPhone: text(raw.patientPhone) || patient?.phone || undefined,
    patientPuid: text(raw.patientPuid) || patient?.puid || undefined,
    date: text(raw.date) || createdAt.slice(0, 10),
    rightEyeVA: normalizeVA(raw.rightEyeVA),
    leftEyeVA: normalizeVA(raw.leftEyeVA),
    chiefComplaints: text(raw.chiefComplaints),
    chiefComplaintSelections: Array.isArray(raw.chiefComplaintSelections) ? raw.chiefComplaintSelections : undefined,
    customComplaint: text(raw.customComplaint) || undefined,
    pastHistory: normalizeHistory(raw.pastHistory),
    pastHistoryNotes: text(raw.pastHistoryNotes) || undefined,
    diagnosis: text(raw.diagnosis) || undefined,
    investigations: text(raw.investigations) || undefined,
    customSections,
    sectionFields,
    sectionTitles: isRecord(raw.sectionTitles) ? raw.sectionTitles as Record<string, string> : undefined,
    subsectionTitles: isRecord(raw.subsectionTitles) ? raw.subsectionTitles as Record<string, string> : undefined,
    hiddenSections: Array.isArray(raw.hiddenSections) ? raw.hiddenSections.filter((item): item is string => typeof item === "string") : undefined,
    adnexa: text(raw.adnexa),
    anteriorSegment: text(raw.anteriorSegment),
    posteriorSegment: text(raw.posteriorSegment),
    gatRight: text(raw.gatRight),
    gatLeft: text(raw.gatLeft),
    drugs,
    rightEyeDistance: normalizeEyeRx(raw.rightEyeDistance),
    leftEyeDistance: normalizeEyeRx(raw.leftEyeDistance),
    rightEyeNear: normalizeEyeRx(raw.rightEyeNear),
    leftEyeNear: normalizeEyeRx(raw.leftEyeNear),
    ipd: text(raw.ipd),
    nearIPD: text(raw.nearIPD),
    addValue: text(raw.addValue ?? raw.addPower),
    lensUsage: text(raw.lensUsage),
    lensType: text(raw.lensType),
    lensCoating: Array.isArray(raw.lensCoating) ? raw.lensCoating.filter((item): item is string => typeof item === "string") : [],
    lensMaterial: text(raw.lensMaterial),
    advice: text(raw.advice),
    adviceBn: text(raw.adviceBn),
    followUp: text(raw.followUp),
    followUpBn: text(raw.followUpBn),
    createdAt,
    updatedAt: text(raw.updatedAt) || createdAt,
  };
}