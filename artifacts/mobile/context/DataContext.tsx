import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { DoctorProfile, Patient, Prescription } from "@/types";

const PRESCRIPTIONS_KEY = "@optiscript_prescriptions";
const PATIENTS_KEY = "@optiscript_patients";
const DOCTOR_KEY = "@optiscript_doctor";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

/**
 * Build a structured PUID:  {INITIALS}{AGE2d}Y{DDMMYY}{SERIAL3d}
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
  const dd = String(enrollDate.getDate()).padStart(2, "0");
  const mm = String(enrollDate.getMonth() + 1).padStart(2, "0");
  const yy = String(enrollDate.getFullYear()).slice(-2);
  const ser3 = String(serial).padStart(3, "0").slice(-3);
  return `${initials}${age2}Y${dd}${mm}${yy}${ser3}`;
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
  loading: boolean;
  addPrescription: (rx: Omit<Prescription, "id" | "createdAt">) => Promise<Prescription>;
  deletePrescription: (id: string) => Promise<void>;
  addPatient: (p: Omit<Patient, "id" | "createdAt">) => Promise<Patient>;
  updatePatient: (id: string, p: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  updateDoctor: (d: Partial<DoctorProfile>) => Promise<void>;
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
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctor, setDoctor] = useState<DoctorProfile>(DEFAULT_DOCTOR);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [rxRaw, pRaw, dRaw] = await Promise.all([
          AsyncStorage.getItem(PRESCRIPTIONS_KEY),
          AsyncStorage.getItem(PATIENTS_KEY),
          AsyncStorage.getItem(DOCTOR_KEY),
        ]);
        if (rxRaw) setPrescriptions(JSON.parse(rxRaw));
        if (pRaw) {
          // Migrate: assign puid to existing patients that don't have one
          const loaded: Patient[] = JSON.parse(pRaw);
          let dirty = false;
          const migrated = loaded.map((p) => {
            if (!p.puid) { dirty = true; return { ...p, puid: generateLegacyPuid() }; }
            return p;
          });
          if (dirty) await AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify(migrated));
          setPatients(migrated);
        }
        if (dRaw) setDoctor({ ...DEFAULT_DOCTOR, ...JSON.parse(dRaw) });
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addPrescription = useCallback(
    async (rx: Omit<Prescription, "id" | "createdAt">): Promise<Prescription> => {
      const newRx: Prescription = {
        ...rx,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setPrescriptions((prev) => {
        const updated = [newRx, ...prev];
        AsyncStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(updated));
        return updated;
      });
      return newRx;
    },
    []
  );

  const deletePrescription = useCallback(async (id: string) => {
    setPrescriptions((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      AsyncStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addPatient = useCallback(
    async (p: Omit<Patient, "id" | "createdAt">): Promise<Patient> => {
      // Compute structured PUID unless caller already provided one
      let puid = p.puid;
      if (!puid) {
        const enrollDate = new Date();
        // Count patients enrolled today to get the next daily serial
        const todayPrefix = enrollDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
        let serial = 1;
        setPatients((prev) => {
          serial = prev.filter((pt) => pt.createdAt.startsWith(todayPrefix)).length + 1;
          return prev; // no change — we're just reading
        });
        puid = buildPuid(p.name, p.ageAtEnrollment || "", enrollDate, serial);
      }
      const newP: Patient = {
        ...p,
        id: generateId(),
        puid,
        createdAt: new Date().toISOString(),
      };
      setPatients((prev) => {
        const updated = [newP, ...prev];
        AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify(updated));
        return updated;
      });
      return newP;
    },
    []
  );

  const updatePatient = useCallback(async (id: string, p: Partial<Patient>) => {
    setPatients((prev) => {
      const updated = prev.map((pt) => (pt.id === id ? { ...pt, ...p } : pt));
      AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deletePatient = useCallback(async (id: string) => {
    setPatients((prev) => {
      const updated = prev.filter((pt) => pt.id !== id);
      AsyncStorage.setItem(PATIENTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateDoctor = useCallback(async (d: Partial<DoctorProfile>) => {
    setDoctor((prev) => {
      const updated = { ...prev, ...d };
      AsyncStorage.setItem(DOCTOR_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

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
        loading,
        addPrescription,
        deletePrescription,
        addPatient,
        updatePatient,
        deletePatient,
        updateDoctor,
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
