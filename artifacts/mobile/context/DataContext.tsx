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
        if (pRaw) setPatients(JSON.parse(pRaw));
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
      const newP: Patient = {
        ...p,
        id: generateId(),
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
