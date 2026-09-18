import { DoctorProfile, Drug, EyeSpectacleRx, EyeVA, PastHistory, Prescription, RxPadOverlayConfig, RxPadOverlayContentField, RxPadOverlayField } from "@/types";
import {
  constrainRxPadOverlayContentField,
  constrainRxPadOverlayField,
  getRxPadImageBackgroundPosition,
  normalizeRxPadImageFit,
  normalizeRxPadPaperSize,
} from "@/utils/rxPadOverlay";
import { getUntranslatedEnglishWords } from "@/utils/banglaTranslate";

/* ── helpers ── */
function esc(s: string | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function row(label: string, val: string): string {
  if (!val) return "";
  return `<tr><td class="lbl">${esc(label)}</td><td>${esc(val)}</td></tr>`;
}
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return iso; }
}
function rxCell(v: string, isAxis = false): string {
  if (!v) return `<td class="rx-cell empty">—</td>`;
  return `<td class="rx-cell">${esc(isAxis ? v + (v.includes("°") ? "" : "°") : v)}</td>`;
}

/* ── VA table ── */
function vaTable(reVA: EyeVA, leVA: EyeVA): string {
  const rows = [
    ["UA", reVA.ua, leVA.ua],
    ["WA", reVA.wa, leVA.wa],
    ["PH", reVA.ph, leVA.ph],
    ["BCVA", reVA.bcva, leVA.bcva],
  ];
  const hasData = rows.some(([, r, l]) => r || l);
  if (!hasData) return "";
  return `
    <table class="va-table">
      <thead><tr><th class="va-lbl"></th><th>RE (OD)</th><th>LE (OS)</th></tr></thead>
      <tbody>
        ${rows.map(([lbl, re, le]) => (re || le) ? `<tr><td class="va-lbl">${lbl}</td><td class="va-val">${esc(re) || "—"}</td><td class="va-val">${esc(le) || "—"}</td></tr>` : "").join("")}
      </tbody>
    </table>`;
}

/* ── spectacle table ── */
function rxBlock(title: string, re: EyeSpectacleRx, le: EyeSpectacleRx): string {
  const hasDist = re.dsp || re.dcyl || re.axis || re.va || le.dsp || le.dcyl || le.axis || le.va;
  if (!hasDist) return "";
  return `
    <tr class="rx-subtitle"><td colspan="5">${esc(title)}</td></tr>
    <tr class="rx-header"><td></td><td>SPH</td><td>CYL</td><td>AXIS</td><td>VA</td></tr>
    <tr>${rxCell("RE", false).replace("rx-cell", "rx-eye")}${rxCell(re.dsp)}${rxCell(re.dcyl)}${rxCell(re.axis, true)}${rxCell(re.va)}</tr>
    <tr>${rxCell("LE", false).replace("rx-cell", "rx-eye")}${rxCell(le.dsp)}${rxCell(le.dcyl)}${rxCell(le.axis, true)}${rxCell(le.va)}</tr>`;
}

/* ── drugs ── */
function drugsSection(drugs: Drug[]): string {
  const active = drugs.filter((d) => d.name.trim());
  if (!active.length) return "";
  const rows = active.map((d) => {
    const schedules = d.dosePhases?.length
      ? d.dosePhases.map((phase, index) =>
        `${index && phase.connector ? `<strong>${esc(phase.connector)},</strong> ` : ""}${esc(phase.schedule)}`
      ).join("<br/>")
      : `${esc(d.schedule)}${d.scheduleBn ? `<br/><span class="bn">${esc(d.scheduleBn)}</span>` : ""}`;
    const durations = d.dosePhases?.length
      ? d.dosePhases.map((phase) => `${esc(phase.durationValue)} ${esc(phase.durationUnit)}`).join("<br/>")
      : `${esc(d.duration)}${d.durationBn ? `<br/><span class="bn">${esc(d.durationBn)}</span>` : ""}`;
    return `
    <tr>
      <td class="drug-name">${esc(d.name)}</td>
      <td class="drug-route">${esc(d.route)}</td>
      <td>${schedules}</td>
      <td>${durations}</td>
      <td>${esc(d.notes)}</td>
    </tr>`;
  }).join("");
  return `
    <table class="drug-table">
      <thead><tr><th>Drug</th><th>Route</th><th>Schedule</th><th>Duration</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/* ── past history badges ── */
function historyBadges(h: PastHistory): string {
  const items = [h.dm && "DM", h.htn && "HTN", h.ihd && "IHD", h.ckd && "CKD", h.ba && "BA", h.thyDs && "Thyroid Ds", h.uromax && "Uromax"].filter(Boolean) as string[];
  const allItems = [...items, h.others].filter(Boolean);
  if (!allItems.length) return "<span class='none'>None recorded</span>";
  return allItems.map((it) => `<span class="badge">${esc(it)}</span>`).join(" ");
}

function customSectionsHTML(rx: Prescription): string {
  return (rx.customSections || [])
    .filter((section) => section.content?.trim())
    .map((section) => `
      <div class="section">
        <div class="sec-title">${esc(section.title)}</div>
        <div class="sec-body"><p class="advice-en">${esc(section.content).replace(/\n/g, "<br/>")}</p></div>
      </div>`)
    .join("");
}

export function getRxPadOverlayContentValue(rx: Prescription, field: RxPadOverlayField, contentId: string): string {
  const eye = (value: EyeSpectacleRx) => [value.dsp, value.dcyl, value.axis, value.va].filter(Boolean).join(" / ");
  const correctionLine = (right: EyeSpectacleRx, left: EyeSpectacleRx) => {
    const rightValue = eye(right);
    const leftValue = eye(left);
    return rightValue || leftValue ? `RE ${rightValue || "—"} | LE ${leftValue || "—"}` : "";
  };
  switch (`${field.id}:${contentId}`) {
    case "patient:name": return rx.patientName || "";
    case "patient:age": return rx.patientAge || "";
    case "patient:weight": return rx.patientWeight || "";
    case "patient:phone": return rx.patientPhone || "";
    case "patient:puid": return rx.patientPuid || "";
    case "patient:date": return formatDate(rx.date);
    case "chiefComplaints:complaints": return rx.chiefComplaints || "";
    case "pastHistory:conditions":
      return [
        rx.pastHistory?.dm && "DM", rx.pastHistory?.htn && "HTN", rx.pastHistory?.ihd && "IHD",
        rx.pastHistory?.ckd && "CKD", rx.pastHistory?.ba && "BA", rx.pastHistory?.thyDs && "Thyroid Ds",
        rx.pastHistory?.uromax && "Uromax",
      ].filter(Boolean).join(" / ");
    case "pastHistory:others": return rx.pastHistory?.others || "";
    case "pastHistory:notes": return rx.pastHistoryNotes || "";
    case "visualAcuity:ua": return `RE ${rx.rightEyeVA?.ua || "—"} | LE ${rx.leftEyeVA?.ua || "—"}`;
    case "visualAcuity:wa": return `RE ${rx.rightEyeVA?.wa || "—"} | LE ${rx.leftEyeVA?.wa || "—"}`;
    case "visualAcuity:ph": return `RE ${rx.rightEyeVA?.ph || "—"} | LE ${rx.leftEyeVA?.ph || "—"}`;
    case "visualAcuity:bcva": return `RE ${rx.rightEyeVA?.bcva || "—"} | LE ${rx.leftEyeVA?.bcva || "—"}`;
    case "examination:adnexa": return rx.adnexa || "";
    case "examination:anteriorSegment": return rx.anteriorSegment || "";
    case "examination:posteriorSegment": return rx.posteriorSegment || "";
    case "gat:right": return rx.gatRight || "";
    case "gat:left": return rx.gatLeft || "";
    case "diagnosis:diagnosis": return rx.diagnosis || "";
    case "drugs:name": return (rx.drugs || []).filter((drug) => drug.name.trim()).map((drug) => drug.name).join("\n");
    case "drugs:route": return (rx.drugs || []).filter((drug) => drug.name.trim() && drug.route).map((drug) => drug.route).join("\n");
    case "drugs:schedule": return (rx.drugs || []).filter((drug) => drug.name.trim()).map((drug) =>
      drug.dosePhases?.length
        ? drug.dosePhases.map((phase, index) => `${index && phase.connector ? `${phase.connector}, ` : ""}${phase.schedule}`).join(" ")
        : drug.scheduleBn || drug.schedule
    ).join("\n");
    case "drugs:duration": return (rx.drugs || []).filter((drug) => drug.name.trim()).map((drug) =>
      drug.dosePhases?.length
        ? drug.dosePhases.map((phase) => `${phase.durationValue} ${phase.durationUnit}`).join(" ")
        : drug.durationBn || drug.duration
    ).join("\n");
    case "drugs:notes": return (rx.drugs || []).filter((drug) => drug.name.trim() && drug.notes).map((drug) => drug.notes).join("\n");
    case "spectacle:distance": return correctionLine(rx.rightEyeDistance, rx.leftEyeDistance);
    case "spectacle:near": return correctionLine(rx.rightEyeNear, rx.leftEyeNear);
    case "spectacle:ipd": return rx.ipd || rx.nearIPD ? `${rx.ipd || "—"}${rx.nearIPD ? ` / Near ${rx.nearIPD}` : ""}` : "";
    case "lens:usage": return rx.lensUsage || "";
    case "lens:type": return rx.lensType || "";
    case "lens:coating": return (rx.lensCoating || []).join(", ");
    case "lens:material": return rx.lensMaterial || "";
    case "investigations:investigations": return rx.investigations || "";
    case "advice:english": return rx.advice || "";
    case "advice:bengali": return rx.adviceBn || "";
    case "followUp:english": return rx.followUp || "";
    case "followUp:bengali": return rx.followUpBn || "";
    default: return "";
  }
}

function contentFieldValue(rx: Prescription, field: RxPadOverlayField, contentField: RxPadOverlayContentField): string {
  const value = getRxPadOverlayContentValue(rx, field, contentField.id);
  if (!value.trim()) return "";
  return field.showContentLabels === false ? value : `${contentField.label}: ${value}`;
}

export function getRxPadOverlayFieldValue(rx: Prescription, field: RxPadOverlayField): string {
  if (field.contentFields?.length) {
    return field.contentFields
      .filter((contentField) => contentField.enabled && (field.printMode !== "selected" || field.contentSelection?.includes(contentField.id)))
      .map((contentField) => contentFieldValue(rx, field, contentField))
      .filter(Boolean)
      .join("\n");
  }
  const { id } = field;
  const include = (contentId: string) =>
    field.printMode !== "selected" || Boolean(field.contentSelection?.includes(contentId));
  const eye = (value: EyeSpectacleRx) => [value.dsp, value.dcyl, value.axis, value.va].filter(Boolean).join(" / ");
  switch (id) {
    case "patient":
      return [
        include("name") && rx.patientName,
        include("age") && rx.patientAge && `Age: ${rx.patientAge}`,
        include("weight") && rx.patientWeight && `Weight: ${rx.patientWeight}`,
        include("phone") && rx.patientPhone && `Phone: ${rx.patientPhone}`,
        include("puid") && rx.patientPuid && `PUID: ${rx.patientPuid}`,
        include("date") && formatDate(rx.date),
      ].filter(Boolean).join("  ·  ");
    case "chiefComplaints":
      return include("complaints") ? rx.chiefComplaints || "" : "";
    case "pastHistory": {
      const conditions = [
        rx.pastHistory?.dm && "DM", rx.pastHistory?.htn && "HTN", rx.pastHistory?.ihd && "IHD",
        rx.pastHistory?.ckd && "CKD", rx.pastHistory?.ba && "BA", rx.pastHistory?.thyDs && "Thyroid Ds",
        rx.pastHistory?.uromax && "Uromax",
      ].filter(Boolean) as string[];
      const history = [
        include("conditions") && conditions.join(" / "),
        include("others") && rx.pastHistory?.others,
        include("notes") && rx.pastHistoryNotes,
      ].filter(Boolean) as string[];
      return history.join("  /  ");
    }
    case "visualAcuity": {
      const vaLine = (value: EyeVA) => [
        include("ua") && value?.ua && `UA ${value.ua}`,
        include("wa") && value?.wa && `WA ${value.wa}`,
        include("ph") && value?.ph && `PH ${value.ph}`,
        include("bcva") && value?.bcva && `BCVA ${value.bcva}`,
      ].filter(Boolean).join(" | ");
      return [
        vaLine(rx.rightEyeVA) && `RE: ${vaLine(rx.rightEyeVA)}`,
        vaLine(rx.leftEyeVA) && `LE: ${vaLine(rx.leftEyeVA)}`,
      ].filter(Boolean).join("\n");
    }
    case "examination":
      return [
        include("adnexa") && rx.adnexa && `Adnexa: ${rx.adnexa}`,
        include("anteriorSegment") && rx.anteriorSegment && `Anterior Segment: ${rx.anteriorSegment}`,
        include("posteriorSegment") && rx.posteriorSegment && `Posterior Segment: ${rx.posteriorSegment}`,
      ].filter(Boolean).join("\n");
    case "gat":
      const pressure = [
        include("right") && rx.gatRight && `RE: ${rx.gatRight}`,
        include("left") && rx.gatLeft && `LE: ${rx.gatLeft}`,
      ].filter(Boolean).join("  ");
      return pressure ? `${pressure} mmHg` : "";
    case "diagnosis":
      return include("diagnosis") ? rx.diagnosis || "" : "";
    case "drugs":
      return (rx.drugs || []).filter((drug) => drug.name.trim()).map((drug) => {
        const schedule = drug.dosePhases?.length
          ? drug.dosePhases.map((phase, index) =>
            `${index && phase.connector ? `${phase.connector}, ` : ""}${phase.schedule}`
          ).join(" ")
          : drug.scheduleBn || drug.schedule;
        const duration = drug.dosePhases?.length
          ? drug.dosePhases.map((phase) => `${phase.durationValue} ${phase.durationUnit}`).join(" ")
          : drug.durationBn || drug.duration;
        const details = [
          include("name") && drug.name,
          include("route") && drug.route && `(${drug.route})`,
          include("schedule") && schedule && `: ${schedule}`,
          include("duration") && duration && `— ${duration}`,
          include("notes") && drug.notes && `— ${drug.notes}`,
        ].filter(Boolean);
        return details.join(" ");
      }).join("\n");
    case "spectacle": {
      const correctionLine = (label: string, right: EyeSpectacleRx, left: EyeSpectacleRx) => {
        const rightValue = eye(right);
        const leftValue = eye(left);
        return rightValue || leftValue
          ? `${label}: RE ${rightValue || "—"} | LE ${leftValue || "—"}`
          : "";
      };
      const distance = include("distance")
        ? correctionLine("D", rx.rightEyeDistance, rx.leftEyeDistance)
        : "";
      const near = include("near")
        ? correctionLine("N", rx.rightEyeNear, rx.leftEyeNear)
        : "";
      const ipd = include("ipd") && (rx.ipd || rx.nearIPD)
        ? `IPD: ${rx.ipd || "—"}${rx.nearIPD ? ` / Near ${rx.nearIPD}` : ""}`
        : "";
      return [
        distance,
        near,
        ipd,
      ].filter(Boolean).join("\n");
    }
    case "lens":
      return [
        include("usage") && rx.lensUsage,
        include("type") && rx.lensType,
        include("coating") && (rx.lensCoating || []).join(", "),
        include("material") && rx.lensMaterial,
      ].filter(Boolean).join(" · ");
    case "investigations":
      return include("investigations") ? rx.investigations || "" : "";
    case "advice":
      return [
        include("bengali") && rx.adviceBn,
        include("english") && rx.advice,
      ].filter(Boolean).join("\n");
    case "followUp":
      return [
        include("bengali") && rx.followUpBn,
        include("english") && rx.followUp,
      ].filter(Boolean).join("\n");
    default:
      return "";
  }
}

export interface RxPadOverlayReadiness {
  printableFieldIds: string[];
  enabledFieldCount: number;
  selectedFieldIsPrintable: boolean;
}

export function getRxPadOverlayReadiness(
  rx: Prescription,
  overlay: RxPadOverlayConfig,
  selectedFieldId?: string,
): RxPadOverlayReadiness {
  const printableFieldIds = overlay.fields
    .filter((field) => field.enabled && getRxPadOverlayFieldValue(rx, field).trim().length > 0)
    .map((field) => field.id);

  return {
    printableFieldIds,
    enabledFieldCount: overlay.fields.filter((field) => field.enabled).length,
    selectedFieldIsPrintable: selectedFieldId ? printableFieldIds.includes(selectedFieldId) : false,
  };
}

export function hasRxPadOverlayContent(rx: Prescription, overlay: RxPadOverlayConfig): boolean {
  return overlay.fields.some((field) => field.enabled && getRxPadOverlayFieldValue(rx, field).trim().length > 0);
}

export type RxPadPrintPath = "web" | "native";

export interface BanglaPrintWarning {
  field: string;
  words: string[];
}

export function getBanglaPrintWarnings(rx: Prescription): BanglaPrintWarning[] {
  const medicationNames = (rx.drugs || []).map((drug) => drug.name);
  const candidates: { field: string; text: string }[] = [
    { field: "Advice", text: rx.adviceBn || "" },
    { field: "Follow-up", text: rx.followUpBn || "" },
    ...(rx.drugs || []).flatMap((drug, index) => {
      const label = drug.name.trim() || `Medication ${index + 1}`;
      if (drug.dosePhases?.length) {
        return drug.dosePhases.flatMap((phase, phaseIndex) => [
          { field: `${label} schedule ${phaseIndex + 1}`, text: phase.schedule || "" },
          { field: `${label} duration ${phaseIndex + 1}`, text: `${phase.durationValue || ""} ${phase.durationUnit || ""}` },
        ]);
      }
      return [
        { field: `${label} schedule`, text: drug.scheduleBn || "" },
        { field: `${label} duration`, text: drug.durationBn || "" },
      ];
    }),
  ];

  return candidates.flatMap(({ field, text }) => {
    const words = getUntranslatedEnglishWords(text, medicationNames);
    return words.length ? [{ field, words }] : [];
  });
}

export type BanglaPrintReviewDecision =
  | { action: "review"; printPath: RxPadPrintPath; warnings: BanglaPrintWarning[] }
  | { action: "print"; printPath: RxPadPrintPath };

export function getBanglaPrintReviewDecision(
  rx: Prescription,
  printPath: RxPadPrintPath,
  acknowledged: boolean,
): BanglaPrintReviewDecision {
  const warnings = getBanglaPrintWarnings(rx);
  return warnings.length && !acknowledged
    ? { action: "review", printPath, warnings }
    : { action: "print", printPath };
}

export type RxPadPrintDecision =
  | {
      action: "review";
      printPath: RxPadPrintPath;
      reviewRoute: `/rx-pad-settings?prescriptionId=${string}`;
    }
  | {
      action: "print";
      printPath: RxPadPrintPath;
    };

/**
 * Decide whether the Rx Pad print flow may continue to its platform-specific
 * print implementation. Keeping this before the web/native split prevents an
 * empty scanned pad from reaching either print dialog.
 */
export function getRxPadPrintDecision(
  rx: Prescription,
  overlay: RxPadOverlayConfig | undefined,
  printPath: RxPadPrintPath,
): RxPadPrintDecision {
  if (overlay?.imageUri && !hasRxPadOverlayContent(rx, overlay)) {
    return {
      action: "review",
      printPath,
      reviewRoute: `/rx-pad-settings?prescriptionId=${encodeURIComponent(rx.id)}`,
    };
  }

  return { action: "print", printPath };
}

function showSection(rx: Prescription, id: string): boolean {
  return !rx.hiddenSections?.includes(id);
}

function sectionTitle(rx: Prescription, id: string, fallback: string): string {
  return rx.sectionTitles?.[id] || fallback;
}

/* ── FULL PRINT template ── */
export function generateFullPrintHTML(rx: Prescription, doctor: DoctorProfile, qrSvg?: string): string {
  const lensOpts = [rx.lensUsage, rx.lensType, ...(rx.lensCoating || []), rx.lensMaterial].filter(Boolean);
  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
<title>Prescription — ${esc(rx.patientName)}</title>
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Roboto', 'Noto Sans Bengali', Arial, sans-serif; font-size: 11px; color: #0D1B2A; background: #fff; }
  .page { max-width: 180mm; margin: auto; }

  /* Doctor header */
  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 2.5px solid #1A6FAB; margin-bottom: 10px; }
  .doc-left { flex: 1; }
  .doc-name-bn { font-size: 15px; font-weight: 700; color: #0D1B2A; font-family: 'Noto Sans Bengali', 'Roboto', sans-serif; }
  .doc-name-en { font-size: 14px; font-weight: 700; color: #1A6FAB; margin-top: 1px; }
  .doc-sub { font-size: 10px; color: #0D1B2A; margin-top: 1px; }
  .doc-reg { font-size: 9px; color: #8A9BB0; margin-top: 3px; }
  .doc-right { text-align: right; }
  .doc-contact { font-size: 10px; color: #8A9BB0; margin-bottom: 1px; }

  /* Patient banner */
  .patient-banner { background: #EEF3FA; border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .patient-name { font-size: 14px; font-weight: 700; color: #0D1B2A; }
  .patient-meta { font-size: 10px; color: #8A9BB0; margin-top: 2px; }
  .patient-date { font-size: 10px; color: #8A9BB0; }

  /* Sections */
  .section { margin-bottom: 9px; }
  .sec-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #8A9BB0; border-left: 3px solid #1A6FAB; padding-left: 6px; margin-bottom: 5px; }
  .sec-body { background: #fff; border: 1px solid #DDE3EE; border-radius: 7px; padding: 8px 10px; }

  /* VA table */
  .va-table { width: 100%; border-collapse: collapse; }
  .va-table th, .va-table td { text-align: center; padding: 4px 6px; font-size: 11px; border-bottom: 1px solid #DDE3EE; }
  .va-table th { font-weight: 700; color: #1A6FAB; font-size: 10px; background: #EEF3FA; }
  .va-lbl { text-align: left; font-weight: 700; font-size: 10px; color: #8A9BB0; text-transform: uppercase; letter-spacing: 0.5px; width: 50px; }
  .va-val { font-weight: 600; color: #0D1B2A; }

  /* History badges */
  .badge { display: inline-block; background: #FFF3CD; border: 1px solid #FFD700; border-radius: 4px; padding: 2px 7px; font-size: 10px; font-weight: 600; color: #B8860B; margin: 2px; }
  .none { font-size: 11px; color: #8A9BB0; font-style: italic; }

  /* Drug table */
  .drug-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .drug-table th { background: #EEF3FA; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #1A6FAB; padding: 4px 6px; border-bottom: 1.5px solid #DDE3EE; text-align: left; }
  .drug-table td { padding: 5px 6px; border-bottom: 1px solid #DDE3EE; vertical-align: top; }
  .drug-name { font-weight: 700; color: #0D1B2A; }
  .drug-route { color: #1A6FAB; font-size: 10px; }
  .bn { font-family: 'Noto Sans Bengali', sans-serif; color: #0FA3B1; font-size: 11px; }

  /* Spectacle Rx table */
  .rx-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .rx-table td, .rx-table th { padding: 4px 5px; border-bottom: 1px solid #DDE3EE; text-align: center; }
  .rx-subtitle td { background: #EEF3FA; font-weight: 700; font-size: 10px; color: #1A6FAB; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 8px; text-align: left; }
  .rx-header td { font-size: 9px; font-weight: 700; color: #8A9BB0; text-transform: uppercase; letter-spacing: 0.5px; }
  .rx-eye { font-weight: 700; font-size: 10px; color: #1A6FAB; text-align: left; padding-left: 8px; }
  .rx-cell { font-weight: 600; color: #0D1B2A; }
  .empty { color: #8A9BB0; font-weight: 400; }

  /* IPD */
  .ipd-row { display: flex; justify-content: flex-end; align-items: center; gap: 12px; padding: 5px 8px; border-top: 1px solid #DDE3EE; }
  .ipd-lbl { font-size: 10px; font-weight: 700; color: #8A9BB0; text-transform: uppercase; }
  .ipd-val { font-size: 13px; font-weight: 700; color: #1A6FAB; }

  /* Lens options */
  .lens-chip { display: inline-block; background: #EEF3FA; border: 1px solid rgba(26,111,171,0.25); border-radius: 12px; padding: 3px 10px; margin: 2px; font-size: 11px; font-weight: 500; color: #1A6FAB; }

  /* Advice */
  .advice-en { font-size: 12px; color: #0D1B2A; line-height: 1.6; }
  .advice-bn { font-family: 'Noto Sans Bengali', sans-serif; font-size: 12px; color: #0FA3B1; line-height: 1.8; margin-top: 6px; padding-top: 6px; border-top: 1px solid #DDE3EE; }

  /* Follow-up */
  .followup { font-size: 13px; font-weight: 600; color: #0D1B2A; }
  .followup-bn { font-family: 'Noto Sans Bengali', sans-serif; font-size: 12px; color: #0FA3B1; margin-top: 2px; }

  /* Examination */
  .exam-table { width: 100%; font-size: 11px; }
  .exam-table td { padding: 3px 6px; vertical-align: top; }
  .exam-lbl { font-weight: 700; font-size: 10px; color: #8A9BB0; text-transform: uppercase; letter-spacing: 0.5px; width: 110px; }

  /* GAT */
  .gat-block { display: inline-block; text-align: center; margin-right: 24px; }
  .gat-eye { font-size: 9px; font-weight: 700; color: #8A9BB0; text-transform: uppercase; letter-spacing: 0.5px; }
  .gat-val { font-size: 20px; font-weight: 700; color: #0D1B2A; }
  .gat-unit { font-size: 10px; color: #8A9BB0; }

  /* Chamber footer */
  .chamber { margin-top: 12px; padding-top: 8px; border-top: 1.5px solid #EEF3FA; display: flex; align-items: flex-start; gap: 8px; }
  .chamber-icon { color: #1A6FAB; font-size: 13px; margin-top: 1px; }
  .chamber-name { font-size: 11px; font-weight: 600; color: #0D1B2A; }
  .chamber-addr { font-size: 10px; color: #8A9BB0; margin-top: 1px; }

  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">

  <!-- Doctor Header -->
  ${(doctor.nameEn || doctor.nameBn) ? `
  <div class="doc-header">
    <div class="doc-left">
      ${doctor.nameBn ? `<div class="doc-name-bn">${esc(doctor.nameBn)}</div>` : ""}
      ${doctor.nameEn ? `<div class="doc-name-en">${esc(doctor.nameEn)}</div>` : ""}
      ${doctor.qualificationEn ? `<div class="doc-sub">${esc(doctor.qualificationEn)}</div>` : ""}
      ${doctor.designationEn ? `<div class="doc-sub">${esc(doctor.designationEn)}</div>` : ""}
      ${doctor.institutionEn ? `<div class="doc-sub">${esc(doctor.institutionEn)}</div>` : ""}
      ${doctor.regNumber ? `<div class="doc-reg">BMDC Reg. No: ${esc(doctor.regNumber)}</div>` : ""}
    </div>
    <div class="doc-right">
      ${doctor.phone ? `<div class="doc-contact">📞 ${esc(doctor.phone)}</div>` : ""}
      ${doctor.email ? `<div class="doc-contact">✉ ${esc(doctor.email)}</div>` : ""}
    </div>
  </div>` : ""}

  <!-- Patient Banner -->
  <div class="patient-banner">
    <div>
      <div class="patient-name">${esc(rx.patientName)}${rx.patientAge ? ` &nbsp;·&nbsp; Age: ${esc(rx.patientAge)}` : ""}${rx.patientWeight ? ` &nbsp;·&nbsp; Weight: ${esc(rx.patientWeight)}` : ""}</div>
      <div class="patient-meta">
        Date: ${formatDate(rx.date)}
        ${rx.patientPhone ? ` &nbsp;·&nbsp; Contact: ${esc(rx.patientPhone)}` : ""}
        ${rx.patientPuid ? ` &nbsp;·&nbsp; PUID: ${esc(rx.patientPuid)}` : ""}
      </div>
    </div>
    ${qrSvg ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">${qrSvg}<div style="font-size:8px;color:#8A9BB0;font-weight:600;letter-spacing:0.8px">PATIENT ID</div></div>` : ""}
  </div>

  <!-- Chief Complaints -->
  ${showSection(rx, "chiefComplaints") && rx.chiefComplaints ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "chiefComplaints", "Chief Complaints"))}</div>
    <div class="sec-body"><p class="advice-en">${esc(rx.chiefComplaints)}</p></div>
  </div>` : ""}

  <!-- Past History -->
  ${showSection(rx, "pastHistory") ? `<div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "pastHistory", "History"))}</div>
    <div class="sec-body">
      <div class="small">Comorbidities</div>
      ${historyBadges(rx.pastHistory)}
      ${rx.pastHistoryNotes ? `<p class="advice-en" style="margin-top:8px"><strong>Past History:</strong> ${esc(rx.pastHistoryNotes)}</p>` : ""}
    </div>
  </div>` : ""}

  <!-- Visual Acuity -->
  ${showSection(rx, "visualAcuity") && (rx.rightEyeVA?.ua || rx.leftEyeVA?.ua || rx.rightEyeVA?.wa || rx.leftEyeVA?.wa || rx.rightEyeVA?.ph || rx.leftEyeVA?.ph || rx.rightEyeVA?.bcva || rx.leftEyeVA?.bcva) ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "visualAcuity", "Visual Acuity"))}</div>
    <div class="sec-body">${vaTable(rx.rightEyeVA, rx.leftEyeVA)}</div>
  </div>` : ""}

  <!-- Examination -->
  ${showSection(rx, "examination") && (rx.adnexa || rx.anteriorSegment || rx.posteriorSegment) ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "examination", "Other Examination Findings"))}</div>
    <div class="sec-body">
      <table class="exam-table"><tbody>
        ${rx.adnexa ? `<tr><td class="exam-lbl">${esc(rx.subsectionTitles?.["examination:adnexa"] || "Adnexa")}</td><td>${esc(rx.adnexa)}</td></tr>` : ""}
        ${rx.anteriorSegment ? `<tr><td class="exam-lbl">${esc(rx.subsectionTitles?.["examination:anteriorSegment"] || "Anterior Segment")}</td><td>${esc(rx.anteriorSegment)}</td></tr>` : ""}
        ${rx.posteriorSegment ? `<tr><td class="exam-lbl">${esc(rx.subsectionTitles?.["examination:posteriorSegment"] || "Posterior Segment")}</td><td>${esc(rx.posteriorSegment)}</td></tr>` : ""}
      </tbody></table>
    </div>
  </div>` : ""}
  ${showSection(rx, "gat") && (rx.gatRight || rx.gatLeft) ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "gat", "IOP"))}</div>
    <div class="sec-body"><table class="exam-table"><tbody><tr><td class="exam-lbl">Pressure</td><td>RE: ${esc(rx.gatRight) || "—"} &nbsp; LE: ${esc(rx.gatLeft) || "—"} mmHg</td></tr></tbody></table></div>
  </div>` : ""}

  <!-- Diagnosis -->
  ${showSection(rx, "diagnosis") && rx.diagnosis ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "diagnosis", "Diagnosis"))}</div>
    <div class="sec-body"><p class="advice-en">${esc(rx.diagnosis)}</p></div>
  </div>` : ""}

  <!-- Drugs -->
  ${showSection(rx, "drugs") && rx.drugs?.filter((d) => d.name).length ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "drugs", "Treatment (Rx)"))}</div>
    <div class="sec-body">${drugsSection(rx.drugs)}</div>
  </div>` : ""}

  <!-- Spectacle Correction -->
  ${showSection(rx, "spectacle") && (rx.rightEyeDistance?.dsp || rx.leftEyeDistance?.dsp || rx.rightEyeDistance?.dcyl || rx.leftEyeDistance?.dcyl || rx.rightEyeDistance?.axis || rx.leftEyeDistance?.axis || rx.rightEyeDistance?.va || rx.leftEyeDistance?.va || rx.rightEyeNear?.dsp || rx.leftEyeNear?.dsp || rx.rightEyeNear?.dcyl || rx.leftEyeNear?.dcyl || rx.rightEyeNear?.axis || rx.leftEyeNear?.axis || rx.rightEyeNear?.va || rx.leftEyeNear?.va) ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "spectacle", "Spectacle Correction"))}</div>
    <div class="sec-body">
      <table class="rx-table"><tbody>
        ${rxBlock("Distance (D)", rx.rightEyeDistance, rx.leftEyeDistance)}
        ${rxBlock("Near (N)", rx.rightEyeNear, rx.leftEyeNear)}
      </tbody></table>
      ${(rx.ipd || rx.nearIPD) ? `<div class="ipd-row">
        ${rx.ipd ? `<span class="ipd-lbl">Distance IPD</span><span class="ipd-val">${esc(rx.ipd)} mm</span>` : ""}
        ${rx.nearIPD ? `<span class="ipd-lbl">Near IPD</span><span class="ipd-val">${esc(rx.nearIPD)} mm</span>` : ""}
      </div>` : ""}
    </div>
  </div>` : ""}

  <!-- Lens Options -->
  ${showSection(rx, "lens") && lensOpts.length ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "lens", "Lens Options"))}</div>
    <div class="sec-body">${lensOpts.map((o) => `<span class="lens-chip">${esc(o)}</span>`).join("")}</div>
  </div>` : ""}

  <!-- Investigations -->
  ${showSection(rx, "investigations") && rx.investigations ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "investigations", "Investigations"))}</div>
    <div class="sec-body"><p class="advice-en">${esc(rx.investigations)}</p></div>
  </div>` : ""}

  <!-- Advice -->
  ${showSection(rx, "advice") && (rx.advice || rx.adviceBn) ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "advice", "Advice/উপদেশ"))}</div>
    <div class="sec-body">
       ${rx.advice ? `<div class="advice-en">${esc(rx.advice)}</div>` : ""}
      ${rx.adviceBn ? `<div class="advice-bn">${esc(rx.adviceBn)}</div>` : ""}
    </div>
  </div>` : ""}

  <!-- Follow-up -->
  ${showSection(rx, "followUp") && (rx.followUp || rx.followUpBn) ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "followUp", "Follow-Up Time"))}</div>
    <div class="sec-body">
       ${rx.followUp ? `<div class="followup">📅 ${esc(rx.followUp)}</div>` : ""}
      ${rx.followUpBn && rx.followUpBn !== rx.followUp ? `<div class="followup-bn">${esc(rx.followUpBn)}</div>` : ""}
    </div>
  </div>` : ""}

  ${customSectionsHTML(rx)}

  <!-- Chamber footer -->
  ${(doctor.chamberName || doctor.chamberAddress) ? `
  <div class="chamber">
    <div>📍</div>
    <div>
      ${doctor.chamberName ? `<div class="chamber-name">${esc(doctor.chamberName)}</div>` : ""}
      ${doctor.chamberAddress ? `<div class="chamber-addr">${esc(doctor.chamberAddress)}</div>` : ""}
      ${doctor.chamberPhone ? `<div class="chamber-addr">${esc(doctor.chamberPhone)}</div>` : ""}
    </div>
  </div>` : ""}

</div>
</body>
</html>`;
}

/* ── RX PAD (data-only) template ── */
export function generateRxPadHTML(rx: Prescription): string {
  const lensOpts = [rx.lensUsage, rx.lensType, ...(rx.lensCoating || []), rx.lensMaterial].filter(Boolean);
  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
<title>Rx Data — ${esc(rx.patientName)}</title>
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Roboto', 'Noto Sans Bengali', Arial, sans-serif; font-size: 11px; color: #0D1B2A; background: transparent; }
  .page { max-width: 180mm; margin: auto; }
  .field { margin-bottom: 6px; line-height: 1.5; }
  .val { font-weight: 600; font-size: 12px; }
  .small { font-size: 10px; color: #444; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 6px; }
  td, th { padding: 3px 5px; font-size: 11px; }
  .bn { font-family: 'Noto Sans Bengali', sans-serif; color: #0D1B2A; }
  hr { border: none; border-top: 1px solid #ccc; margin: 6px 0; }
</style>
</head>
<body>
<div class="page">
  <div class="field">
    <span class="val">${esc(rx.patientName)}</span>
    ${rx.patientAge ? `<span class="small">&nbsp;Age: ${esc(rx.patientAge)}</span>` : ""}
    ${rx.patientWeight ? `<span class="small">&nbsp;Weight: ${esc(rx.patientWeight)}</span>` : ""}
    ${rx.patientPhone ? `<span class="small">&nbsp;Contact: ${esc(rx.patientPhone)}</span>` : ""}
    ${rx.patientPuid ? `<span class="small">&nbsp;PUID: ${esc(rx.patientPuid)}</span>` : ""}
    <span class="small">&nbsp;&nbsp;${formatDate(rx.date)}</span>
  </div>

  ${showSection(rx, "chiefComplaints") && rx.chiefComplaints ? `<div class="field"><span class="val">${esc(rx.chiefComplaints)}</span></div>` : ""}

  ${(() => {
    const items = [
      rx.pastHistory?.dm && "DM", rx.pastHistory?.htn && "HTN",
      rx.pastHistory?.ihd && "IHD", rx.pastHistory?.ckd && "CKD",
      rx.pastHistory?.ba && "BA", rx.pastHistory?.thyDs && "Thyroid Ds",
      rx.pastHistory?.uromax && "Uromax", rx.pastHistory?.others,
    ].filter(Boolean) as string[];
    return items.length ? `<div class="field small">${items.join(" / ")}</div>` : "";
  })()}
  ${rx.pastHistoryNotes ? `<div class="field small">Past History: ${esc(rx.pastHistoryNotes)}</div>` : ""}

  ${showSection(rx, "visualAcuity") ? vaTable(rx.rightEyeVA, rx.leftEyeVA) : ""}

  ${showSection(rx, "examination") && rx.adnexa ? `<div class="field"><span class="val">${esc(rx.adnexa)}</span></div>` : ""}
  ${showSection(rx, "examination") && rx.anteriorSegment ? `<div class="field"><span class="val">${esc(rx.anteriorSegment)}</span></div>` : ""}
  ${showSection(rx, "examination") && rx.posteriorSegment ? `<div class="field"><span class="val">${esc(rx.posteriorSegment)}</span></div>` : ""}

  ${showSection(rx, "gat") && (rx.gatRight || rx.gatLeft) ? `<div class="field">RE: <span class="val">${esc(rx.gatRight) || "—"}</span> &nbsp; LE: <span class="val">${esc(rx.gatLeft) || "—"}</span> <span class="small">mmHg</span></div>` : ""}

  ${showSection(rx, "diagnosis") && rx.diagnosis ? `<div class="field"><span class="small">Diagnosis:</span> <span class="val">${esc(rx.diagnosis)}</span></div>` : ""}

  ${showSection(rx, "drugs") && rx.drugs?.filter((d) => d.name).length ? drugsSection(rx.drugs) : ""}

  ${showSection(rx, "spectacle") && (rx.rightEyeDistance?.dsp || rx.leftEyeDistance?.dsp || rx.rightEyeDistance?.dcyl || rx.leftEyeDistance?.dcyl || rx.rightEyeDistance?.axis || rx.leftEyeDistance?.axis || rx.rightEyeDistance?.va || rx.leftEyeDistance?.va || rx.rightEyeNear?.dsp || rx.leftEyeNear?.dsp || rx.rightEyeNear?.dcyl || rx.leftEyeNear?.dcyl || rx.rightEyeNear?.axis || rx.leftEyeNear?.axis || rx.rightEyeNear?.va || rx.leftEyeNear?.va) ? `
  <table><tbody>
    ${rxBlock("Distance (D)", rx.rightEyeDistance, rx.leftEyeDistance)}
    ${rxBlock("Near (N)", rx.rightEyeNear, rx.leftEyeNear)}
  </tbody></table>
   ${(rx.ipd || rx.nearIPD) ? `<div class="field small">${rx.ipd ? `IPD D: ${esc(rx.ipd)} mm` : ""}${rx.nearIPD ? `${rx.ipd ? " / " : ""}N: ${esc(rx.nearIPD)} mm` : ""}</div>` : ""}` : ""}

  ${showSection(rx, "lens") && lensOpts.length ? `<div class="field small">${lensOpts.join(" · ")}</div>` : ""}

  ${showSection(rx, "investigations") && rx.investigations ? `<div class="field"><span class="small">Investigations:</span> <span class="val">${esc(rx.investigations)}</span></div>` : ""}

  ${showSection(rx, "advice") && (rx.advice || rx.adviceBn) ? `<hr/><div class="field">${rx.advice ? `<span class="val">${esc(rx.advice)}</span>` : ""}${rx.adviceBn ? `<br/><span class="bn val">${esc(rx.adviceBn)}</span>` : ""}</div>` : ""}

  ${showSection(rx, "followUp") && (rx.followUp || rx.followUpBn) ? `<div class="field">${rx.followUp ? `<span class="val">${esc(rx.followUp)}</span>` : ""}${rx.followUpBn ? `<br/><span class="bn val">${esc(rx.followUpBn)}</span>` : ""}</div>` : ""}

  ${customSectionsHTML(rx)}
</div>
</body>
</html>`;
}

export function generateRxPadOverlayHTML(rx: Prescription, overlay: RxPadOverlayConfig): string {
  const width = normalizeRxPadPaperSize(overlay.paperWidthMm, 210);
  const height = normalizeRxPadPaperSize(overlay.paperHeightMm, 297);
  const imageUri = overlay.imageUri || "";
  const imageFit = normalizeRxPadImageFit(overlay.imageFit);
  const imageBackgroundSize = imageFit === "contain" ? "contain" : imageFit === "crop" ? "cover" : "100% 100%";
  const imageBackgroundPosition = getRxPadImageBackgroundPosition(overlay.imagePositionX, overlay.imagePositionY);
  const fields = overlay.fields
    .filter((field) => field.enabled)
    .map((field) => {
      const constrainedField = constrainRxPadOverlayField(field, width, height);
      const categoryLabel = field.showCategoryLabel ? `${esc(field.label)}: ` : "";
      if (field.contentFields?.length) {
        const childFields = field.contentFields
          .filter((contentField) => contentField.enabled && (field.printMode !== "selected" || field.contentSelection?.includes(contentField.id)))
          .map((contentField) => {
            const constrainedContentField = constrainRxPadOverlayContentField(contentField, width, height);
            const value = contentFieldValue(rx, field, contentField);
            if (!value.trim()) return "";
            const safeValue = esc(value).replace(/\n/g, "<br/>");
            return `<div class="overlay-content-field" style="left:${constrainedContentField.x}mm;top:${constrainedContentField.y}mm;width:${constrainedContentField.width}mm;height:${constrainedContentField.height}mm;font-size:${constrainedContentField.fontSize}pt">${safeValue}</div>`;
          })
          .join("");
        const labelMarkup = field.showCategoryLabel
          ? `<div class="overlay-category-label" style="left:${constrainedField.x}mm;top:${constrainedField.y}mm;width:${constrainedField.width}mm;font-size:${constrainedField.fontSize}pt">${categoryLabel.slice(0, -2)}</div>`
          : "";
        return `${labelMarkup}${childFields}`;
      }
      const value = getRxPadOverlayFieldValue(rx, field);
      if (!value.trim()) return "";
      const safeValue = esc(value).replace(/\n/g, "<br/>");
      return `<div class="overlay-field" style="left:${constrainedField.x}mm;top:${constrainedField.y}mm;width:${constrainedField.width}mm;height:${constrainedField.height}mm;font-size:${constrainedField.fontSize}pt">${categoryLabel}${safeValue}</div>`;
    })
    .join("");
  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Rx Pad — ${esc(rx.patientName)}</title>
<style>
  @page { size: ${width}mm ${height}mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${width}mm; height: ${height}mm; margin: 0; padding: 0; overflow: hidden; }
  body { font-family: 'Roboto', 'Noto Sans Bengali', Arial, sans-serif; background: transparent; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
   .page { position: relative; width: ${width}mm; height: ${height}mm; overflow: hidden; background-color: #fff; background-image: url("${imageUri.replace(/"/g, "&quot;")}"); background-position: ${imageBackgroundPosition}; background-size: ${imageBackgroundSize}; background-repeat: no-repeat; }
  .overlay-field, .overlay-content-field, .overlay-category-label { position: absolute; overflow: hidden; white-space: normal; word-break: break-word; line-height: 1.22; font-weight: 500; color: #111; }
  .overlay-category-label { height: 5mm; font-weight: 700; }
</style>
</head>
<body><div class="page">${fields}</div></body>
</html>`;
}
