import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import React from "react";

import { normalizePrescriptionConfig } from "../constants/prescriptionConfig";

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
  loading: boolean;
  syncStatus: string;
};

type MockStorage = {
  multiGet: (keys: string[]) => Promise<Array<[string, string | null]>>;
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  multiRemove: (keys: string[]) => Promise<void>;
};

type MockApi = {
  getSync: () => Promise<unknown>;
  saveSync: () => Promise<unknown>;
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

let activeAuth: AuthState = { isLoaded: true, isSignedIn: false, userId: null };
let activeStorage: MockStorage;
let activeApi: MockApi;

const asyncStorageProxy = {
  multiGet: (keys: string[]) => activeStorage.multiGet(keys),
  getItem: (key: string) => activeStorage.getItem(key),
  setItem: (key: string, value: string) => activeStorage.setItem(key, value),
  multiRemove: (keys: string[]) => activeStorage.multiRemove(keys),
};

const apiClientProxy = {
  getSync: () => activeApi.getSync(),
  saveSync: () => activeApi.saveSync(),
};

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
  activeAuth = { isLoaded: true, isSignedIn: true, userId: "clinician-1" };
  let cloudCallCount = 0;
  let latest: DataView = {
    patients: [],
    prescriptions: [],
    doctor: { nameEn: "" },
    prescriptionConfig: {},
    loading: true,
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
  activeStorage = asyncStorage;
  activeApi = apiClient;
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
    if (request === "@clerk/expo") return { useAuth: () => activeAuth };
    if (request === "@react-native-async-storage/async-storage") {
      return { __esModule: true, default: asyncStorageProxy };
    }
    if (request === "react-native") return nativeModules;
    if (request === "@workspace/api-client-react") return apiClientProxy;
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
        loading: data.loading,
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

    activeAuth = { isLoaded: true, isSignedIn: true, userId: "clinician-2" };
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


test("mounted DataProvider repairs an invalid persisted Rx Pad selection without changing the first overlay", async () => {
  const userId = "clinician-recovery";
  const storage = new Map<string, string>();
  const savedConfig = normalizePrescriptionConfig({
    version: 8,
    activeRxPadOverlayId: "first-pad",
    rxPadOverlays: [
      {
        id: "first-pad",
        name: "First custom pad",
        imageUri: "data:image/jpeg;base64,Zmlyc3Q=",
        imageWidthPx: 2480,
        imageHeightPx: 3508,
        paperWidthMm: 123.4,
        paperHeightMm: 265.6,
        fields: [
          {
            id: "patient",
            label: "Patient particulars",
            enabled: true,
            x: 11.5,
            y: 22.25,
            width: 47.75,
            height: 8.5,
            fontSize: 9,
          },
        ],
      },
      {
        id: "second-pad",
        name: "Second custom pad",
        imageUri: "data:image/jpeg;base64,c2Vjb25k",
        imageWidthPx: 1200,
        imageHeightPx: 1800,
        paperWidthMm: 210,
        paperHeightMm: 297,
        fields: [],
      },
    ],
  });
  const firstOverlay = savedConfig.rxPadOverlays?.[0];
  assert.ok(firstOverlay);
  const expectedFirstOverlay = JSON.parse(JSON.stringify(firstOverlay));
  const corruptedConfig = {
    ...savedConfig,
    activeRxPadOverlayId: "missing-pad",
  };
  const configKey = `@optiscript_prescription_config:${userId}`;
  storage.set(configKey, JSON.stringify(corruptedConfig));

  activeAuth = { isLoaded: true, isSignedIn: true, userId };
  activeStorage = {
    multiGet: async (keys) => keys.map((key) => [key, storage.get(key) ?? null]),
    getItem: async (key) => storage.get(key) ?? null,
    setItem: async (key, value) => {
      storage.set(key, value);
    },
    multiRemove: async (keys) => {
      keys.forEach((key) => storage.delete(key));
    },
  };
  activeApi = {
    getSync: async () => {
      throw new Error("offline");
    },
    saveSync: async () => ({ revision: 1 }),
  };

  let latest: Pick<DataView, "loading" | "prescriptionConfig"> = {
    loading: true,
    prescriptionConfig: {},
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
    if (request === "@clerk/expo") return { useAuth: () => activeAuth };
    if (request === "@react-native-async-storage/async-storage") {
      return { __esModule: true, default: asyncStorageProxy };
    }
    if (request === "react-native") return nativeModules;
    if (request === "@workspace/api-client-react") return apiClientProxy;
    if (request.endsWith(".jpg")) return 0;
    return originalLoad.call(this, request, parent, isMain);
  };
  let renderer: ReturnType<typeof create> | undefined;
  try {
    const { DataProvider, useData } = await import("../context/DataContext");
    function Probe() {
      const data = useData();
      latest = {
        loading: data.loading,
        prescriptionConfig: {
          activeRxPadOverlayId: data.prescriptionConfig.activeRxPadOverlayId,
        },
      };
      return null;
    }

    await act(async () => {
      renderer = create(
        React.createElement(DataProvider, null, React.createElement(Probe)),
      );
    });
    await act(async () => {
      await waitFor(() => latest.loading === false, "Rx Pad recovery load");
    });

    const rewritten = JSON.parse(storage.get(configKey) as string) as typeof corruptedConfig;
    const rewrittenFirstOverlay = rewritten.rxPadOverlays?.[0];
    assert.ok(rewrittenFirstOverlay);
    assert.equal(latest.prescriptionConfig.activeRxPadOverlayId, "first-pad");
    assert.equal(rewritten.activeRxPadOverlayId, "first-pad");
    assert.equal(rewrittenFirstOverlay.paperWidthMm, expectedFirstOverlay.paperWidthMm);
    assert.equal(rewrittenFirstOverlay.paperHeightMm, expectedFirstOverlay.paperHeightMm);
    assert.deepEqual(rewrittenFirstOverlay.fields, expectedFirstOverlay.fields);
  } finally {
    renderer?.unmount();
    moduleApi._load = originalLoad;
  }
});