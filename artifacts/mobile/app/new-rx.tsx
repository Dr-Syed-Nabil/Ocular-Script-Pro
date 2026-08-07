import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SmartInput } from "@/components/SmartInput";
import { VAPicker } from "@/components/VAPicker";
import {
  ADD_VALUES, AXIS_VALUES, CYL_VALUES, SPH_VALUES,
  SpectacleValuePicker,
  formatAdd, formatAxis, formatSphCyl,
} from "@/components/SpectacleValuePicker";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { useSuggestions } from "@/hooks/useSuggestions";
import {
  isAlreadyBangla,
  tobnDigits,
  translateToBangla,
} from "@/utils/banglaTranslate";
import {
  Drug,
  EyeSpectacleRx,
  EyeVA,
  PastHistory,
  Patient,
} from "@/types";

const newId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

const EMPTY_VA: EyeVA = { ua: "", wa: "", ph: "", bcva: "" };
const EMPTY_RX: EyeSpectacleRx = { dsp: "", dcyl: "", axis: "", va: "" };
const EMPTY_HISTORY: PastHistory = {
  dm: false, htn: false, ihd: false, ckd: false,
  ba: false, thyDs: false, uromax: false, others: "",
};
const DRUG_ROUTES = ["Eye Drops", "Eye Ointment", "Oral", "Injection", "Topical"];

function genDrugId() {
  return Math.random().toString(36).slice(2);
}
function emptyDrug(): Drug {
  return { id: genDrugId(), name: "", schedule: "", scheduleBn: "", duration: "", durationBn: "", route: "Eye Drops", notes: "" };
}

/* ───────── tiny helpers ───────── */

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 22, marginBottom: 10 }}>
      <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: colors.primary, marginRight: 8 }} />
      <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1 }}>
        {title}
      </Text>
    </View>
  );
}

function MiniLabel({ label }: { label: string }) {
  const colors = useColors();
  return (
    <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>
      {label}
    </Text>
  );
}

function CheckItem({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: value ? colors.primary : colors.border, backgroundColor: value ? colors.secondary : colors.card }}
      onPress={() => onChange(!value)} activeOpacity={0.7}
    >
      <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: value ? colors.primary : colors.mutedForeground, backgroundColor: value ? colors.primary : "transparent", alignItems: "center", justifyContent: "center", marginRight: 6 }}>
        {value && <Feather name="check" size={10} color="#fff" />}
      </View>
      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: value ? colors.primary : colors.foreground }}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleGroup({ options, value, onChange, multi }: { options: string[]; value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = multi ? (value as string[]).includes(opt) : value === opt;
        return (
          <TouchableOpacity key={opt}
            style={{ borderWidth: 1.5, borderColor: active ? colors.primary : colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: active ? colors.secondary : colors.card }}
            onPress={() => {
              if (multi) {
                const arr = value as string[];
                onChange(active ? arr.filter((a) => a !== opt) : [...arr, opt]);
              } else {
                onChange(active ? "" : opt);
              }
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium", color: active ? colors.primary : colors.mutedForeground }}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ───────── VA Table ───────── */

function VATable({ reVA, leVA, onChangeRe, onChangeLe }: {
  reVA: EyeVA; leVA: EyeVA;
  onChangeRe: (f: keyof EyeVA, v: string) => void;
  onChangeLe: (f: keyof EyeVA, v: string) => void;
}) {
  const colors = useColors();

  const rows: { key: keyof EyeVA; label: string; ni?: boolean }[] = [
    { key: "ua", label: "UA" },
    { key: "wa", label: "WA" },
    { key: "ph", label: "PH", ni: true },
    { key: "bcva", label: "BCVA", ni: true },
  ];

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", backgroundColor: colors.secondary, paddingVertical: 8, paddingHorizontal: 10 }}>
        <View style={{ width: 52 }} />
        <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_700Bold", color: colors.primary, textAlign: "center" }}>RE (OD)</Text>
        <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_700Bold", color: colors.primary, textAlign: "center" }}>LE (OS)</Text>
      </View>
      {rows.map(({ key, label, ni }) => (
        <View key={key} style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ width: 44, fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
          <VAPicker
            value={reVA[key]}
            onChange={(v) => onChangeRe(key, v)}
            fieldLabel={label}
            eyeLabel="RE"
            includeNI={ni}
          />
          <VAPicker
            value={leVA[key]}
            onChange={(v) => onChangeLe(key, v)}
            fieldLabel={label}
            eyeLabel="LE"
            includeNI={ni}
          />
        </View>
      ))}
    </View>
  );
}

/* ───────── Spectacle Table ───────── */

function RxBlock({ title, re, le, onFn, readOnly }: {
  title: string; re: EyeSpectacleRx; le: EyeSpectacleRx;
  onFn: (eye: "re" | "le", f: keyof EyeSpectacleRx, v: string) => void;
  readOnly?: boolean;
}) {
  const colors = useColors();
  return (
    <>
      <View style={{ backgroundColor: colors.secondary, paddingVertical: 6, paddingHorizontal: 12 }}>
        <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</Text>
      </View>
      {(["re", "le"] as const).map((eye) => {
        const rx = eye === "re" ? re : le;
        return (
          <View key={eye} style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ width: 28, fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, paddingBottom: 10 }}>{eye === "re" ? "RE" : "LE"}</Text>
            {/* SPH */}
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 2 }}>
              {eye === "re" && <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>SPH</Text>}
              {readOnly ? (
                <View style={{ width: "100%", borderWidth: 1.5, borderColor: colors.primary + "60", borderRadius: 6, paddingVertical: 9, alignItems: "center", backgroundColor: colors.secondary }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.primary }}>{rx.dsp || "—"}</Text>
                </View>
              ) : (
                <SpectacleValuePicker values={SPH_VALUES} value={rx.dsp} onChange={(v) => onFn(eye, "dsp", v)} format={formatSphCyl} placeholder="SPH" />
              )}
            </View>
            {/* CYL */}
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 2 }}>
              {eye === "re" && <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>CYL</Text>}
              {readOnly ? (
                <View style={{ width: "100%", borderWidth: 1.5, borderColor: colors.primary + "60", borderRadius: 6, paddingVertical: 9, alignItems: "center", backgroundColor: colors.secondary }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.primary }}>{rx.dcyl || "—"}</Text>
                </View>
              ) : (
                <SpectacleValuePicker values={CYL_VALUES} value={rx.dcyl} onChange={(v) => onFn(eye, "dcyl", v)} format={formatSphCyl} placeholder="CYL" />
              )}
            </View>
            {/* AXIS */}
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 2 }}>
              {eye === "re" && <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>AXIS</Text>}
              {readOnly ? (
                <View style={{ width: "100%", borderWidth: 1.5, borderColor: colors.primary + "60", borderRadius: 6, paddingVertical: 9, alignItems: "center", backgroundColor: colors.secondary }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.primary }}>{rx.axis ? (rx.axis.includes("°") ? rx.axis : rx.axis + "°") : "—"}</Text>
                </View>
              ) : (
                <SpectacleValuePicker values={AXIS_VALUES} value={rx.axis} onChange={(v) => onFn(eye, "axis", v)} format={formatAxis} placeholder="AXIS" />
              )}
            </View>
            {/* VA — always free text */}
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 2 }}>
              {eye === "re" && <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>VA</Text>}
              <TextInput
                style={{ width: "100%", borderWidth: 1.5, borderColor: colors.border, borderRadius: 6, paddingVertical: 7, fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground, textAlign: "center", backgroundColor: colors.surface }}
                value={rx.va} onChangeText={(v) => onFn(eye, "va", v)}
                placeholder="6/6" placeholderTextColor={colors.mutedForeground} autoCorrect={false}
              />
            </View>
          </View>
        );
      })}
    </>
  );
}

function SpectacleTable({ reD, leD, reN, leN, ipd, nearIPD, addValue, onChangeRxD, onChangeRxN, onChangeIPD, onChangeAdd }: {
  reD: EyeSpectacleRx; leD: EyeSpectacleRx;
  reN: EyeSpectacleRx; leN: EyeSpectacleRx;
  ipd: string; nearIPD: string; addValue: string;
  onChangeRxD: (eye: "re" | "le", f: keyof EyeSpectacleRx, v: string) => void;
  onChangeRxN: (eye: "re" | "le", f: keyof EyeSpectacleRx, v: string) => void;
  onChangeIPD: (v: string) => void;
  onChangeAdd: (v: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
      <RxBlock title="Distance (D)" re={reD} le={leD} onFn={onChangeRxD} />

      {/* ── Presbyopic Addition ── */}
      <View style={{ borderTopWidth: 2, borderTopColor: colors.border, backgroundColor: colors.secondary + "80", paddingHorizontal: 12, paddingVertical: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: colors.primary }}>Presbyopic Addition</Text>
            <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 }}>Auto-fills Near SPH for both eyes</Text>
          </View>
          <SpectacleValuePicker
            values={ADD_VALUES} value={addValue} onChange={onChangeAdd}
            format={formatAdd} placeholder="0.00 Add"
            accentColor="#0FA3B1"
          />
        </View>
      </View>

      <RxBlock title="Near (N) — auto-filled" re={reN} le={leN} onFn={onChangeRxN} readOnly={!!addValue} />

      {/* ── IPD ── */}
      <View style={{ borderTopWidth: 2, borderTopColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>IPD (mm)</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 4 }}>Distance</Text>
            <TextInput
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center", backgroundColor: colors.surface }}
              value={ipd} onChangeText={(v) => onChangeIPD(v.replace(/[^0-9]/g, "").slice(0, 2))}
              placeholder="64" keyboardType="number-pad" maxLength={2}
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 4 }}>Near (auto)</Text>
            <View style={{ borderWidth: 1.5, borderColor: nearIPD ? colors.accent + "80" : colors.border, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: nearIPD ? colors.secondary : colors.surface, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: nearIPD ? colors.accent : colors.mutedForeground }}>
                {nearIPD || "—"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ───────── Drug Row ───────── */

function DrugRow({ drug, onChange, onDelete, drugSuggestions }: {
  drug: Drug;
  onChange: (updated: Drug) => void;
  onDelete: () => void;
  drugSuggestions: ReturnType<typeof useSuggestions>;
}) {
  const colors = useColors();
  const scheduleSugg = useSuggestions("drug_schedule");
  const durationSugg = useSuggestions("drug_duration");

  const upd = (field: keyof Drug) => (val: string) => onChange({ ...drug, [field]: val });

  const translateSchedule = () => {
    const bn = tobnDigits(drug.schedule);
    onChange({ ...drug, scheduleBn: bn });
  };

  const translateDuration = () => {
    const bn = translateToBangla(drug.duration);
    onChange({ ...drug, durationBn: bn });
  };

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>Drug</Text>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <SmartInput
        fieldKey="drug_name"
        value={drug.name}
        onChangeText={upd("name")}
        placeholder="Drug name (e.g. Moxifloxacin)"
        style={{ fontSize: 14 }}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {DRUG_ROUTES.map((r) => (
          <TouchableOpacity key={r}
            style={{ borderWidth: 1.5, borderColor: drug.route === r ? colors.primary : colors.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: drug.route === r ? colors.secondary : colors.card }}
            onPress={() => onChange({ ...drug, route: r })}
          >
            <Text style={{ fontSize: 12, fontFamily: drug.route === r ? "Inter_600SemiBold" : "Inter_500Medium", color: drug.route === r ? colors.primary : colors.mutedForeground }}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <MiniLabel label="Schedule" />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={{ flex: 1 }}>
              <SmartInput fieldKey="drug_schedule" value={drug.schedule} onChangeText={upd("schedule")} placeholder="e.g. 1+0+1 BD" />
            </View>
            <TouchableOpacity
              style={{ backgroundColor: colors.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center", justifyContent: "center" }}
              onPress={translateSchedule}
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary }}>বাংলা</Text>
            </TouchableOpacity>
          </View>
          {drug.scheduleBn ? (
            <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.accent }}>{drug.scheduleBn}</Text>
              <TouchableOpacity onPress={() => onChange({ ...drug, scheduleBn: "" })}>
                <Feather name="x" size={12} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1 }}>
          <MiniLabel label="Duration" />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={{ flex: 1 }}>
              <SmartInput fieldKey="drug_duration" value={drug.duration} onChangeText={upd("duration")} placeholder="e.g. 7 days" />
            </View>
            <TouchableOpacity
              style={{ backgroundColor: colors.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center", justifyContent: "center" }}
              onPress={translateDuration}
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary }}>বাংলা</Text>
            </TouchableOpacity>
          </View>
          {drug.durationBn ? (
            <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.accent }}>{drug.durationBn}</Text>
              <TouchableOpacity onPress={() => onChange({ ...drug, durationBn: "" })}>
                <Feather name="x" size={12} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ marginTop: 8 }}>
        <MiniLabel label="Notes (optional)" />
        <SmartInput fieldKey="drug_notes" value={drug.notes} onChangeText={upd("notes")} placeholder="Special instructions…" />
      </View>
    </View>
  );
}

/* ───────── Main screen ───────── */

export default function NewRxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { patients, prescriptions, addPrescription, addPatient, getPatientByPuid } = useData();
  const s = styles(colors);
  const { duplicateFrom } = useLocalSearchParams<{ duplicateFrom?: string }>();

  const [cameraPermission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [scanProcessed, setScanProcessed] = useState(false);

  const ccSugg = useSuggestions("chief_complaints");
  const adnexaSugg = useSuggestions("adnexa");
  const anteriorSugg = useSuggestions("anterior_segment");
  const posteriorSugg = useSuggestions("posterior_segment");
  const adviceSugg = useSuggestions("advice");
  const drugNameSugg = useSuggestions("drug_name");

  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");

  const [reVA, setReVA] = useState<EyeVA>(EMPTY_VA);
  const [leVA, setLeVA] = useState<EyeVA>(EMPTY_VA);

  const [chiefComplaints, setChiefComplaints] = useState("");
  const [history, setHistory] = useState<PastHistory>(EMPTY_HISTORY);

  const [adnexa, setAdnexa] = useState("");
  const [anteriorSegment, setAnteriorSegment] = useState("");
  const [posteriorSegment, setPosteriorSegment] = useState("");

  const [gatRight, setGatRight] = useState("");
  const [gatLeft, setGatLeft] = useState("");

  const [drugs, setDrugs] = useState<Drug[]>([emptyDrug()]);

  const [reD, setReD] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [leD, setLeD] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [reN, setReN] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [leN, setLeN] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [ipd, setIpd] = useState("");
  const [addValue, setAddValue] = useState("");

  // Near IPD = Distance IPD - 4
  const nearIPD = ipd && !isNaN(parseInt(ipd)) ? String(Math.max(0, parseInt(ipd) - 4)) : "";

  // Auto-fill Near SPH when Add changes; copy CYL + AXIS from Distance
  useEffect(() => {
    if (!addValue) return;
    const add = parseFloat(addValue.replace("+", "")) || 0;
    const applyAdd = (distSph: string): string => {
      const d = parseFloat(distSph.replace("+", "")) || 0;
      const r = Math.round((d + add) * 100) / 100;
      if (r === 0) return "0.00";
      return r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2);
    };
    setReN((prev) => ({ ...prev, dsp: applyAdd(reD.dsp), dcyl: reD.dcyl, axis: reD.axis }));
    setLeN((prev) => ({ ...prev, dsp: applyAdd(leD.dsp), dcyl: leD.dcyl, axis: leD.axis }));
  }, [addValue, reD.dsp, leD.dsp, reD.dcyl, leD.dcyl, reD.axis, leD.axis]);

  const [lensUsage, setLensUsage] = useState("");
  const [lensType, setLensType] = useState("");
  const [lensCoating, setLensCoating] = useState<string[]>([]);
  const [lensMaterial, setLensMaterial] = useState("");

  const [advice, setAdvice] = useState("");
  const [adviceBn, setAdviceBn] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpBn, setFollowUpBn] = useState("");

  const [saving, setSaving] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!patientQuery.trim()) return patients.slice(0, 8);
    const q = patientQuery.toLowerCase();
    return patients.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [patients, patientQuery]);

  // ── Duplicate Rx pre-fill ──
  useEffect(() => {
    if (!duplicateFrom) return;
    const source = prescriptions.find((r) => r.id === duplicateFrom);
    if (!source) return;
    const patient = patients.find((p) => p.id === source.patientId);
    if (patient) { setSelectedPatient(patient); setPatientQuery(patient.name); }
    setPatientAge(source.patientAge);
    setReVA(source.rightEyeVA); setLeVA(source.leftEyeVA);
    setChiefComplaints(source.chiefComplaints);
    setHistory(source.pastHistory);
    setAdnexa(source.adnexa); setAnteriorSegment(source.anteriorSegment); setPosteriorSegment(source.posteriorSegment);
    setGatRight(source.gatRight); setGatLeft(source.gatLeft);
    setDrugs(source.drugs.length ? source.drugs.map((d) => ({ ...d, id: newId() })) : [emptyDrug()]);
    setReD(source.rightEyeDistance); setLeD(source.leftEyeDistance);
    setReN(source.rightEyeNear); setLeN(source.leftEyeNear);
    setIpd(source.ipd); setAddValue(source.addValue || "");
    setLensUsage(source.lensUsage); setLensType(source.lensType);
    setLensCoating(source.lensCoating || []); setLensMaterial(source.lensMaterial);
    setAdvice(source.advice); setAdviceBn(source.adviceBn);
    setFollowUp(source.followUp); setFollowUpBn(source.followUpBn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── QR scanner handler ──
  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (scanProcessed) return;
    setScanProcessed(true);
    const puid = data.trim().toUpperCase();
    const found = getPatientByPuid(puid);
    if (found) {
      setSelectedPatient(found);
      setPatientQuery(found.name);
      setShowDropdown(false);
      setShowScanner(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert("Patient Not Found", `No patient with ID ${puid} found.`, [
        { text: "OK", onPress: () => setScanProcessed(false) },
      ]);
    }
  }, [scanProcessed, getPatientByPuid]);

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Camera Access", "Camera permission is required to scan QR codes.");
        return;
      }
    }
    setScanProcessed(false);
    setShowScanner(true);
  };

  const updateDrug = (id: string, updated: Drug) =>
    setDrugs((ds) => ds.map((d) => (d.id === id ? updated : d)));
  const removeDrug = (id: string) =>
    setDrugs((ds) => ds.filter((d) => d.id !== id));
  const addDrug = () => setDrugs((ds) => [...ds, emptyDrug()]);

  const handleSave = async () => {
    if (!selectedPatient && !isNewPatient) {
      Alert.alert("Missing Patient", "Please select or create a patient.");
      return;
    }
    if (isNewPatient && !newPatientName.trim()) {
      Alert.alert("Missing Name", "Please enter the patient name.");
      return;
    }
    setSaving(true);
    try {
      let patient = selectedPatient;
      if (isNewPatient) {
        patient = await addPatient({ name: newPatientName.trim(), dob: "", phone: newPatientPhone.trim(), email: "", gender: "", ageAtEnrollment: patientAge.trim() });
      }
      if (!patient) return;

      // Auto-save suggestions
      if (chiefComplaints.trim()) ccSugg.add(chiefComplaints);
      if (adnexa.trim()) adnexaSugg.add(adnexa);
      if (anteriorSegment.trim()) anteriorSugg.add(anteriorSegment);
      if (posteriorSegment.trim()) posteriorSugg.add(posteriorSegment);
      if (advice.trim()) adviceSugg.add(advice);
      drugs.forEach((d) => { if (d.name) drugNameSugg.add(d.name); });

      await addPrescription({
        patientId: patient.id, patientName: patient.name, patientAge,
        date: new Date().toISOString().split("T")[0],
        rightEyeVA: reVA, leftEyeVA: leVA,
        chiefComplaints, pastHistory: history,
        adnexa, anteriorSegment, posteriorSegment,
        gatRight, gatLeft,
        drugs: drugs.filter((d) => d.name.trim()),
        rightEyeDistance: reD, leftEyeDistance: leD,
        rightEyeNear: reN, leftEyeNear: leN, ipd, nearIPD, addValue,
        lensUsage, lensType, lensCoating, lensMaterial,
        advice, adviceBn, followUp, followUpBn,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save prescription.");
    } finally {
      setSaving(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>

      {/* ─── QR Scanner Modal ─── */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanProcessed ? undefined : handleBarCodeScanned}
          />
          {/* Overlay frame */}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", pointerEvents: "none" }}>
            <View style={{ width: 220, height: 220, borderWidth: 3, borderColor: "#fff", borderRadius: 16, opacity: 0.85 }} />
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 20, textAlign: "center", textShadowColor: "#000", textShadowRadius: 4 }}>
              Point at a patient QR code
            </Text>
          </View>
          <View style={{ position: "absolute", top: (Platform.OS === "web" ? 20 : insets.top) + 8, left: 16 }}>
            <TouchableOpacity
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}
              onPress={() => setShowScanner(false)}
            >
              <Feather name="x" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={s.navBar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.navTitle}>{duplicateFrom ? "Duplicate Rx" : "New Prescription"}</Text>
        <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? "Saving…" : "Save Rx"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 }]}
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Patient ─── */}
        <SectionTitle title="Patient" />
        {!isNewPatient ? (
          <View>
            <View style={s.searchRow}>
              <Feather name="user" size={15} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput style={s.patientInput} value={patientQuery}
                onChangeText={(t) => { setPatientQuery(t); setSelectedPatient(null); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search patient by name…" placeholderTextColor={colors.mutedForeground}
              />
              {selectedPatient
                ? <Feather name="check-circle" size={16} color={colors.success} />
                : (
                  <TouchableOpacity
                    onPress={openScanner}
                    style={{ marginLeft: 6, width: 32, height: 32, borderRadius: 8, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border }}
                  >
                    <Feather name="maximize" size={14} color={colors.primary} />
                  </TouchableOpacity>
                )
              }
            </View>
            {showDropdown && !selectedPatient && (
              <View style={s.dropdown}>
                {filteredPatients.map((p) => (
                  <TouchableOpacity key={p.id} style={s.dropdownItem}
                    onPress={() => { setSelectedPatient(p); setPatientQuery(p.name); setShowDropdown(false); }}>
                    <Text style={s.dropdownName}>{p.name}</Text>
                    {p.phone ? <Text style={s.dropdownSub}>{p.phone}</Text> : null}
                  </TouchableOpacity>
                ))}
                {filteredPatients.length === 0 && <View style={s.dropdownItem}><Text style={s.dropdownSub}>No patients found</Text></View>}
              </View>
            )}
            <TouchableOpacity style={s.linkBtn} onPress={() => { setIsNewPatient(true); setShowDropdown(false); }}>
              <Feather name="user-plus" size={13} color={colors.primary} /><Text style={s.linkBtnText}>Create new patient</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <TextInput style={s.input} value={newPatientName} onChangeText={setNewPatientName} placeholder="Patient full name *" placeholderTextColor={colors.mutedForeground} />
            <TextInput style={s.input} value={newPatientPhone} onChangeText={setNewPatientPhone} placeholder="Phone number" keyboardType="phone-pad" placeholderTextColor={colors.mutedForeground} />
            <TouchableOpacity style={s.linkBtn} onPress={() => setIsNewPatient(false)}>
              <Feather name="search" size={13} color={colors.primary} /><Text style={s.linkBtnText}>Search existing patient</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <MiniLabel label="Age" />
            <TextInput style={s.input} value={patientAge} onChangeText={setPatientAge} placeholder="e.g. 45 yrs" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <MiniLabel label="Date" />
            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ fontSize: 14, color: colors.foreground, fontFamily: "Inter_500Medium" }}>
                {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Chief Complaints ─── */}
        <SectionTitle title="Chief Complaints" />
        <SmartInput fieldKey="chief_complaints" value={chiefComplaints} onChangeText={setChiefComplaints}
          placeholder="e.g. Blurred vision, headache, eye pain…" minHeight={80} multiline />

        {/* ─── Past History ─── */}
        <SectionTitle title="Past History" />
        <View style={s.checkGrid}>
          {([["dm","DM"],["htn","HTN"],["ihd","IHD"],["ckd","CKD"],["ba","BA"],["thyDs","Thyroid Ds"],["uromax","Uromax"]] as [keyof PastHistory, string][]).map(([key, label]) => (
            <CheckItem key={key} label={label} value={history[key] as boolean} onChange={(v) => setHistory((h) => ({ ...h, [key]: v }))} />
          ))}
        </View>
        <View style={{ marginTop: 8 }}>
          <MiniLabel label="Others" />
          <SmartInput fieldKey="past_history_others" value={history.others}
            onChangeText={(v) => setHistory((h) => ({ ...h, others: v }))}
            placeholder="Other medical history…" />
        </View>

        {/* ─── Visual Acuity ─── */}
        <SectionTitle title="Visual Acuity" />
        <VATable
          reVA={reVA} leVA={leVA}
          onChangeRe={(f, v) => setReVA((p) => ({ ...p, [f]: v }))}
          onChangeLe={(f, v) => setLeVA((p) => ({ ...p, [f]: v }))}
        />

        {/* ─── Examination ─── */}
        <SectionTitle title="Examination Findings" />
        <MiniLabel label="Adnexa" />
        <SmartInput fieldKey="adnexa" value={adnexa} onChangeText={setAdnexa} placeholder="Eyelid, lacrimal, orbit…" minHeight={64} multiline />
        <View style={{ height: 8 }} />
        <MiniLabel label="Anterior Segment" />
        <SmartInput fieldKey="anterior_segment" value={anteriorSegment} onChangeText={setAnteriorSegment} placeholder="Cornea, AC, iris, lens…" minHeight={80} multiline />
        <View style={{ height: 8 }} />
        <MiniLabel label="Posterior Segment" />
        <SmartInput fieldKey="posterior_segment" value={posteriorSegment} onChangeText={setPosteriorSegment} placeholder="Vitreous, retina, disc, macula…" minHeight={80} multiline />

        {/* ─── GAT ─── */}
        <SectionTitle title="GAT / Intraocular Pressure" />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <MiniLabel label="RE (mmHg)" />
            <TextInput style={[s.input, { textAlign: "center" }]} value={gatRight} onChangeText={setGatRight} placeholder="14" keyboardType="decimal-pad" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View style={{ width: 16 }} />
          <View style={{ flex: 1 }}>
            <MiniLabel label="LE (mmHg)" />
            <TextInput style={[s.input, { textAlign: "center" }]} value={gatLeft} onChangeText={setGatLeft} placeholder="14" keyboardType="decimal-pad" placeholderTextColor={colors.mutedForeground} />
          </View>
        </View>

        {/* ─── Rx / Drugs ─── */}
        <SectionTitle title="Rx — Drugs & Medications" />
        {drugs.map((drug) => (
          <DrugRow key={drug.id} drug={drug} onChange={(u) => updateDrug(drug.id, u)} onDelete={() => removeDrug(drug.id)} drugSuggestions={drugNameSugg} />
        ))}
        <TouchableOpacity style={s.addDrugBtn} onPress={addDrug}>
          <Feather name="plus" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Add Drug</Text>
        </TouchableOpacity>

        {/* ─── Spectacle Correction ─── */}
        <SectionTitle title="Spectacle Correction" />
        <SpectacleTable
          reD={reD} leD={leD} reN={reN} leN={leN}
          ipd={ipd} nearIPD={nearIPD} addValue={addValue}
          onChangeRxD={(eye, f, v) => { if (eye === "re") setReD((p) => ({ ...p, [f]: v })); else setLeD((p) => ({ ...p, [f]: v })); }}
          onChangeRxN={(eye, f, v) => { if (eye === "re") setReN((p) => ({ ...p, [f]: v })); else setLeN((p) => ({ ...p, [f]: v })); }}
          onChangeIPD={setIpd}
          onChangeAdd={setAddValue}
        />

        {/* ─── Lens Options ─── */}
        <SectionTitle title="Lens Options" />
        <MiniLabel label="Usage" />
        <ToggleGroup value={lensUsage} onChange={(v) => setLensUsage(v as string)} options={["Constant use", "Distance only", "Near only", "Computer/intermediate"]} />
        <View style={{ height: 12 }} />
        <MiniLabel label="Type" />
        <ToggleGroup value={lensType} onChange={(v) => setLensType(v as string)} options={["Monofocal", "Bifocal", "Progressive"]} />
        <View style={{ height: 12 }} />
        <MiniLabel label="Coating" />
        <ToggleGroup value={lensCoating} onChange={(v) => setLensCoating(v as string[])} options={["Blue-Cut", "Photosun", "Anti-Reflective"]} multi />
        <View style={{ height: 12 }} />
        <MiniLabel label="Material" />
        <ToggleGroup value={lensMaterial} onChange={(v) => setLensMaterial(v as string)} options={["Glass", "Plastic"]} />

        {/* ─── Advice ─── */}
        <SectionTitle title="Advice (উপদেশ)" />
        <SmartInput fieldKey="advice" value={advice} onChangeText={(v) => { setAdvice(v); setAdviceBn(""); }}
          placeholder="Instructions for the patient…" minHeight={100} multiline showTranslate />
        {!isAlreadyBangla(advice) && advice.trim() ? (
          <TouchableOpacity style={s.bnBtn}
            onPress={() => setAdviceBn(translateToBangla(advice))}>
            <Text style={s.bnBtnText}>↳ Translate to বাংলা</Text>
          </TouchableOpacity>
        ) : null}
        {adviceBn ? (
          <View style={s.bnBlock}>
            <Text style={s.bnText}>{adviceBn}</Text>
            <TouchableOpacity onPress={() => setAdviceBn("")} style={{ marginLeft: 8 }}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ─── Follow-up ─── */}
        <SectionTitle title="Follow-up (পরবর্তী ভিজিট)" />
        <ToggleGroup value={followUp}
          onChange={(v) => { setFollowUp(v as string); setFollowUpBn(translateToBangla(v as string)); }}
          options={["1 week", "2 weeks", "1 month", "3 months", "6 months", "1 year", "As needed"]}
        />
        <View style={{ height: 8 }} />
        <SmartInput fieldKey="followup_custom" value={followUp} onChangeText={(v) => { setFollowUp(v); setFollowUpBn(translateToBangla(v)); }}
          placeholder="Or type custom follow-up…" showTranslate />
        {followUpBn && followUpBn !== followUp ? (
          <View style={[s.bnBlock, { marginTop: 6 }]}>
            <Text style={s.bnText}>{followUpBn}</Text>
            <TouchableOpacity onPress={() => setFollowUpBn("")} style={{ marginLeft: 8 }}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    navBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
    iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    navTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
    scroll: { paddingHorizontal: 16 },
    searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1.5, borderColor: colors.border },
    patientInput: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
    dropdown: { backgroundColor: colors.card, borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    dropdownName: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_500Medium" },
    dropdownSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 1 },
    linkBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingVertical: 4 },
    linkBtnText: { fontSize: 13, color: colors.primary, fontFamily: "Inter_500Medium" },
    row: { flexDirection: "row", marginTop: 10 },
    input: { backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", borderWidth: 1.5, borderColor: colors.border },
    checkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    addDrugBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.secondary, borderRadius: 10, padding: 12, borderWidth: 1.5, borderColor: colors.primary + "40", justifyContent: "center" },
    bnBtn: { marginTop: 6, paddingVertical: 4 },
    bnBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.accent },
    bnBlock: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.secondary, borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: colors.accent },
    bnText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 22 },
  });
