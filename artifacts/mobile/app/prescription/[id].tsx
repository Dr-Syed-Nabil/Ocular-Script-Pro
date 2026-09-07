import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { Drug, EyeSpectacleRx, EyeVA, PastHistory } from "@/types";
import { generateFullPrintHTML, generateRxPadHTML, generateRxPadOverlayHTML, hasRxPadOverlayContent } from "@/utils/generatePrescriptionHTML";
import { QRDisplay } from "@/components/QRDisplay";
import QRCodeLib from "qrcode";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: colors.primary, marginRight: 7 }} />
        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.9 }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
      {children}
    </View>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 }}>{value}</Text>
    </View>
  );
}

function VASection({ reVA, leVA, title = "Visual Acuity" }: { reVA: EyeVA; leVA: EyeVA; title?: string }) {
  const colors = useColors();
  const hasData = reVA.ua || reVA.wa || reVA.ph || reVA.bcva || leVA.ua || leVA.wa || leVA.ph || leVA.bcva;
  if (!hasData) return null;
  const fields: { key: keyof EyeVA; label: string }[] = [
    { key: "ua", label: "UA" }, { key: "wa", label: "WA" },
    { key: "ph", label: "PH" }, { key: "bcva", label: "BCVA" },
  ];
  return (
    <SectionBlock title={title}>
      <InfoCard>
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          <View style={{ width: 52 }} />
          <Text style={{ flex: 1, fontSize: 11, fontFamily: "Inter_700Bold", color: colors.primary, textAlign: "center" }}>RE (OD)</Text>
          <Text style={{ flex: 1, fontSize: 11, fontFamily: "Inter_700Bold", color: colors.primary, textAlign: "center" }}>LE (OS)</Text>
        </View>
        {fields.map(({ key, label }) => {
          const re = reVA[key]; const le = leVA[key];
          if (!re && !le) return null;
          return (
            <View key={key} style={{ flexDirection: "row", paddingVertical: 4, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ width: 52, fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground }}>{label}</Text>
              <Text style={{ flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center" }}>{re || "—"}</Text>
              <Text style={{ flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center" }}>{le || "—"}</Text>
            </View>
          );
        })}
      </InfoCard>
    </SectionBlock>
  );
}

function RxTable({ reD, leD, reN, leN, ipd }: {
  reD: EyeSpectacleRx; leD: EyeSpectacleRx;
  reN: EyeSpectacleRx; leN: EyeSpectacleRx;
  ipd: string;
}) {
  const colors = useColors();
  const hasDist = reD.dsp || reD.dcyl || reD.va || leD.dsp || leD.dcyl || leD.va;
  const hasNear = reN.dsp || reN.dcyl || reN.va || leN.dsp || leN.dcyl || leN.va;
  if (!hasDist && !hasNear && !ipd) return null;

  const RxRow = ({ eye, rx, label }: { eye: string; rx: EyeSpectacleRx; label: string }) => {
    const vals = [rx.dsp, rx.dcyl, rx.axis ? `${rx.axis}°` : "", rx.va];
    if (!vals.some(Boolean)) return null;
    return (
      <View style={{ flexDirection: "row", paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "center" }}>
        <View style={{ width: 36 }}>
          <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: colors.primary, textAlign: "center" }}>{eye}</Text>
        </View>
        {[rx.dsp || "—", rx.dcyl || "—", rx.axis ? `${rx.axis}°` : "—", rx.va || "—"].map((v, i) => (
          <Text key={i} style={{ flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center" }}>{v}</Text>
        ))}
      </View>
    );
  };

  const TableBlock = ({ title, re, le }: { title: string; re: EyeSpectacleRx; le: EyeSpectacleRx }) => {
    if (!re.dsp && !re.dcyl && !re.axis && !re.va && !le.dsp && !le.dcyl && !le.axis && !le.va) return null;
    return (
      <>
        <View style={{ backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</Text>
        </View>
        <View style={{ flexDirection: "row", paddingHorizontal: 0, paddingVertical: 4 }}>
          <View style={{ width: 36 }} />
          {["SPH", "CYL", "AXIS", "VA"].map((h) => (
            <Text key={h} style={{ flex: 1, fontSize: 9, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textTransform: "uppercase", textAlign: "center" }}>{h}</Text>
          ))}
        </View>
        <RxRow eye="RE" rx={re} label="RE" />
        <RxRow eye="LE" rx={le} label="LE" />
      </>
    );
  };

  return (
    <SectionBlock title="Spectacle Correction">
      <View style={{ backgroundColor: colors.card, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
        <TableBlock title="Distance (D)" re={reD} le={leD} />
        {hasDist && hasNear && <View style={{ height: 2, backgroundColor: colors.border }} />}
        <TableBlock title="Near (N)" re={reN} le={leN} />
        {ipd ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>IPD</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: colors.primary }}>{ipd} mm</Text>
          </View>
        ) : null}
      </View>
    </SectionBlock>
  );
}

function HistoryBadges({ h }: { h: PastHistory }) {
  const colors = useColors();
  const items = [
    h.dm && "DM", h.htn && "HTN", h.ihd && "IHD", h.ckd && "CKD",
    h.ba && "BA", h.thyDs && "Thyroid Ds", h.uromax && "Uromax",
  ].filter(Boolean) as string[];
  if (items.length === 0 && !h.others) return (
    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, fontStyle: "italic" }}>None recorded</Text>
  );
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {items.map((it) => (
        <View key={it} style={{ backgroundColor: "#FFF3CD", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#FFD700" }}>
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#B8860B" }}>{it}</Text>
        </View>
      ))}
      {h.others ? (
        <View style={{ backgroundColor: colors.secondary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.foreground }}>{h.others}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { prescriptions, patients, deletePrescription, doctor, prescriptionConfig } = useData();
  const s = styles(colors);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printing, setPrinting] = useState(false);

  const rx = prescriptions.find((r) => r.id === id);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const patient = patients.find((p) => p.id === rx?.patientId);
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const handleDuplicate = () => {
    if (!rx) return;
    router.push(`/new-rx?duplicateFrom=${rx.id}`);
  };

  const handleEdit = () => {
    if (!rx) return;
    router.push(`/new-rx?editId=${rx.id}`);
  };

  const handlePrint = async (mode: "full" | "pad") => {
    if (!rx) return;
    const activeRxPadOverlay = prescriptionConfig.rxPadOverlays?.find((overlay) => overlay.id === prescriptionConfig.activeRxPadOverlayId)
      || prescriptionConfig.rxPadOverlay;
    const hasOverlayImage = mode === "pad" && Boolean(activeRxPadOverlay?.imageUri);
    if (hasOverlayImage && activeRxPadOverlay && !hasRxPadOverlayContent(rx, activeRxPadOverlay)) {
      setShowPrintModal(false);
      Alert.alert(
        "Rx Pad is empty",
        "No enabled Rx Pad field has printable content. Enable a field or enter prescription details, then try again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Review Rx Pad", onPress: () => router.push(`/rx-pad-settings?prescriptionId=${encodeURIComponent(rx.id)}`) },
        ],
      );
      return;
    }

    setShowPrintModal(false);
    setPrinting(true);
    try {
      let qrSvg: string | undefined;
        const qrValue = rx.patientPuid || patient?.puid;
        if (mode === "full" && qrValue) {
        try {
          qrSvg = await QRCodeLib.toString(qrValue, { type: "svg", width: 60, margin: 1, color: { dark: "#0D1B2A", light: "#ffffff" } });
        } catch { /* skip QR if fails */ }
      }
      const html = mode === "full"
        ? generateFullPrintHTML(rx, doctor, qrSvg)
        : activeRxPadOverlay?.imageUri
          ? generateRxPadOverlayHTML(rx, activeRxPadOverlay)
          : generateRxPadHTML(rx);
      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
          win.onload = () => win.print();
          setTimeout(() => win.print(), 350);
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Prescription — ${rx.patientName}` });
        } else {
          await Print.printAsync({ html });
        }
      }
    } catch (e) {
      Alert.alert("Print Error", "Could not generate PDF.");
    } finally {
      setPrinting(false);
    }
  };

  if (!rx) {
    return (
      <View style={[s.container, { paddingTop: topPad }]}>
        <TouchableOpacity style={s.iconBtn} onPress={goBack}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.centered}>
          <Text style={s.notFoundText}>Prescription not found.</Text>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert("Delete Prescription", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deletePrescription(rx.id);
          goBack();
        },
      },
    ]);
  };

  const lensOpts = [rx.lensUsage, rx.lensType, ...(rx.lensCoating || []), rx.lensMaterial].filter(Boolean);
  const sectionTitle = (id: string, fallback: string) =>
    rx.sectionTitles?.[id] || prescriptionConfig.sections.find((section) => section.id === id)?.title || fallback;
  const sectionEnabled = (id: string) =>
    id === "patient" || (rx.hiddenSections
      ? !rx.hiddenSections.includes(id)
      : prescriptionConfig.sections.find((section) => section.id === id)?.enabled !== false);
  const activeRxPadOverlay = prescriptionConfig.rxPadOverlays?.find((overlay) => overlay.id === prescriptionConfig.activeRxPadOverlayId)
    || prescriptionConfig.rxPadOverlay;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      {/* Print mode modal */}
      <Modal visible={showPrintModal} transparent animationType="fade" onRequestClose={() => setShowPrintModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowPrintModal(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} />
        </TouchableWithoutFeedback>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 }}>Print Prescription</Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 20, lineHeight: 19 }}>Choose a print mode depending on your paper source.</Text>

          <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 16, marginBottom: 12 }} onPress={() => handlePrint("full")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Feather name="file-text" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" }}>Blank Paper</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 }}>Full prescription with doctor header, template colours &amp; all sections. Feed blank A4 paper.</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: colors.border }} onPress={() => handlePrint("pad")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Feather name="layout" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground }}>Rx Pad Overlay</Text>
               <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                 {activeRxPadOverlay?.name || "Data-only overlay"} — fills your selected pre-printed Rx pad.
               </Text>
              </View>
            </View>
          </TouchableOpacity>
           <TouchableOpacity style={{ alignItems: "center", padding: 10, marginTop: 4 }} onPress={() => { setShowPrintModal(false); router.push(`/rx-pad-settings?prescriptionId=${encodeURIComponent(rx.id)}`); }}>
             <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary }}>
               Customize Rx Pad Overlay
             </Text>
           </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: 14, alignItems: "center", padding: 10 }} onPress={() => setShowPrintModal(false)}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <View style={s.navBar}>
        <TouchableOpacity style={s.iconBtn} onPress={goBack}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.navTitle} numberOfLines={1}>{rx.patientName}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={s.iconBtn} onPress={handleDuplicate}>
            <Feather name="copy" size={17} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={handleEdit}>
            <Feather name="edit-2" size={17} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn, printing && { opacity: 0.5 }]} onPress={() => setShowPrintModal(true)} disabled={printing}>
            <Feather name={printing ? "loader" : "printer"} size={17} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={handleDelete}>
            <Feather name="trash-2" size={17} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor header */}
        {(doctor.nameEn || doctor.nameBn) && (
          <View style={s.doctorHeader}>
            <View style={{ flex: 1 }}>
              {doctor.nameBn ? <Text style={s.doctorNameBn}>{doctor.nameBn}</Text> : null}
              {doctor.nameEn ? <Text style={s.doctorNameEn}>{doctor.nameEn}</Text> : null}
              {doctor.qualificationEn ? <Text style={s.doctorSub}>{doctor.qualificationEn}</Text> : null}
              {doctor.designationEn ? <Text style={s.doctorSub}>{doctor.designationEn}</Text> : null}
              {doctor.institutionEn ? <Text style={s.doctorSub}>{doctor.institutionEn}</Text> : null}
              {doctor.regNumber ? <Text style={s.doctorReg}>Reg. No: {doctor.regNumber}</Text> : null}
            </View>
            {(doctor.phone || doctor.email) && (
              <View style={{ alignItems: "flex-end" }}>
                {doctor.phone ? <Text style={s.doctorContact}>{doctor.phone}</Text> : null}
                {doctor.email ? <Text style={s.doctorContact}>{doctor.email}</Text> : null}
              </View>
            )}
          </View>
        )}

        {/* Patient meta */}
        <View style={s.metaCard}>
          <View style={s.metaAvatar}>
            <Text style={s.metaAvatarText}>{rx.patientName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.metaName}>{rx.patientName}</Text>
            <Text style={s.metaSub}>
              {[
                rx.patientAge ? `Age: ${rx.patientAge}` : "",
                rx.patientWeight ? `Weight: ${rx.patientWeight}` : "",
                formatDate(rx.date),
              ].filter(Boolean).join("  ·  ")}
            </Text>
            {rx.patientPhone ? <Text style={s.metaSub}>Contact: {rx.patientPhone}</Text> : null}
            {rx.patientPuid ? <Text style={s.metaSub}>PUID: {rx.patientPuid}</Text> : null}
          </View>
        </View>

        {/* History */}
        {(sectionEnabled("chiefComplaints") || sectionEnabled("pastHistory"))
          && (rx.chiefComplaints || rx.pastHistoryNotes || rx.pastHistory) ? (
          <SectionBlock title={sectionTitle("pastHistory", "History")}>
            {sectionEnabled("chiefComplaints") && rx.chiefComplaints ? (
              <InfoCard>
                <LabelValue label={sectionTitle("chiefComplaints", "Chief Complaints")} value={rx.chiefComplaints} />
              </InfoCard>
            ) : null}
            {sectionEnabled("pastHistory") ? (
              <InfoCard>
                <Text style={s.gatLabel}>COMORBIDITIES</Text>
                <HistoryBadges h={rx.pastHistory} />
                <LabelValue label="Past History" value={rx.pastHistoryNotes || ""} />
              </InfoCard>
            ) : null}
          </SectionBlock>
        ) : null}

        {/* VA */}
        {sectionEnabled("visualAcuity") ? <VASection reVA={rx.rightEyeVA} leVA={rx.leftEyeVA} title={sectionTitle("visualAcuity", "Visual Acuity")} /> : null}

        {/* Examination */}
        {(sectionEnabled("examination") || sectionEnabled("gat"))
          && (rx.adnexa || rx.anteriorSegment || rx.posteriorSegment || rx.gatRight || rx.gatLeft) && (
          <SectionBlock title={sectionTitle("examination", "Other Examination Findings")}>
            <InfoCard>
              <LabelValue label={rx.subsectionTitles?.["examination:adnexa"] || "Adnexa"} value={rx.adnexa} />
              <LabelValue label={rx.subsectionTitles?.["examination:anteriorSegment"] || "Anterior Segment"} value={rx.anteriorSegment} />
              <LabelValue label={rx.subsectionTitles?.["examination:posteriorSegment"] || "Posterior Segment"} value={rx.posteriorSegment} />
              {sectionEnabled("gat") && (rx.gatRight || rx.gatLeft) ? (
                <View style={{ flexDirection: "row", gap: 20, marginTop: 8 }}>
                {rx.gatRight ? (
                  <View style={s.gatBlock}>
                    <Text style={s.gatLabel}>RE</Text>
                    <Text style={s.gatValue}>{rx.gatRight} <Text style={s.gatUnit}>mmHg</Text></Text>
                  </View>
                ) : null}
                {rx.gatLeft ? (
                  <View style={s.gatBlock}>
                    <Text style={s.gatLabel}>LE</Text>
                    <Text style={s.gatValue}>{rx.gatLeft} <Text style={s.gatUnit}>mmHg</Text></Text>
                  </View>
                ) : null}
              </View>
              ) : null}
            </InfoCard>
          </SectionBlock>
        )}

        {/* Diagnosis */}
        {sectionEnabled("diagnosis") && rx.diagnosis ? (
          <SectionBlock title={sectionTitle("diagnosis", "Diagnosis")}>
            <InfoCard><Text style={s.bodyText}>{rx.diagnosis}</Text></InfoCard>
          </SectionBlock>
        ) : null}

        {/* Drugs */}
        {sectionEnabled("drugs") && rx.drugs && rx.drugs.length > 0 && (
          <SectionBlock title={sectionTitle("drugs", "Treatment (Rx)")}>
            <View style={{ gap: 10 }}>
              {rx.drugs.map((drug: Drug, i: number) => (
                <InfoCard key={drug.id ?? i}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground }}>{drug.name}</Text>
                    <View style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.primary }}>{drug.route}</Text>
                    </View>
                  </View>
                  {drug.dosePhases?.length ? (
                    <View style={{ gap: 7 }}>
                      {drug.dosePhases.map((phase, phaseIndex) => (
                        <View key={`${drug.id}-phase-${phaseIndex}`}>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, lineHeight: 21 }}>
                            {phaseIndex && phase.connector ? `${phase.connector}, ` : ""}{phase.schedule}
                          </Text>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.accent, marginTop: 1 }}>
                            {phase.durationValue} {phase.durationUnit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 16 }}>
                      {drug.schedule ? (
                        <View>
                          <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 }}>Schedule</Text>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginTop: 1 }}>{drug.schedule}</Text>
                          {drug.scheduleBn ? <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.accent, marginTop: 1 }}>{drug.scheduleBn}</Text> : null}
                        </View>
                      ) : null}
                      {drug.duration ? (
                        <View>
                          <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 }}>Duration</Text>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginTop: 1 }}>{drug.duration}</Text>
                          {drug.durationBn ? <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.accent, marginTop: 1 }}>{drug.durationBn}</Text> : null}
                        </View>
                      ) : null}
                    </View>
                  )}
                  {drug.notes ? <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 6, fontStyle: "italic" }}>{drug.notes}</Text> : null}
                </InfoCard>
              ))}
            </View>
          </SectionBlock>
        )}

        {/* Spectacle Rx */}
        {sectionEnabled("spectacle") ? <RxTable reD={rx.rightEyeDistance} leD={rx.leftEyeDistance} reN={rx.rightEyeNear} leN={rx.leftEyeNear} ipd={rx.ipd} /> : null}

        {/* Lens Options */}
        {sectionEnabled("lens") && lensOpts.length > 0 && (
          <SectionBlock title={sectionTitle("lens", "Lens Options")}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {lensOpts.map((opt) => (
                <View key={opt} style={{ backgroundColor: colors.secondary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary + "40" }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.primary }}>{opt}</Text>
                </View>
              ))}
            </View>
          </SectionBlock>
        )}

        {/* Investigations */}
        {sectionEnabled("investigations") && rx.investigations ? (
          <SectionBlock title={sectionTitle("investigations", "Investigations")}>
            <InfoCard><Text style={s.bodyText}>{rx.investigations}</Text></InfoCard>
          </SectionBlock>
        ) : null}

        {/* Advice */}
        {sectionEnabled("advice") && rx.advice ? (
          <SectionBlock title={sectionTitle("advice", "Advice/উপদেশ")}>
            <InfoCard>
              <Text style={s.bodyText}>{rx.advice}</Text>
              {rx.adviceBn ? (
                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: colors.accent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>বাংলা</Text>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 24 }}>{rx.adviceBn}</Text>
                </View>
              ) : null}
            </InfoCard>
          </SectionBlock>
        ) : null}

        {/* Follow-up */}
        {sectionEnabled("followUp") && rx.followUp ? (
          <SectionBlock title={sectionTitle("followUp", "Follow-Up Time")}>
            <InfoCard>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Feather name="calendar" size={16} color={colors.primary} />
                <View>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{rx.followUp}</Text>
                  {rx.followUpBn && rx.followUpBn !== rx.followUp ? (
                    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.accent, marginTop: 2 }}>{rx.followUpBn}</Text>
                  ) : null}
                </View>
              </View>
            </InfoCard>
          </SectionBlock>
        ) : null}

        {(rx.customSections || []).map((section) => {
          return section.content ? (
            <SectionBlock key={section.id} title={section.title}>
              <InfoCard><Text style={s.bodyText}>{section.content}</Text></InfoCard>
            </SectionBlock>
          ) : null;
        })}

        {/* Chamber footer */}
        {(doctor.chamberName || doctor.chamberAddress) && (
          <View style={s.chamberFooter}>
            <Feather name="map-pin" size={13} color={colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              {doctor.chamberName ? <Text style={s.chamberName}>{doctor.chamberName}</Text> : null}
              {doctor.chamberAddress ? <Text style={s.chamberAddr}>{doctor.chamberAddress}</Text> : null}
              {doctor.chamberPhone ? <Text style={s.chamberAddr}>{doctor.chamberPhone}</Text> : null}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    navBar: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4,
    },
    iconBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.muted, alignItems: "center", justifyContent: "center",
    },
    navTitle: {
      flex: 1, textAlign: "center", fontSize: 17,
      fontFamily: "Inter_700Bold", color: colors.foreground,
    },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    notFoundText: { fontSize: 16, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },

    doctorHeader: {
      backgroundColor: colors.card, borderRadius: 14, padding: 14,
      flexDirection: "row", marginBottom: 12,
      borderLeftWidth: 3, borderLeftColor: colors.primary,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    },
    doctorNameBn: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },
    doctorNameEn: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.primary, marginTop: 1 },
    doctorSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.foreground, marginTop: 1 },
    doctorReg: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 4 },
    doctorContact: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "right", marginBottom: 1 },

    metaCard: {
      backgroundColor: colors.card, borderRadius: 14, padding: 14,
      flexDirection: "row", alignItems: "center", marginBottom: 16,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    },
    metaAvatar: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center", marginRight: 12,
    },
    metaAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.primary },
    metaName: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground },
    metaSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },

    bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 22 },

    gatBlock: { alignItems: "flex-start" },
    gatLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    gatValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    gatUnit: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },

    chamberFooter: {
      flexDirection: "row", alignItems: "flex-start",
      marginTop: 12, padding: 12,
      backgroundColor: colors.secondary, borderRadius: 10,
    },
    chamberName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    chamberAddr: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 },
  });
