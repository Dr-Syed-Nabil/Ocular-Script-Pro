import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import React from "react";

type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

type DataView = {
  patients: Array<{ id: string; name: string }>;
  prescriptions: Array<{ id: string; patientId: string }>;
  doctor: { nameEn: string };
  prescriptionConfig: { activeRxPadOverlayId?: string };
  syncStatus: string;
};

const localRequire = createRequire(__filename);
const rendererModule = localRequire("react-test-renderer") as {
  act: (callback: () => void | Promise<void>) => Promise<void>;
  create: (element: React.ReactElement) => {
    update: (nextElement: React.ReactElement) => void;
    unmount: () => void;
  };
};
const { act, create } = rendererModule;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

function dataForClinician(userId: string) {
  const patientId = `${userId}-patient`;
  const padId = `${userId}-pad`;
  const patient = {
    id: patientId,
    name: `${userId} patient`,
    dob: "1980-01-01",
    phone: "",
    email: "",
    gender: "",
    createdAt: "2026-09-18T00:00:00.000Z",
    updatedAt: "2026-09-18T00:00:00.000Z",
  };
  const prescription = {
    id: `${userId}-prescription`,
    patientId,
    patientName: patient.name,
    date: "2026-09-18",
    drugs: [],
    createdAt: "2026-09-18T00:00:00.000Z",
  };
  const doctor = {
    nameEn: `${userId} doctor`,
  };
  const prescriptionConfig = {
    version: 8,
    activeRxPadOverlayId: padId,
    rxPadOverlays: [{
      id: padId,
      name: `${userId} pad`,
      imageUri: `file://${userId}-pad.jpg`,
      paperWidthMm: 210,
      paperHeightMm: 297,
      fields: [],
    }],
  };

  return {
    patient,
    prescription,
    doctor,
    prescriptionConfig,
    snapshot: {
      patients: [patient],
      prescriptions: [prescription],
      doctor,
      prescriptionConfig,
    },
  };
}

function seedStorage(storage: Map<string, string>, userId: string) {
  const data = dataForClinician(userId);
  storage.set(`@optiscript_patients:${userId}`, JSON.stringify([data.patient]));
  storage.set(`@optiscript_prescriptions:${userId}`, JSON.stringify([data.prescription]));
  storage.set(`@optiscript_doctor:${userId}`, JSON.stringify(data.doctor));
  storage.set(`@optiscript_prescription_config:${userId}`, JSON.stringify(data.prescriptionConfig));
  return data;
}

function waitFor(predicate: () => boolean, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - startedAt > 2_000) {
        reject(new Error(`Timed out waiting for ${message}`));
        return;
      }
      setTimeout(check, 0);
    };
    check();
  });
}

test("mounted DataProvider isolates every clinician record across account switches", async () => {
  const storage = new Map<string, string>();
  const clinicianOne = seedStorage(storage, "clinician-1");
  const clinicianTwo = seedStorage(storage, "clinician-2");
  const userTwoStorage = deferred<void>();
  const userOneCloud = deferred<{
    revision: number;
    snapshot: typeof clinicianOne.snapshot;
  }>();
  let auth: AuthState = { isLoaded: true, isSignedIn: true, userId: "clinician-1" };
  let cloudCallCount = 0;
  let latest: DataView = {
    patients: [],
    prescriptions: [],
    doctor: { nameEn: "" },
    prescriptionConfig: {},
    syncStatus: "idle",
  };

  const asyncStorage = {
    multiGet: async (keys: string[]) => {
      if (keys.some((key) => key.endsWith(":clinician-2"))) await userTwoStorage.promise;
      return keys.map((key) => [key, storage.get(key) ?? null] as [string, string | null]);
    },
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    multiRemove: async (keys: string[]) => {
      keys.forEach((key) => storage.delete(key));
    },
  };
  const apiClient = {
    getSync: async () => {
      cloudCallCount += 1;
      if (cloudCallCount === 1) return userOneCloud.promise;
      return { revision: 2, snapshot: clinicianTwo.snapshot };
    },
    saveSync: async () => ({ revision: 1 }),
  };
  const nativeModules = {
    AppState: {
      currentState: "active",
      addEventListener: () => ({ remove: () => undefined }),
    },
    Image: {
      resolveAssetSource: () => ({ uri: "file://bundled-rx-pad.jpg" }),
    },
  };
  const moduleApi = localRequire("node:module") as {
    _load: (
      request: string,
      parent: NodeModule | null,
      isMain: boolean,
    ) => unknown;
  };
  const originalLoad = moduleApi._load;
  moduleApi._load = function load(request, parent, isMain) {
    if (request === "@clerk/expo") return { useAuth: () => auth };
    if (request === "@react-native-async-storage/async-storage") {
      return { __esModule: true, default: asyncStorage };
    }
    if (request === "react-native") return nativeModules;
    if (request === "@workspace/api-client-react") return apiClient;
    if (request.endsWith(".jpg")) return 0;
    return originalLoad.call(this, request, parent, isMain);
  };

  let renderer: ReturnType<typeof create> | undefined;
  try {
    const { DataProvider, useData } = await import("../context/DataContext");
    function Probe() {
      const data = useData();
      latest = {
        patients: data.patients.map(({ id, name }) => ({ id, name })),
        prescriptions: data.prescriptions.map(({ id, patientId }) => ({ id, patientId })),
        doctor: { nameEn: data.doctor.nameEn },
        prescriptionConfig: { activeRxPadOverlayId: data.prescriptionConfig.activeRxPadOverlayId },
        syncStatus: data.syncStatus,
      };
      return null;
    }

    await act(async () => {
      renderer = create(
        React.createElement(DataProvider, null, React.createElement(Probe)),
      );
    });
    await act(async () => {
      await waitFor(() => latest.patients[0]?.id === clinicianOne.patient.id, "clinician one local data");
    });

    assert.equal(cloudCallCount, 1);
    assert.equal(latest.patients[0]?.id, clinicianOne.patient.id);
    assert.equal(latest.prescriptions[0]?.id, clinicianOne.prescription.id);
    assert.equal(latest.doctor.nameEn, clinicianOne.doctor.nameEn);
    assert.equal(latest.prescriptionConfig.activeRxPadOverlayId, clinicianOne.prescriptionConfig.activeRxPadOverlayId);

    auth = { isLoaded: true, isSignedIn: true, userId: "clinician-2" };
    await act(async () => {
      renderer!.update(
        React.createElement(DataProvider, null, React.createElement(Probe)),
      );
    });
    await act(async () => {
      await waitFor(() => latest.patients.length === 0, "clinician boundary reset");
    });

    assert.equal(latest.patients.length, 0);
    assert.equal(latest.prescriptions.length, 0);
    assert.equal(latest.doctor.nameEn, "");
    assert.equal(latest.prescriptionConfig.activeRxPadOverlayId, undefined);

    userTwoStorage.resolve();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      await waitFor(
        () => latest.patients[0]?.id === clinicianTwo.patient.id && latest.syncStatus === "synced",
        "clinician two cloud data",
      );
    });

    assert.equal(latest.patients[0]?.id, clinicianTwo.patient.id);
    assert.equal(latest.prescriptions[0]?.id, clinicianTwo.prescription.id);
    assert.equal(latest.doctor.nameEn, clinicianTwo.doctor.nameEn);
    assert.equal(latest.prescriptionConfig.activeRxPadOverlayId, clinicianTwo.prescriptionConfig.activeRxPadOverlayId);
    userOneCloud.resolve({ revision: 1, snapshot: clinicianOne.snapshot });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.equal(latest.patients[0]?.id, clinicianTwo.patient.id);
    assert.equal(latest.prescriptions[0]?.id, clinicianTwo.prescription.id);
    assert.equal(latest.doctor.nameEn, clinicianTwo.doctor.nameEn);
    assert.equal(latest.prescriptionConfig.activeRxPadOverlayId, clinicianTwo.prescriptionConfig.activeRxPadOverlayId);

  } finally {
    renderer?.unmount();
    moduleApi._load = originalLoad;
  }
});