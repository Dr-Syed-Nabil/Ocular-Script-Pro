import assert from "node:assert/strict";
import test from "node:test";

import { normalizePrescriptionConfig } from "@/constants/prescriptionConfig";
import {
  constrainRxPadOverlayField,
  MIN_RX_PAD_FIELD_HEIGHT_MM,
  MIN_RX_PAD_FIELD_WIDTH_MM,
} from "@/utils/rxPadOverlay";
import { generateRxPadOverlayHTML } from "@/utils/generatePrescriptionHTML";

const paper = { width: 100, height: 80 };
const field = {
  id: "patient",
  label: "Patient particulars",
  enabled: true,
  x: 20,
  y: 20,
  width: 20,
  height: 10,
  fontSize: 9,
};

test("keeps moved and resized fields inside every paper edge", async (t) => {
  const edgeCases = [
    {
      name: "left edge",
      changes: { x: -12 },
      expected: { x: 0, y: 20, width: 20, height: 10 },
    },
    {
      name: "top edge",
      changes: { y: -8 },
      expected: { x: 20, y: 0, width: 20, height: 10 },
    },
    {
      name: "right edge",
      changes: { x: 95 },
      expected: { x: 80, y: 20, width: 20, height: 10 },
    },
    {
      name: "bottom edge",
      changes: { y: 75 },
      expected: { x: 20, y: 70, width: 20, height: 10 },
    },
    {
      name: "top-left corner after resizing to minimum dimensions",
      changes: { x: -4, y: -3, width: 1, height: 1 },
      expected: { x: 0, y: 0, width: MIN_RX_PAD_FIELD_WIDTH_MM, height: MIN_RX_PAD_FIELD_HEIGHT_MM },
    },
    {
      name: "bottom-right corner after resizing to minimum dimensions",
      changes: { x: 99, y: 79, width: 1, height: 1 },
      expected: { x: 95, y: 76, width: MIN_RX_PAD_FIELD_WIDTH_MM, height: MIN_RX_PAD_FIELD_HEIGHT_MM },
    },
  ] as const;

  for (const edgeCase of edgeCases) {
    await t.test(edgeCase.name, () => {
      const constrained = constrainRxPadOverlayField(
        { ...field, ...edgeCase.changes },
        paper.width,
        paper.height,
      );

      assert.deepEqual(
        {
          x: constrained.x,
          y: constrained.y,
          width: constrained.width,
          height: constrained.height,
        },
        edgeCase.expected,
      );
    });
  }
});

test("preserves valid custom paper dimensions when saved configuration is reopened", () => {
  const savedConfig = {
    version: 8,
    activeRxPadOverlayId: "custom-pad",
    rxPadOverlays: [
      {
        id: "custom-pad",
        name: "Custom pad",
        paperWidthMm: 123.4,
        paperHeightMm: 265.6,
        fields: [
          {
            ...field,
            x: 11.5,
            y: 22.25,
            width: 47.75,
            height: 8.5,
          },
        ],
      },
    ],
  };

  const reopened = normalizePrescriptionConfig(JSON.parse(JSON.stringify(savedConfig)));
  const overlay = reopened.rxPadOverlays?.[0];

  assert.equal(overlay?.id, "custom-pad");
  assert.equal(overlay?.paperWidthMm, 123.4);
  assert.equal(overlay?.paperHeightMm, 265.6);
  assert.deepEqual(
    overlay?.fields.find((candidate) => candidate.id === "patient"),
    {
      ...field,
      x: 11.5,
      y: 22.25,
      width: 47.75,
      height: 8.5,
    },
  );
});

test("emits overlay field geometry and page dimensions in the same millimeters", () => {
  const overlay = {
    id: "custom-pad",
    name: "Custom pad",
    paperWidthMm: 123.4,
    paperHeightMm: 265.6,
    fields: [
      {
        ...field,
        x: 11.5,
        y: 22.25,
        width: 47.75,
        height: 8.5,
      },
    ],
  };
  const html = generateRxPadOverlayHTML(
    {
      id: "rx-1",
      patientId: "patient-1",
      patientName: "Amina Rahman",
      patientAge: "41",
      date: "2026-09-07",
      rightEyeVA: { ua: "", wa: "", ph: "", bcva: "" },
      leftEyeVA: { ua: "", wa: "", ph: "", bcva: "" },
      chiefComplaints: "",
      pastHistory: { dm: false, htn: false, ihd: false, ckd: false, ba: false, thyDs: false, uromax: false, others: "" },
      adnexa: "",
      anteriorSegment: "",
      posteriorSegment: "",
      gatRight: "",
      gatLeft: "",
      drugs: [],
      rightEyeDistance: { dsp: "", dcyl: "", axis: "", va: "" },
      leftEyeDistance: { dsp: "", dcyl: "", axis: "", va: "" },
      rightEyeNear: { dsp: "", dcyl: "", axis: "", va: "" },
      leftEyeNear: { dsp: "", dcyl: "", axis: "", va: "" },
      ipd: "",
      nearIPD: "",
      addValue: "",
      lensUsage: "",
      lensType: "",
      lensCoating: [],
      lensMaterial: "",
      advice: "",
      adviceBn: "",
      followUp: "",
      followUpBn: "",
      createdAt: "2026-09-07T00:00:00.000Z",
    },
    overlay,
  );

  assert.match(html, /@page \{ size: 123\.4mm 265\.6mm; margin: 0; \}/);
  assert.match(html, /html, body \{ width: 123\.4mm; height: 265\.6mm;/);
  assert.match(html, /<div class="overlay-field" style="left:11\.5mm;top:22\.25mm;width:47\.75mm;height:8\.5mm;font-size:9pt">/);
});