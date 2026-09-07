import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Image } from "react-native";
import { useAuth } from "@clerk/expo";
import { DoctorProfile, DrugFormulation, Patient, Prescription, PrescriptionConfig } from "@/types";
import { DEFAULT_PRESCRIPTION_CONFIG, normalizePrescriptionConfig } from "@/constants/prescriptionConfig";

const PRESCRIPTIONS_KEY = "@optiscript_prescriptions";
const PATIENTS_KEY = "@optiscript_patients";
const DOCTOR_KEY = "@optiscript_doctor";
const PRESCRIPTION_CONFIG_KEY = "@optiscript_prescription_config";
const DEFAULT_RX_PAD_IMAGE = require("../assets/images/nabil-rx-pad-a4.jpg");
const STORAGE_KEYS = [PRESCRIPTIONS_KEY, PATIENTS_KEY, DOCTOR_KEY, PRESCRIPTION_CONFIG_KEY];

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizePatient(raw: unknown): Patient | null {
  if (!isRecord(raw)) return null;
  const name = text(raw.name).trim();
  if (!name) return null;
  return {
    id: text(raw.id) || generateId(),
    puid: text(raw.puid) || undefined,
    name,
    dob: text(raw.dob),
    phone: text(raw.phone),
    email: text(raw.email),
    gender: raw.gender === "Male" || raw.gender === "Female" || raw.gender === "Other" ? raw.gender : "",
    ageAtEnrollment: text(raw.ageAtEnrollment) || undefined,
    createdAt: text(raw.createdAt) || new Date().toISOString(),
  };
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

function normalizePrescription(raw: unknown, patientsById: Map<string, Patient>): Prescription | null {
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
  };
}

function withBundledRxPadTemplate(config: PrescriptionConfig): PrescriptionConfig {
  const overlays = config.rxPadOverlays || [];
  const activeId = config.activeRxPadOverlayId || overlays[0]?.id;
  const activeIndex = Math.max(0, overlays.findIndex((overlay) => overlay.id === activeId));
  if (overlays[activeIndex]?.imageUri) return config;
  const imageUri = Image.resolveAssetSource(DEFAULT_RX_PAD_IMAGE).uri;
  const seeded = overlays.map((overlay, index) =>
    index === activeIndex
      ? { ...overlay, imageUri, imageWidthPx: 1080, imageHeightPx: 1505, paperWidthMm: 210, paperHeightMm: 297 }
      : overlay
  );
  return {
    ...config,
    rxPadOverlays: seeded,
    activeRxPadOverlayId: activeId,
    rxPadOverlay: seeded.find((overlay) => overlay.id === activeId) || seeded[0],
  };
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

/**
 * Build a structured PUID:  {INITIALS}{AGE2d}{Y|M}{DDMMYY}{SERIAL3d}
 * e.g. Rashedul Islam, 41 yrs, 1 Aug 2026, 7th patient of the day → RI41Y070826007
 */
function buildPuid(name: string, ageStr: string, enrollDate: Date, serial: number): string {
  const parts = name.trim().split(/\s+/);
  let initials: string;
  if (parts.length >= 2) {
    initials = (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  } else {
    initials = parts[0].substring(0, 2).toUpperCase().padEnd(2, "X");
  }
  // Extract numeric age (handles "41", "41 yrs", "41Y", etc.)
  const ageNum = parseInt(ageStr.replace(/[^0-9]/g, ""), 10) || 0;
  const age2 = String(ageNum).padStart(2, "0").slice(-2);
  const ageUnit = /month|\bmo\b/i.test(ageStr) ? "M" : "Y";
  const dd = String(enrollDate.getDate()).padStart(2, "0");
  const mm = String(enrollDate.getMonth() + 1).padStart(2, "0");
  const yy = String(enrollDate.getFullYear()).slice(-2);
  const ser3 = String(serial).padStart(3, "0").slice(-3);
  return `${initials}${age2}${ageUnit}${dd}${mm}${yy}${ser3}`;
}

// Legacy random PUID for migration of pre-existing patients
const PUID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateLegacyPuid(): string {
  let r = "OPT-";
  for (let i = 0; i < 8; i++) r += PUID_CHARS[Math.floor(Math.random() * PUID_CHARS.length)];
  return r;
}

interface DataContextValue {
  prescriptions: Prescription[];
  patients: Patient[];
  doctor: DoctorProfile;
  prescriptionConfig: PrescriptionConfig;
  loading: boolean;
  addPrescription: (rx: Omit<Prescription, "id" | "createdAt">) => Promise<Prescription>;
  updatePrescription: (id: string, rx: Omit<Prescription, "id" | "createdAt">) => Promise<void>;
  deletePrescription: (id: string) => Promise<void>;
  addPatient: (p: Omit<Patient, "id" | "createdAt">) => Promise<Patient>;
  updatePatient: (id: string, p: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  updateDoctor: (d: Partial<DoctorProfile>) => Promise<void>;
  updatePrescriptionConfig: (config: PrescriptionConfig) => Promise<void>;
  getPrescriptionsForPatient: (patientId: string) => Prescription[];
  getPatientByPuid: (puid: string) => Patient | undefined;
}

const DataContext = createContext<DataContextValue | null>(null);

const DEFAULT_DOCTOR: DoctorProfile = {
  nameBn: "",
  nameEn: "",
  qualificationBn: "",
  qualificationEn: "",
  designationBn: "",
  designationEn: "",
  phone: "",
  email: "",
  institutionBn: "",
  institutionEn: "",
  regNumber: "",
  chamberName: "",
  chamberAddress: "",
  chamberPhone: "",
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctor, setDoctor] = useState<DoctorProfile>(DEFAULT_DOCTOR);
  const [prescriptionConfig, setPrescriptionConfig] = useState<PrescriptionConfig>(DEFAULT_PRESCRIPTION_CONFIG);
  const [loading, setLoading] = useState(true);
  const prescriptionsRef = useRef<Prescription[]>([]);
  const patientsRef = useRef<Patient[]>([]);
  const doctorRef = useRef<DoctorProfile>(DEFAULT_DOCTOR);
  const configRef = useRef<PrescriptionConfig>(DEFAULT_PRESCRIPTION_CONFIG);
  const writeQueueRef = useRef(Promise.resolve());

  const scopedKey = useCallback((key: string) => `${key}:${userId}`, [userId]);
  const persist = useCallback((key: string, value: unknown) => {
    const serialized = JSON.stringify(value);
    writeQueueRef.current = writeQueueRef.current.catch(() => undefined).then(() => AsyncStorage.setItem(scopedKey(key), serialized));
    return writeQueueRef.current;
  }, [scopedKey]);

  useEffect(() => {
    if (!authLoaded) return;
    if (!isSignedIn || !userId) {
      prescriptionsRef.current = [];
      patientsRef.current = [];
      doctorRef.current = DEFAULT_DOCTOR;
      configRef.current = DEFAULT_PRESCRIPTION_CONFIG;
      setPrescriptions([]);
      setPatients([]);
      setDoctor(DEFAULT_DOCTOR);
      setPrescriptionConfig(DEFAULT_PRESCRIPTION_CONFIG);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const scoped = await AsyncStorage.multiGet(STORAGE_KEYS.map((key) => scopedKey(key)));
        const legacy = await AsyncStorage.multiGet(STORAGE_KEYS);
        const rawByKey = new Map(scoped);
        const legacyByKey = new Map(legacy);
        const read = (key: string) => rawByKey.get(scopedKey(key)) || legacyByKey.get(key) || null;
        const rawPatients: unknown = read(PATIENTS_KEY) ? JSON.parse(read(PATIENTS_KEY) as string) : [];
        const migratedPatients = (Array.isArray(rawPatients) ? rawPatients : [])
          .map(normalizePatient)
          .filter(Boolean) as Patient[];
        const patientsWithPuid = migratedPatients.map((patient) =>
          patient.puid ? patient : { ...patient, puid: generateLegacyPuid() }
        );
        const patientsById = new Map(patientsWithPuid.map((patient) => [patient.id, patient]));
        const rawRx: unknown = read(PRESCRIPTIONS_KEY) ? JSON.parse(read(PRESCRIPTIONS_KEY) as string) : [];
        const normalizedRx = (Array.isArray(rawRx) ? rawRx : [])
          .map((item) => normalizePrescription(item, patientsById))
          .filter(Boolean) as Prescription[];
        const rawDoctor = read(DOCTOR_KEY) ? JSON.parse(read(DOCTOR_KEY) as string) : {};
        const savedDoctor = isRecord(rawDoctor) ? { ...DEFAULT_DOCTOR, ...Object.fromEntries(Object.keys(DEFAULT_DOCTOR).map((key) => [key, text(rawDoctor[key])])) } : DEFAULT_DOCTOR;
        const configRaw = read(PRESCRIPTION_CONFIG_KEY);
        const savedConfig = configRaw ? JSON.parse(configRaw) : undefined;
        const normalizedConfig = withBundledRxPadTemplate(normalizePrescriptionConfig(savedConfig));
        const normalizedWithPuid = normalizedRx.map((prescription) => ({
          ...prescription,
          patientPuid: prescription.patientPuid || patientsById.get(prescription.patientId)?.puid,
        }));
        if (cancelled) return;
        prescriptionsRef.current = normalizedWithPuid;
        patientsRef.current = patientsWithPuid;
        doctorRef.current = savedDoctor;
        configRef.current = normalizedConfig;
        setPrescriptions(normalizedWithPuid);
        setPatients(patientsWithPuid);
        setDoctor(savedDoctor);
        setPrescriptionConfig(normalizedConfig);
        const usedLegacy = STORAGE_KEYS.some((key) => !rawByKey.get(scopedKey(key)) && legacyByKey.get(key));
        if (usedLegacy || !rawByKey.get(scopedKey(PATIENTS_KEY)) || !rawByKey.get(scopedKey(PRESCRIPTIONS_KEY)) || !rawByKey.get(scopedKey(PRESCRIPTION_CONFIG_KEY))) {
          await Promise.all([
            persist(PATIENTS_KEY, patientsWithPuid),
            persist(PRESCRIPTIONS_KEY, normalizedWithPuid),
            persist(DOCTOR_KEY, savedDoctor),
            persist(PRESCRIPTION_CONFIG_KEY, normalizedConfig),
          ]);
          if (usedLegacy) await AsyncStorage.multiRemove(STORAGE_KEYS);
        }
      } catch (error) {
        console.warn("OptiScript data load recovered with empty data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [authLoaded, isSignedIn, persist, scopedKey, userId]);

  const addPrescription = useCallback(
    async (rx: Omit<Prescription, "id" | "createdAt">): Promise<Prescription> => {
      const newRx: Prescription = {
        ...rx,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const updated = [newRx, ...prescriptionsRef.current];
      prescriptionsRef.current = updated;
      setPrescriptions(updated);
      await persist(PRESCRIPTIONS_KEY, updated);
      return newRx;
    },
    [persist]
  );

  const deletePrescription = useCallback(async (id: string) => {
    const updated = prescriptionsRef.current.filter((r) => r.id !== id);
    prescriptionsRef.current = updated;
    setPrescriptions(updated);
    await persist(PRESCRIPTIONS_KEY, updated);
  }, [persist]);

  const updatePrescription = useCallback(async (id: string, rx: Omit<Prescription, "id" | "createdAt">) => {
    const current = prescriptionsRef.current.find((item) => item.id === id);
    if (!current) throw new Error("Prescription not found");
    const updated = prescriptionsRef.current.map((item) => item.id === id
      ? { ...current, ...rx, id, createdAt: current.createdAt }
      : item);
    prescriptionsRef.current = updated;
    setPrescriptions(updated);
    await persist(PRESCRIPTIONS_KEY, updated);
  }, [persist]);

  const addPatient = useCallback(
    async (p: Omit<Patient, "id" | "createdAt">): Promise<Patient> => {
      // Compute structured PUID unless caller already provided one
      let puid = p.puid;
      if (!puid) {
        const enrollDate = new Date();
        // Count patients enrolled today to get the next daily serial.
        // Read from the current render instead of a state setter: setters are
        // asynchronous and cannot be used as a synchronous read.
        const todayPrefix = enrollDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const serial = patientsRef.current.filter((pt) => pt.createdAt.startsWith(todayPrefix)).length + 1;
        puid = buildPuid(p.name, p.ageAtEnrollment || "", enrollDate, serial);
      }
      const newP: Patient = {
        ...p,
        id: generateId(),
        puid,
        createdAt: new Date().toISOString(),
      };
      const updated = [newP, ...patientsRef.current];
      patientsRef.current = updated;
      setPatients(updated);
      await persist(PATIENTS_KEY, updated);
      return newP;
    },
    [persist]
  );

  const updatePatient = useCallback(async (id: string, p: Partial<Patient>) => {
    const updated = patientsRef.current.map((pt) => (pt.id === id
      ? { ...pt, name: p.name ?? pt.name, dob: p.dob ?? pt.dob, phone: p.phone ?? pt.phone, email: p.email ?? pt.email, gender: p.gender ?? pt.gender, ageAtEnrollment: p.ageAtEnrollment ?? pt.ageAtEnrollment }
      : pt));
    patientsRef.current = updated;
    setPatients(updated);
    await persist(PATIENTS_KEY, updated);
  }, [persist]);

  const deletePatient = useCallback(async (id: string) => {
    const updatedPatients = patientsRef.current.filter((pt) => pt.id !== id);
    const updatedPrescriptions = prescriptionsRef.current.filter((rx) => rx.patientId !== id);
    patientsRef.current = updatedPatients;
    prescriptionsRef.current = updatedPrescriptions;
    setPatients(updatedPatients);
    setPrescriptions(updatedPrescriptions);
    await Promise.all([persist(PATIENTS_KEY, updatedPatients), persist(PRESCRIPTIONS_KEY, updatedPrescriptions)]);
  }, [persist]);

  const updateDoctor = useCallback(async (d: Partial<DoctorProfile>) => {
    const updated = { ...doctorRef.current, ...d };
    doctorRef.current = updated;
    setDoctor(updated);
    await persist(DOCTOR_KEY, updated);
  }, [persist]);

  const updatePrescriptionConfig = useCallback(async (config: PrescriptionConfig) => {
    const normalized = withBundledRxPadTemplate(normalizePrescriptionConfig(config));
    configRef.current = normalized;
    setPrescriptionConfig(normalized);
    await persist(PRESCRIPTION_CONFIG_KEY, normalized);
  }, [persist]);

  const getPrescriptionsForPatient = useCallback(
    (patientId: string) => prescriptions.filter((r) => r.patientId === patientId),
    [prescriptions]
  );

  const getPatientByPuid = useCallback(
    (puid: string) => patients.find((p) => p.puid === puid),
    [patients]
  );

  return (
    <DataContext.Provider
      value={{
        prescriptions,
        patients,
        doctor,
        prescriptionConfig,
        loading,
        addPrescription,
        updatePrescription,
        deletePrescription,
        addPatient,
        updatePatient,
        deletePatient,
        updateDoctor,
        updatePrescriptionConfig,
        getPrescriptionsForPatient,
        getPatientByPuid,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
