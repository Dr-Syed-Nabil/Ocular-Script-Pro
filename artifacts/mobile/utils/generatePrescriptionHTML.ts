import { DoctorProfile, Drug, EyeSpectacleRx, EyeVA, PastHistory, Prescription } from "@/types";

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
  const hasDist = re.dsp || re.dcyl || re.va || le.dsp || le.dcyl || le.va;
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
  const rows = active.map((d) => `
    <tr>
      <td class="drug-name">${esc(d.name)}</td>
      <td class="drug-route">${esc(d.route)}</td>
      <td>${esc(d.schedule)}${d.scheduleBn ? `<br/><span class="bn">${esc(d.scheduleBn)}</span>` : ""}</td>
      <td>${esc(d.duration)}${d.durationBn ? `<br/><span class="bn">${esc(d.durationBn)}</span>` : ""}</td>
      <td>${esc(d.notes)}</td>
    </tr>`).join("");
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
        <div class="sec-body"><p class="advice-en">${esc(section.content)}</p></div>
      </div>`)
    .join("");
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
      <div class="patient-name">${esc(rx.patientName)}${rx.patientAge ? ` &nbsp;·&nbsp; Age: ${esc(rx.patientAge)}` : ""}</div>
      <div class="patient-meta">Date: ${formatDate(rx.date)}</div>
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
    <div class="sec-title">${esc(sectionTitle(rx, "pastHistory", "Past History"))}</div>
    <div class="sec-body">${historyBadges(rx.pastHistory)}</div>
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
    <div class="sec-title">${esc(sectionTitle(rx, "examination", "Examination Findings"))}</div>
    <div class="sec-body">
      <table class="exam-table"><tbody>
        ${rx.adnexa ? `<tr><td class="exam-lbl">Adnexa</td><td>${esc(rx.adnexa)}</td></tr>` : ""}
        ${rx.anteriorSegment ? `<tr><td class="exam-lbl">Anterior Segment</td><td>${esc(rx.anteriorSegment)}</td></tr>` : ""}
        ${rx.posteriorSegment ? `<tr><td class="exam-lbl">Posterior Segment</td><td>${esc(rx.posteriorSegment)}</td></tr>` : ""}
      </tbody></table>
    </div>
  </div>` : ""}

  <!-- GAT -->
  ${showSection(rx, "gat") && (rx.gatRight || rx.gatLeft) ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "gat", "GAT / Intraocular Pressure"))}</div>
    <div class="sec-body">
      ${rx.gatRight ? `<div class="gat-block"><div class="gat-eye">RE</div><div class="gat-val">${esc(rx.gatRight)} <span class="gat-unit">mmHg</span></div></div>` : ""}
      ${rx.gatLeft ? `<div class="gat-block"><div class="gat-eye">LE</div><div class="gat-val">${esc(rx.gatLeft)} <span class="gat-unit">mmHg</span></div></div>` : ""}
    </div>
  </div>` : ""}

  <!-- Drugs -->
  ${showSection(rx, "drugs") && rx.drugs?.filter((d) => d.name).length ? `
  <div class="section">
    <div class="sec-title">${esc(sectionTitle(rx, "drugs", "Rx — Drugs &amp; Medications"))}</div>
    <div class="sec-body">${drugsSection(rx.drugs)}</div>
  </div>` : ""}

  <!-- Spectacle Correction -->
  ${showSection(rx, "spectacle") && (rx.rightEyeDistance?.dsp || rx.leftEyeDistance?.dsp || rx.rightEyeDistance?.va || rx.leftEyeDistance?.va || rx.rightEyeNear?.dsp || rx.leftEyeNear?.dsp || rx.rightEyeNear?.va || rx.leftEyeNear?.va) ? `
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

  <!-- Advice -->
  ${showSection(rx, "advice") && rx.advice ? `
  <div class="section">
    <div class="sec-title">উপদেশ / Advice</div>
    <div class="sec-body">
      <div class="advice-en">${esc(rx.advice)}</div>
      ${rx.adviceBn ? `<div class="advice-bn">${esc(rx.adviceBn)}</div>` : ""}
    </div>
  </div>` : ""}

  <!-- Follow-up -->
  ${showSection(rx, "followUp") && rx.followUp ? `
  <div class="section">
    <div class="sec-title">পরবর্তী ভিজিট / Follow-up</div>
    <div class="sec-body">
      <div class="followup">📅 ${esc(rx.followUp)}</div>
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

  ${showSection(rx, "visualAcuity") ? vaTable(rx.rightEyeVA, rx.leftEyeVA) : ""}

  ${showSection(rx, "examination") && rx.adnexa ? `<div class="field"><span class="val">${esc(rx.adnexa)}</span></div>` : ""}
  ${showSection(rx, "examination") && rx.anteriorSegment ? `<div class="field"><span class="val">${esc(rx.anteriorSegment)}</span></div>` : ""}
  ${showSection(rx, "examination") && rx.posteriorSegment ? `<div class="field"><span class="val">${esc(rx.posteriorSegment)}</span></div>` : ""}

  ${showSection(rx, "gat") && (rx.gatRight || rx.gatLeft) ? `<div class="field">RE: <span class="val">${esc(rx.gatRight) || "—"}</span> &nbsp; LE: <span class="val">${esc(rx.gatLeft) || "—"}</span> <span class="small">mmHg</span></div>` : ""}

  ${showSection(rx, "drugs") && rx.drugs?.filter((d) => d.name).length ? drugsSection(rx.drugs) : ""}

  ${showSection(rx, "spectacle") && (rx.rightEyeDistance?.dsp || rx.leftEyeDistance?.dsp || rx.rightEyeDistance?.va || rx.leftEyeDistance?.va || rx.rightEyeNear?.dsp || rx.leftEyeNear?.dsp || rx.rightEyeNear?.va || rx.leftEyeNear?.va) ? `
  <table><tbody>
    ${rxBlock("Distance (D)", rx.rightEyeDistance, rx.leftEyeDistance)}
    ${rxBlock("Near (N)", rx.rightEyeNear, rx.leftEyeNear)}
  </tbody></table>
  ${rx.ipd ? `<div class="field small">IPD D: ${esc(rx.ipd)} mm${rx.nearIPD ? ` / N: ${esc(rx.nearIPD)} mm` : ""}</div>` : ""}` : ""}

  ${showSection(rx, "lens") && lensOpts.length ? `<div class="field small">${lensOpts.join(" · ")}</div>` : ""}

  ${showSection(rx, "advice") && rx.advice ? `<hr/><div class="field">${rx.adviceBn ? `<span class="bn val">${esc(rx.adviceBn)}</span>` : `<span class="val">${esc(rx.advice)}</span>`}</div>` : ""}

  ${showSection(rx, "followUp") && rx.followUp ? `<div class="field">${rx.followUpBn && rx.followUpBn !== rx.followUp ? `<span class="bn val">${esc(rx.followUpBn)}</span>` : `<span class="val">${esc(rx.followUp)}</span>`}</div>` : ""}

  ${customSectionsHTML(rx)}
</div>
</body>
</html>`;
}
