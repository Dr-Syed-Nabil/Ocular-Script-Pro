import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { normalizePrescriptionConfig } from "@/constants/prescriptionConfig";
import {
  constrainRxPadOverlayField,
  createRxPadOverlayContentFields,
  getRxPadImageBackgroundPosition,
  getRxPadImageRenderGeometry,
  MIN_RX_PAD_FIELD_HEIGHT_MM,
  MIN_RX_PAD_FIELD_WIDTH_MM,
} from "@/utils/rxPadOverlay";
import {
  generateRxPadOverlayHTML,
  getRxPadPrintDecision,
  hasRxPadOverlayContent,
} from "@/utils/generatePrescriptionHTML";
import type { Prescription } from "@/types";
import {
  deserializePrescriptionConfig,
  getPrescriptionConfigForUser,
  getPrescriptionConfigStorageKey,
  isCurrentDataSession,
  serializePrescriptionConfig,
} from "@/utils/prescriptionConfigStorage";

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

test("reopens an uploaded scan from prescription configuration storage without changing its PDF placement", () => {
  const userId = "clinician-1";
  const storage = new Map<string, string>();
  const savedConfig = normalizePrescriptionConfig({
    version: 8,
    activeRxPadOverlayId: "uploaded-pad",
    rxPadOverlays: [{
      id: "uploaded-pad",
      name: "Uploaded pad",
      imageUri: "data:image/jpeg;base64,c2Nhbm5lZC1yeC1wYWQ=",
      imageWidthPx: 2480,
      imageHeightPx: 3508,
      imageFit: "crop",
      imagePositionX: 35,
      imagePositionY: 70,
      paperWidthMm: 210,
      paperHeightMm: 297,
      fields: [{ ...field, id: "diagnosis", x: 42, y: 47, width: 112, height: 10 }],
    }],
  });
  const storageKey = getPrescriptionConfigStorageKey(userId);

  storage.set(storageKey, serializePrescriptionConfig(savedConfig));

  const reopened = deserializePrescriptionConfig(storage.get(storageKey));
  const overlay = reopened.rxPadOverlays?.find((candidate) => candidate.id === reopened.activeRxPadOverlayId);
  assert.ok(overlay);
  assert.equal(storageKey, "@optiscript_prescription_config:clinician-1");
  assert.equal(overlay.imageUri, "data:image/jpeg;base64,c2Nhbm5lZC1yeC1wYWQ=");
  assert.equal(overlay.imageWidthPx, 2480);
  assert.equal(overlay.imageHeightPx, 3508);
  assert.equal(overlay.imageFit, "crop");
  assert.equal(overlay.imagePositionX, 35);
  assert.equal(overlay.imagePositionY, 70);
  assert.equal(overlay.paperWidthMm, 210);
  assert.equal(overlay.paperHeightMm, 297);

  const html = generateRxPadOverlayHTML(
    { ...emptyPrescription, diagnosis: "Cataract" },
    overlay,
  );
  assert.match(html, /@page \{ size: 210mm 297mm; margin: 0; \}/);
  assert.match(html, /background-position: 35% 70%; background-size: cover;/);
  assert.match(html, /left:42mm;top:47mm;width:112mm;height:10mm/);
});

test("loads each clinician's own active Rx pad and clears it at sign-out", () => {
  const storage = new Map<string, string>();
  const clinicianOne = normalizePrescriptionConfig({
    activeRxPadOverlayId: "clinician-one-pad",
    rxPadOverlays: [{
      id: "clinician-one-pad",
      name: "Clinician one",
      paperWidthMm: 210,
      paperHeightMm: 297,
      fields: [],
    }],
  });
  const clinicianTwo = normalizePrescriptionConfig({
    activeRxPadOverlayId: "clinician-two-pad",
    rxPadOverlays: [{
      id: "clinician-two-pad",
      name: "Clinician two",
      paperWidthMm: 140,
      paperHeightMm: 216,
      fields: [],
    }],
  });
  storage.set(getPrescriptionConfigStorageKey("clinician-1"), serializePrescriptionConfig(clinicianOne));
  storage.set(getPrescriptionConfigStorageKey("clinician-2"), serializePrescriptionConfig(clinicianTwo));

  assert.equal(getPrescriptionConfigForUser(storage, "clinician-1").activeRxPadOverlayId, "clinician-one-pad");
  assert.equal(
    getPrescriptionConfigForUser(storage, null).activeRxPadOverlayId,
    normalizePrescriptionConfig(undefined).activeRxPadOverlayId,
    "sign-out must expose only the default in-memory selection",
  );
  assert.equal(getPrescriptionConfigForUser(storage, "clinician-2").activeRxPadOverlayId, "clinician-two-pad");
  assert.equal(getPrescriptionConfigForUser(storage, "clinician-1").activeRxPadOverlayId, "clinician-one-pad");
});

test("rejects delayed Rx pad loads after the clinician session changes", () => {
  assert.equal(isCurrentDataSession("clinician-1", "clinician-1"), true);
  assert.equal(isCurrentDataSession(null, "clinician-1"), false);
  assert.equal(isCurrentDataSession("clinician-2", "clinician-1"), false);
});

test("DataProvider preserves the original clinician through nested cloud sync work", () => {
  const source = readFileSync(join(process.cwd(), "context/DataContext.tsx"), "utf8");

  assert.match(source, /applySnapshot\(merged, expectedUserId\)/);
  assert.match(source, /scheduleSync\(merged, expectedUserId\)/);
  assert.match(source, /scheduleSync\(localSnapshot, expectedUserId\)/);
  assert.match(
    source,
    /const applied = await applySnapshot\(merged, expectedUserId\);\s*if \(!applied \|\| !isCurrentDataSession\(activeUserIdRef\.current, expectedUserId\)\) return;/,
  );
  assert.match(
    source,
    /result = await save\(merged, conflict\.revision\);\s*}\s*if \(!isCurrentDataSession\(activeUserIdRef\.current, expectedUserId\)\) return;/,
  );
});

test("keeps saved individual content geometry and label preferences after reopening", () => {
  const savedConfig = {
    version: 8,
    activeRxPadOverlayId: "custom-pad",
    rxPadOverlays: [{
      id: "custom-pad",
      name: "Custom pad",
      paperWidthMm: 100,
      paperHeightMm: 80,
      fields: [{
        ...field,
        showCategoryLabel: false,
        showContentLabels: false,
        contentFields: [{
          id: "name",
          label: "Patient name",
          enabled: true,
          x: 96,
          y: 78,
          width: 20,
          height: 10,
          fontSize: 9,
          color: "#1A6FAB",
        }],
      }],
    }],
  };

  const reopened = normalizePrescriptionConfig(JSON.parse(JSON.stringify(savedConfig)));
  const reopenedField = reopened.rxPadOverlays?.[0]?.fields.find((candidate) => candidate.id === "patient");
  const reopenedContent = reopenedField?.contentFields?.[0];

  assert.equal(reopenedField?.showCategoryLabel, false);
  assert.equal(reopenedField?.showContentLabels, false);
  assert.equal(reopenedContent?.x, 80);
  assert.equal(reopenedContent?.y, 70);
  assert.equal(reopenedContent?.width, 20);
  assert.equal(reopenedContent?.height, 10);
  assert.equal(reopenedContent?.color, "#1A6FAB");
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

test("falls back to the first overlay when the saved active ID is missing, blank, or malformed", async (t) => {
  const overlays = [
    {
      id: "first-pad",
      name: "First pad",
      paperWidthMm: 123.4,
      paperHeightMm: 265.6,
      fields: [{ ...field, x: 11.5, y: 22.25, width: 47.75, height: 8.5 }],
    },
    { id: "second-pad", name: "Second pad", paperWidthMm: 140, paperHeightMm: 216, fields: [] },
  ];
  const invalidActiveIds = [
    { name: "missing", value: undefined },
    { name: "deleted overlay", value: "deleted-pad" },
    { name: "blank", value: "   " },
    { name: "malformed", value: { id: "second-pad" } },
  ] as const;

  for (const invalidActiveId of invalidActiveIds) {
    await t.test(invalidActiveId.name, () => {
      const reopened = normalizePrescriptionConfig({
        version: 8,
        ...(invalidActiveId.value === undefined ? {} : { activeRxPadOverlayId: invalidActiveId.value }),
        rxPadOverlays: overlays,
        rxPadOverlay: overlays[1],
      });

      assert.equal(reopened.activeRxPadOverlayId, "first-pad");
      assert.equal(reopened.rxPadOverlay?.id, "first-pad");
      assert.equal(reopened.rxPadOverlay, reopened.rxPadOverlays?.[0]);
      assert.equal(reopened.rxPadOverlay?.paperWidthMm, 123.4);
      assert.equal(reopened.rxPadOverlay?.paperHeightMm, 265.6);
      assert.deepEqual(
        reopened.rxPadOverlay?.fields.find((candidate) => candidate.id === "patient"),
        {
          ...field,
          x: 11.5,
          y: 22.25,
          width: 47.75,
          height: 8.5,
          printMode: "all",
          contentSelection: undefined,
        },
      );
    });
  }
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

test("blocks empty scanned Rx Pad printing on web and native paths", () => {
  const overlay = {
    id: "custom-pad",
    name: "Custom pad",
    imageUri: "data:image/jpeg;base64,scan",
    paperWidthMm: 100,
    paperHeightMm: 80,
    fields: [{ ...field, id: "diagnosis" }],
  };

  for (const printPath of ["web", "native"] as const) {
    assert.deepEqual(
      getRxPadPrintDecision(emptyPrescription, overlay, printPath),
      {
        action: "review",
        printPath,
        reviewRoute: "/rx-pad-settings?prescriptionId=rx-1",
      },
      `${printPath} must stop before opening its print flow`,
    );
  }
});

test("continues populated scanned Rx Pad printing on web and native paths", () => {
  const overlay = {
    id: "custom-pad",
    name: "Custom pad",
    imageUri: "data:image/jpeg;base64,scan",
    paperWidthMm: 100,
    paperHeightMm: 80,
    fields: [{ ...field, id: "diagnosis" }],
  };
  const populatedPrescription = { ...emptyPrescription, diagnosis: "Cataract" };

  for (const printPath of ["web", "native"] as const) {
    assert.deepEqual(
      getRxPadPrintDecision(populatedPrescription, overlay, printPath),
      { action: "print", printPath },
      `${printPath} should keep the existing print behavior`,
    );
  }
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

test("prints independently positioned content boxes without category or content labels when omitted", () => {
  const individualField = {
    ...field,
    id: "patient",
    showCategoryLabel: false,
    showContentLabels: false,
    contentFields: [
      { id: "name", label: "Name", enabled: true, x: 5, y: 6, width: 25, height: 6, fontSize: 9, color: "#1A6FAB" },
      { id: "age", label: "Age", enabled: true, x: 40, y: 16, width: 15, height: 6, fontSize: 8, color: "#A449D5" },
    ],
  };
  const html = generateRxPadOverlayHTML(
    { ...emptyPrescription, patientName: "Mina", patientAge: "42" },
    { id: "custom-pad", name: "Custom pad", paperWidthMm: 100, paperHeightMm: 80, fields: [individualField] },
  );

  assert.equal((html.match(/class="overlay-content-field"/g) || []).length, 2);
  assert.match(html, /left:5mm;top:6mm;width:25mm;height:6mm[^>]*>Mina<\/div>/);
  assert.match(html, /left:40mm;top:16mm;width:15mm;height:6mm[^>]*>42<\/div>/);
  assert.doesNotMatch(html, /Patient particulars|Name:|Age:/);
});

test("creates colored child boxes inside the category bounds", () => {
  const contentFields = createRxPadOverlayContentFields({
    ...field,
    id: "patient",
    showCategoryLabel: true,
    x: 10,
    y: 20,
    width: 40,
    height: 30,
  });

  assert.equal(contentFields.length, 6);
  assert.equal(contentFields[0].y, 25);
  assert.ok(contentFields.every((contentField) => contentField.color?.startsWith("#")));
  assert.ok(contentFields.every((contentField) => contentField.x >= 10 && contentField.x + contentField.width <= 50));
});
