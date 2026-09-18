import assert from "node:assert/strict";
import test from "node:test";

import { normalizePrescription } from "@/utils/prescriptionNormalization";

const patientsById = new Map();
const basePayload = {
  id: "rx-legacy-fields",
  patientId: "patient-1",
  patientName: "Test Patient",
  createdAt: "2026-09-18T10:00:00.000Z",
};

test("opens legacy eye fields with current prescription names", () => {
  const prescription = normalizePrescription({
    ...basePayload,
    rightEyeDistance: { sphere: "-1.25", cylinder: "-0.50", axis: "90", va: "6/6" },
    leftEyeDistance: { sphere: "-2.00", cylinder: "-0.75", axis: "80", va: "6/9" },
    rightEyeNear: { sphere: "+0.50", cylinder: "-0.25", axis: "100", va: "N6" },
    leftEyeNear: { sphere: "+0.75", cylinder: "-0.50", axis: "70", va: "N8" },
    addPower: "+2.00",
  }, patientsById);

  assert.ok(prescription);
  assert.deepEqual(prescription.rightEyeDistance, { dsp: "-1.25", dcyl: "-0.50", axis: "90", va: "6/6" });
  assert.deepEqual(prescription.leftEyeDistance, { dsp: "-2.00", dcyl: "-0.75", axis: "80", va: "6/9" });
  assert.deepEqual(prescription.rightEyeNear, { dsp: "+0.50", dcyl: "-0.25", axis: "100", va: "N6" });
  assert.deepEqual(prescription.leftEyeNear, { dsp: "+0.75", dcyl: "-0.50", axis: "70", va: "N8" });
  assert.equal(prescription.addValue, "+2.00");
});

test("keeps current eye prescription fields unchanged", () => {
  const currentEyeRx = { dsp: "-3.25", dcyl: "-1.00", axis: "45", va: "6/6" };
  const prescription = normalizePrescription({
    ...basePayload,
    id: "rx-current-fields",
    rightEyeDistance: currentEyeRx,
    leftEyeDistance: currentEyeRx,
    rightEyeNear: currentEyeRx,
    leftEyeNear: currentEyeRx,
    addValue: "+1.50",
  }, patientsById);

  assert.ok(prescription);
  assert.deepEqual(prescription.rightEyeDistance, currentEyeRx);
  assert.deepEqual(prescription.leftEyeDistance, currentEyeRx);
  assert.deepEqual(prescription.rightEyeNear, currentEyeRx);
  assert.deepEqual(prescription.leftEyeNear, currentEyeRx);
  assert.equal(prescription.addValue, "+1.50");
});