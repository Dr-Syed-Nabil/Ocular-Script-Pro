import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { normalizePrescriptionConfig } from "@/constants/prescriptionConfig";
import {
  constrainRxPadOverlayField,
  getRxPadImageBackgroundPosition,
  getRxPadImageRenderGeometry,
  MIN_RX_PAD_FIELD_HEIGHT_MM,
  MIN_RX_PAD_FIELD_WIDTH_MM,
} from "@/utils/rxPadOverlay";
import { generateRxPadOverlayHTML, hasRxPadOverlayContent } from "@/utils/generatePrescriptionHTML";
import type { Prescription } from "@/types";

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

const emptyPrescription: Prescription = {
  id: "rx-1",
  patientId: "patient-1",
  patientName: "",
  patientAge: "",
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
  assert.equal(reopened.activeRxPadOverlayId, "custom-pad");
  assert.equal(reopened.rxPadOverlay?.id, "custom-pad");
  assert.equal(overlay?.paperWidthMm, 123.4);
  assert.equal(overlay?.paperHeightMm, 265.6);
  assert.equal(overlay?.imageFit, "fit");
  assert.equal(overlay?.imagePositionX, 50);
  assert.equal(overlay?.imagePositionY, 50);
  assert.deepEqual(
    overlay?.fields.find((candidate) => candidate.id === "patient"),
    {
      ...field,
      x: 11.5,
      y: 22.25,
      width: 47.75,
      height: 8.5,
      fontSize: 9,
      printMode: "all",
      contentSelection: undefined,
    },
  );
});

test("keeps the selected duplicate overlay active while assigning unique IDs", () => {
  const savedConfig = {
    version: 8,
    activeRxPadOverlayId: "custom-pad",
    rxPadOverlays: [
      { ...field, id: "custom-pad", name: "First pad", paperWidthMm: 100, paperHeightMm: 80, fields: [] },
      { ...field, id: "custom-pad", name: "Selected pad", paperWidthMm: 120, paperHeightMm: 90, fields: [] },
    ],
    rxPadOverlay: {
      ...field,
      id: "custom-pad",
      name: "Selected pad",
      paperWidthMm: 120,
      paperHeightMm: 90,
      fields: [],
    },
  };

  const reopened = normalizePrescriptionConfig(JSON.parse(JSON.stringify(savedConfig)));

  assert.deepEqual(reopened.rxPadOverlays?.map((overlay) => overlay.id), ["custom-pad", "custom-pad-2"]);
  assert.equal(reopened.activeRxPadOverlayId, "custom-pad-2");
  assert.equal(reopened.rxPadOverlay?.name, "Selected pad");
  assert.equal(reopened.rxPadOverlay?.paperWidthMm, 120);
});

test("migrates a legacy single overlay into the saved overlay collection", () => {
  const reopened = normalizePrescriptionConfig({
    version: 7,
    rxPadOverlay: {
      ...field,
      id: "legacy-pad",
      name: "Legacy pad",
      paperWidthMm: 140,
      paperHeightMm: 200,
      fields: [],
    },
  });

  assert.equal(reopened.rxPadOverlays?.length, 1);
  assert.equal(reopened.rxPadOverlays?.[0].id, "legacy-pad");
  assert.equal(reopened.activeRxPadOverlayId, "legacy-pad");
  assert.equal(reopened.rxPadOverlay?.name, "Legacy pad");
});

test("keeps the selected scan fit behavior in the overlay PDF", () => {
  const baseOverlay = {
    id: "custom-pad",
    name: "Custom pad",
    imageUri: "data:image/jpeg;base64,scan",
    paperWidthMm: 123.4,
    paperHeightMm: 265.6,
    fields: [],
  };
  const rx = {
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
  };

  assert.match(generateRxPadOverlayHTML(rx, { ...baseOverlay, imageFit: "contain" }), /background-position: 50% 50%; background-size: contain;/);
  assert.match(generateRxPadOverlayHTML(rx, { ...baseOverlay, imageFit: "crop" }), /background-position: 50% 50%; background-size: cover;/);
  assert.match(generateRxPadOverlayHTML(rx, { ...baseOverlay, imageFit: "contain", imagePositionX: 0, imagePositionY: 100 }), /background-position: 0% 100%; background-size: contain;/);
  assert.match(generateRxPadOverlayHTML(rx, baseOverlay), /background-position: 50% 50%; background-size: 100% 100%;/);
});

test("uses the same percentage alignment geometry for contain and crop previews", () => {
  const centeredContain = getRxPadImageRenderGeometry(200, 300, 400, 400, "contain", 50, 50);
  assert.deepEqual(centeredContain, { left: 0, top: 50, width: 200, height: 200 });

  const topLeftCrop = getRxPadImageRenderGeometry(200, 300, 400, 400, "crop", 0, 0);
  assert.deepEqual(topLeftCrop, { left: 0, top: 0, width: 300, height: 300 });

  const bottomRightCrop = getRxPadImageRenderGeometry(200, 300, 400, 400, "crop", 100, 100);
  assert.deepEqual(bottomRightCrop, { left: -100, top: 0, width: 300, height: 300 });

  assert.equal(getRxPadImageBackgroundPosition(-20, 120), "0% 100%");
});

test("renders a mismatched-aspect scan at the configured paper size for every fit choice", { skip: !existsSync("/repl/tools/bin/chromium") }, () => {
  const paperWidthMm = 123.4;
  const paperHeightMm = 265.6;
  const scanPath = join(process.cwd(), "assets/images/nabil-rx-pad-a4.jpg");
  const imageUri = `data:image/jpeg;base64,${readFileSync(scanPath).toString("base64")}`;
  const overlay = {
    id: "wide-scan",
    name: "Wide scan on tall paper",
    imageUri,
    imageWidthPx: 1080,
    imageHeightPx: 1505,
    paperWidthMm,
    paperHeightMm,
    fields: [{ ...field, x: 11.5, y: 22.25, width: 47.75, height: 8.5 }],
  };
  const workDir = mkdtempSync(join(tmpdir(), "rx-pad-fit-"));
  const expectedWidthPt = paperWidthMm * 72 / 25.4;
  const expectedHeightPt = paperHeightMm * 72 / 25.4;

  try {
    for (const fit of ["fit", "contain", "crop"] as const) {
      const htmlPath = join(workDir, `${fit}.html`);
      const pdfPath = join(workDir, `${fit}.pdf`);
      writeFileSync(htmlPath, generateRxPadOverlayHTML(emptyPrescription, { ...overlay, imageFit: fit }));
      execFileSync("/repl/tools/bin/chromium", [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--allow-file-access-from-files",
        `--print-to-pdf=${pdfPath}`,
        `file://${htmlPath}`,
      ], { stdio: "ignore" });

      const pdf = readFileSync(pdfPath);
      assert.ok(pdf.length > 1_000, `${fit} PDF should not be empty`);
      assert.match(pdf.toString("latin1"), /\/Subtype\s*\/Image/, `${fit} PDF should embed the scan`);
      const mediaBox = pdf.toString("latin1").match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
      assert.ok(mediaBox, `${fit} PDF should declare a physical page size`);
      assert.ok(Math.abs(Number(mediaBox[1]) - expectedWidthPt) < 1.5, `${fit} PDF width drifted`);
      assert.ok(Math.abs(Number(mediaBox[2]) - expectedHeightPt) < 1.5, `${fit} PDF height drifted`);
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
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

test("omits disabled and empty fields while escaping multiline values", () => {
  const html = generateRxPadOverlayHTML(
    {
      ...emptyPrescription,
      patientName: "Disabled patient",
      chiefComplaints: "   ",
      diagnosis: '<script>alert("x")</script>\nsecond line & more',
    },
    {
      id: "custom-pad",
      name: "Custom pad",
      paperWidthMm: 100,
      paperHeightMm: 80,
      fields: [
        { ...field, id: "patient", enabled: false },
        { ...field, id: "chiefComplaints", enabled: true },
        { ...field, id: "diagnosis", enabled: true },
      ],
    },
  );

  assert.equal((html.match(/class="overlay-field"/g) || []).length, 1);
  assert.match(html, /&lt;script&gt;alert\("x"\)&lt;\/script&gt;<br\/>second line &amp; more/);
  assert.doesNotMatch(html, /class="overlay-field"[^>]*>Disabled patient/);
});

test("does not render placeholder-only empty visual acuity or spectacle fields", () => {
  const html = generateRxPadOverlayHTML(emptyPrescription, {
    id: "custom-pad",
    name: "Custom pad",
    paperWidthMm: 100,
    paperHeightMm: 80,
    fields: [
      { ...field, id: "visualAcuity" },
      { ...field, id: "spectacle" },
    ],
  });

  assert.doesNotMatch(html, /class="overlay-field"/);
  assert.doesNotMatch(html, /RE:|LE:|D:|N:/);
});

test("detects when an overlay has no enabled printable fields", () => {
  const overlay = {
    id: "custom-pad",
    name: "Custom pad",
    paperWidthMm: 100,
    paperHeightMm: 80,
    fields: [
      { ...field, id: "patient", enabled: false },
      { ...field, id: "chiefComplaints", enabled: true },
      { ...field, id: "diagnosis", enabled: true, printMode: "selected" as const, contentSelection: [] },
    ],
  };

  assert.equal(hasRxPadOverlayContent(emptyPrescription, overlay), false);
  assert.equal(
    hasRxPadOverlayContent({ ...emptyPrescription, diagnosis: "Cataract" }, overlay),
    false,
    "selected fields with no selected content must stay empty",
  );
  assert.equal(
    hasRxPadOverlayContent(
      { ...emptyPrescription, chiefComplaints: "Blurred vision" },
      overlay,
    ),
    true,
  );
});

test("keeps overlay HTML output unchanged when a field has printable content", () => {
  const html = generateRxPadOverlayHTML(
    { ...emptyPrescription, diagnosis: "Cataract" },
    {
      id: "custom-pad",
      name: "Custom pad",
      paperWidthMm: 100,
      paperHeightMm: 80,
      fields: [{ ...field, id: "diagnosis" }],
    },
  );

  assert.match(html, /class="overlay-field"/);
  assert.match(html, />Cataract<\/div>/);
});
