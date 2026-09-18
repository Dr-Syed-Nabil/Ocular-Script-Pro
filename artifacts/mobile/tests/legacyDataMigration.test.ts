import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import React from "react";

type AuthState = { isLoaded: boolean; isSignedIn: boolean; userId: string | null };

type DataView = {
  patients: Array<{ id: string; name: string }>;
  doctorName: string;
  syncStatus: string;
  legacyDataAvailable: boolean;
  claimLegacyData: () => Promise<boolean>;
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

function waitFor(predicate: () => boolean, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (predicate()) return resolve();
      if (Date.now() - startedAt > 2_000) return reject(new Error(`Timed out waiting for ${message}`));
      setTimeout(check, 0);
    };
    check();
  });
}

test("keeps legacy records quarantined until the original device claimant confirms ownership", async () => {
  const storage = new Map<string, string>();
  const legacyPatient = {
    id: "legacy-patient",
    name: "Legacy patient",
    dob: "1980-01-01",
    phone: "",
    email: "",
    gender: "",
    createdAt: "2026-09-18T00:00:00.000Z",
    updatedAt: "2026-09-18T00:00:00.000Z",
  };
  storage.set("@optiscript_patients", JSON.stringify([legacyPatient]));
  storage.set("@optiscript_prescriptions", JSON.stringify([]));
  storage.set("@optiscript_doctor", JSON.stringify({ nameEn: "Legacy doctor" }));
  storage.set("@optiscript_prescription_config", JSON.stringify({ version: 8, rxPadOverlays: [], fields: [] }));

  let auth: AuthState = { isLoaded: true, isSignedIn: true, userId: "clinician-1" };
  let latest: DataView = {
    patients: [],
    doctorName: "",
    syncStatus: "idle",
    legacyDataAvailable: false,
    claimLegacyData: async () => false,
  };
  const asyncStorage = {
    multiGet: async (keys: string[]) => keys.map((key) => [key, storage.get(key) ?? null] as [string, string | null]),
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => { storage.set(key, value); },
    multiRemove: async (keys: string[]) => { keys.forEach((key) => storage.delete(key)); },
  };
  const apiClient = {
    getSync: async () => ({ revision: 0, snapshot: null }),
    saveSync: async () => ({ revision: 1 }),
  };
  const nativeModules = {
    AppState: {
      currentState: "active",
      addEventListener: () => ({ remove: () => undefined }),
    },
    Image: { resolveAssetSource: () => ({ uri: "file://bundled-rx-pad.jpg" }) },
  };
  const moduleApi = localRequire("node:module") as {
    _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
  };
  const originalLoad = moduleApi._load;
  moduleApi._load = function load(request, parent, isMain) {
    if (request === "@clerk/expo") return { useAuth: () => auth };
    if (request === "@react-native-async-storage/async-storage") return { __esModule: true, default: asyncStorage };
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
        doctorName: data.doctor.nameEn,
        syncStatus: data.syncStatus,
        legacyDataAvailable: data.legacyDataAvailable,
        claimLegacyData: data.claimLegacyData,
      };
      return null;
    }

    await act(async () => {
      renderer = create(React.createElement(DataProvider, null, React.createElement(Probe)));
    });
    await act(async () => {
      await waitFor(() => latest.legacyDataAvailable && latest.syncStatus === "synced", "legacy quarantine");
    });
    assert.deepEqual(latest.patients, []);
    assert.equal(latest.doctorName, "");
    assert.equal(storage.has("@optiscript_patients"), true);
    assert.equal(storage.get("@optiscript_legacy_candidate"), "clinician-1");

    auth = { isLoaded: true, isSignedIn: true, userId: "clinician-2" };
    await act(async () => {
      renderer!.update(React.createElement(DataProvider, null, React.createElement(Probe)));
    });
    await act(async () => {
      await waitFor(() => !latest.legacyDataAvailable && latest.patients.length === 0, "other clinician quarantine");
    });
    let otherClaimed = false;
    await act(async () => { otherClaimed = await latest.claimLegacyData(); });
    assert.equal(otherClaimed, false);
    assert.equal(storage.has("@optiscript_patients"), true);

    auth = { isLoaded: true, isSignedIn: true, userId: "clinician-1" };
    await act(async () => {
      renderer!.update(React.createElement(DataProvider, null, React.createElement(Probe)));
    });
    await act(async () => {
      await waitFor(() => latest.legacyDataAvailable, "original claimant prompt");
    });
    let claimed = false;
    await act(async () => { claimed = await latest.claimLegacyData(); });
    assert.equal(claimed, true);
    await act(async () => {
      await waitFor(() => latest.patients[0]?.id === legacyPatient.id, "explicit legacy claim");
    });
    assert.equal(storage.has("@optiscript_patients"), false);
    assert.equal(storage.has("@optiscript_patients:clinician-1"), true);

    auth = { isLoaded: true, isSignedIn: true, userId: "clinician-2" };
    await act(async () => {
      renderer!.update(React.createElement(DataProvider, null, React.createElement(Probe)));
    });
    await act(async () => {
      await waitFor(() => latest.patients.length === 0 && !latest.legacyDataAvailable, "claimed data isolation");
    });
  } finally {
    renderer?.unmount();
    moduleApi._load = originalLoad;
  }
});