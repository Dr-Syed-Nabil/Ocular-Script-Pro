import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SearchBar } from "@/components/SearchBar";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { EyeSpectacleRx, EyeVA, PastHistory, Patient } from "@/types";

const EMPTY_VA: EyeVA = { ua: "", wa: "", ph: "", bcva: "" };
const EMPTY_RX: EyeSpectacleRx = { dsp: "", dcyl: "", axis: "", va: "" };
const EMPTY_HISTORY: PastHistory = {
  dm: false, htn: false, ihd: false, ckd: false,
  ba: false, thyDs: false, uromax: false, others: "",
};

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

function CheckItem({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 10, paddingVertical: 7,
        borderRadius: 8, borderWidth: 1.5,
        borderColor: value ? colors.primary : colors.border,
        backgroundColor: value ? colors.secondary : colors.card,
      }}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
    >
      <View style={{
        width: 16, height: 16, borderRadius: 4, borderWidth: 1.5,
        borderColor: value ? colors.primary : colors.mutedForeground,
        backgroundColor: value ? colors.primary : "transparent",
        alignItems: "center", justifyContent: "center", marginRight: 6,
      }}>
        {value && <Feather name="check" size={10} color="#fff" />}
      </View>
      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: value ? colors.primary : colors.foreground }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function VATable({
  reVA, leVA, onChange,
}: { reVA: EyeVA; leVA: EyeVA; onChange: (eye: "re" | "le", f: keyof EyeVA, v: string) => void }) {
  const colors = useColors();
  const s = vaStyles(colors);
  const fields: { key: keyof EyeVA; label: string }[] = [
    { key: "ua", label: "UA" },
    { key: "wa", label: "WA" },
    { key: "ph", label: "PH" },
    { key: "bcva", label: "BCVA" },
  ];
  return (
    <View style={s.table}>
      <View style={s.headerRow}>
        <View style={s.labelCol} />
        <Text style={[s.headerCell, { flex: 1 }]}>RE (OD)</Text>
        <Text style={[s.headerCell, { flex: 1 }]}>LE (OS)</Text>
      </View>
      {fields.map(({ key, label }) => (
        <View key={key} style={s.row}>
          <Text style={s.rowLabel}>{label}</Text>
          <TextInput
            style={s.cell}
            value={reVA[key]}
            onChangeText={(v) => onChange("re", key, v)}
            placeholder="6/6"
            placeholderTextColor={colors.mutedForeground}
            autoCorrect={false}
          />
          <TextInput
            style={s.cell}
            value={leVA[key]}
            onChangeText={(v) => onChange("le", key, v)}
            placeholder="6/6"
            placeholderTextColor={colors.mutedForeground}
            autoCorrect={false}
          />
        </View>
      ))}
    </View>
  );
}

const vaStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    table: {
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerRow: {
      flexDirection: "row",
      backgroundColor: colors.secondary,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    labelCol: { width: 48 },
    headerCell: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      textAlign: "center",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 10,
    },
    rowLabel: {
      width: 48,
      fontSize: 11,
      fontFamily: "Inter_700Bold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    cell: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      textAlign: "center",
      paddingVertical: 9,
      paddingHorizontal: 4,
    },
  });

function SpectacleTable({
  reD, leD, reN, leN,
  ipd,
  onChangeRxD, onChangeRxN,
  onChangeIPD,
}: {
  reD: EyeSpectacleRx; leD: EyeSpectacleRx;
  reN: EyeSpectacleRx; leN: EyeSpectacleRx;
  ipd: string;
  onChangeRxD: (eye: "re" | "le", f: keyof EyeSpectacleRx, v: string) => void;
  onChangeRxN: (eye: "re" | "le", f: keyof EyeSpectacleRx, v: string) => void;
  onChangeIPD: (v: string) => void;
}) {
  const colors = useColors();
  const s = rxStyles(colors);

  const cols: { key: keyof EyeSpectacleRx; label: string }[] = [
    { key: "dsp", label: "SPH" },
    { key: "dcyl", label: "CYL" },
    { key: "axis", label: "AXIS" },
    { key: "va", label: "VA" },
  ];

  const RxRow = ({
    rowLabel,
    rx, onChangeFn,
  }: {
    rowLabel: string;
    rx: { re: EyeSpectacleRx; le: EyeSpectacleRx };
    onChangeFn: (eye: "re" | "le", f: keyof EyeSpectacleRx, v: string) => void;
  }) => (
    <>
      <View style={s.distRowHeader}>
        <Text style={s.distRowLabel}>{rowLabel}</Text>
      </View>
      <View style={s.rxRow}>
        <Text style={s.eyeTag}>RE</Text>
        {cols.map(({ key, label }) => (
          <View key={key} style={s.rxCell}>
            <Text style={s.colLabel}>{label}</Text>
            <TextInput
              style={s.rxInput}
              value={rx.re[key]}
              onChangeText={(v) => onChangeFn("re", key, v)}
              placeholder={key === "axis" ? "°" : key === "va" ? "6/6" : "0.00"}
              placeholderTextColor={colors.mutedForeground}
              keyboardType={key === "va" ? "default" : "numbers-and-punctuation"}
              autoCorrect={false}
            />
          </View>
        ))}
      </View>
      <View style={[s.rxRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
        <Text style={s.eyeTag}>LE</Text>
        {cols.map(({ key }) => (
          <View key={key} style={s.rxCell}>
            <TextInput
              style={s.rxInput}
              value={rx.le[key]}
              onChangeText={(v) => onChangeFn("le", key, v)}
              placeholder={key === "axis" ? "°" : key === "va" ? "6/6" : "0.00"}
              placeholderTextColor={colors.mutedForeground}
              keyboardType={key === "va" ? "default" : "numbers-and-punctuation"}
              autoCorrect={false}
            />
          </View>
        ))}
      </View>
    </>
  );

  return (
    <View style={s.table}>
      <RxRow
        rowLabel="Distance (D)"
        rx={{ re: reD, le: leD }}
        onChangeFn={onChangeRxD}
      />
      <View style={[s.divider, { borderTopWidth: 2, borderTopColor: colors.border }]} />
      <RxRow
        rowLabel="Near (N)"
        rx={{ re: reN, le: leN }}
        onChangeFn={onChangeRxN}
      />
      <View style={[s.divider, { borderTopWidth: 2, borderTopColor: colors.border }]} />
      <View style={s.ipdRow}>
        <Text style={s.ipdLabel}>IPD (mm)</Text>
        <TextInput
          style={s.ipdInput}
          value={ipd}
          onChangeText={onChangeIPD}
          placeholder="64"
          keyboardType="decimal-pad"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
    </View>
  );
}

const rxStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    table: {
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    distRowHeader: {
      backgroundColor: colors.secondary,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    distRowLabel: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    rxRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    eyeTag: {
      width: 28,
      fontSize: 11,
      fontFamily: "Inter_700Bold",
      color: colors.mutedForeground,
      paddingBottom: 8,
    },
    rxCell: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 2,
    },
    colLabel: {
      fontSize: 9,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 3,
    },
    rxInput: {
      width: "100%",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 6,
      paddingVertical: 7,
      paddingHorizontal: 2,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      textAlign: "center",
      backgroundColor: colors.surface,
    },
    divider: {},
    ipdRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    ipdLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    ipdInput: {
      width: 80,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 7,
      paddingHorizontal: 10,
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      textAlign: "center",
      backgroundColor: colors.surface,
    },
  });

function ToggleGroup({
  options, value, onChange, multi,
}: {
  options: string[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = multi
          ? (value as string[]).includes(opt)
          : value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={{
              borderWidth: 1.5,
              borderColor: active ? colors.primary : colors.border,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: active ? colors.secondary : colors.card,
            }}
            onPress={() => {
              if (multi) {
                const arr = value as string[];
                onChange(active ? arr.filter((a) => a !== opt) : [...arr, opt]);
              } else {
                onChange(active ? "" : opt);
              }
            }}
          >
            <Text style={{
              fontSize: 13,
              fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
              color: active ? colors.primary : colors.mutedForeground,
            }}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function NoteInput({ value, onChange, placeholder, lines = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; lines?: number;
}) {
  const colors = useColors();
  return (
    <TextInput
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: colors.foreground,
        fontFamily: "Inter_400Regular",
        minHeight: lines * 36,
        borderWidth: 1.5,
        borderColor: colors.border,
        textAlignVertical: "top",
      }}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      multiline
      numberOfLines={lines}
      textAlignVertical="top"
    />
  );
}

export default function NewRxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { patients, addPrescription, addPatient } = useData();
  const s = styles(colors);

  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientAge, setNewPatientAge] = useState("");
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

  const [reD, setReD] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [leD, setLeD] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [reN, setReN] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [leN, setLeN] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [ipd, setIpd] = useState("");

  const [lensUsage, setLensUsage] = useState("");
  const [lensType, setLensType] = useState("");
  const [lensCoating, setLensCoating] = useState<string[]>([]);
  const [lensMaterial, setLensMaterial] = useState("");

  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");

  const [saving, setSaving] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!patientQuery.trim()) return patients.slice(0, 8);
    const q = patientQuery.toLowerCase();
    return patients.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [patients, patientQuery]);

  const handleVAChange = (eye: "re" | "le", field: keyof EyeVA, val: string) => {
    if (eye === "re") setReVA((p) => ({ ...p, [field]: val }));
    else setLeVA((p) => ({ ...p, [field]: val }));
  };

  const handleRxDChange = (eye: "re" | "le", field: keyof EyeSpectacleRx, val: string) => {
    if (eye === "re") setReD((p) => ({ ...p, [field]: val }));
    else setLeD((p) => ({ ...p, [field]: val }));
  };

  const handleRxNChange = (eye: "re" | "le", field: keyof EyeSpectacleRx, val: string) => {
    if (eye === "re") setReN((p) => ({ ...p, [field]: val }));
    else setLeN((p) => ({ ...p, [field]: val }));
  };

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
        patient = await addPatient({
          name: newPatientName.trim(),
          dob: "",
          phone: newPatientPhone.trim(),
          email: "",
          gender: "",
        });
      }
      if (!patient) return;

      await addPrescription({
        patientId: patient.id,
        patientName: patient.name,
        patientAge: patientAge.trim(),
        date: new Date().toISOString().split("T")[0],
        rightEyeVA: reVA,
        leftEyeVA: leVA,
        chiefComplaints,
        pastHistory: history,
        adnexa,
        anteriorSegment,
        posteriorSegment,
        gatRight,
        gatLeft,
        rightEyeDistance: reD,
        leftEyeDistance: leD,
        rightEyeNear: reN,
        leftEyeNear: leN,
        ipd,
        lensUsage,
        lensType,
        lensCoating,
        lensMaterial,
        advice,
        followUp,
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
      <View style={s.navBar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.navTitle}>New Prescription</Text>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={s.saveBtnText}>{saving ? "Saving…" : "Save Rx"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 },
        ]}
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
              <TextInput
                style={s.patientInput}
                value={patientQuery}
                onChangeText={(t) => { setPatientQuery(t); setSelectedPatient(null); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search patient by name…"
                placeholderTextColor={colors.mutedForeground}
              />
              {selectedPatient && <Feather name="check-circle" size={16} color={colors.success} />}
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
                {filteredPatients.length === 0 && (
                  <View style={s.dropdownItem}>
                    <Text style={s.dropdownSub}>No patients found</Text>
                  </View>
                )}
              </View>
            )}
            <TouchableOpacity style={s.linkBtn} onPress={() => { setIsNewPatient(true); setShowDropdown(false); }}>
              <Feather name="user-plus" size={13} color={colors.primary} />
              <Text style={s.linkBtnText}>Create new patient</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.newPatientForm}>
            <TextInput style={s.input} value={newPatientName} onChangeText={setNewPatientName}
              placeholder="Patient full name *" placeholderTextColor={colors.mutedForeground} />
            <TextInput style={s.input} value={newPatientPhone} onChangeText={setNewPatientPhone}
              placeholder="Phone number" keyboardType="phone-pad" placeholderTextColor={colors.mutedForeground} />
            <TouchableOpacity style={s.linkBtn} onPress={() => setIsNewPatient(false)}>
              <Feather name="search" size={13} color={colors.primary} />
              <Text style={s.linkBtnText}>Search existing patient</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.miniLabel}>Age</Text>
            <TextInput style={s.input} value={patientAge} onChangeText={setPatientAge}
              placeholder="e.g. 45 yrs" placeholderTextColor={colors.mutedForeground} keyboardType="default" />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.miniLabel}>Date</Text>
            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ fontSize: 14, color: colors.foreground, fontFamily: "Inter_500Medium" }}>
                {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Chief Complaints ─── */}
        <SectionTitle title="Chief Complaints" />
        <NoteInput value={chiefComplaints} onChange={setChiefComplaints}
          placeholder="e.g. Blurred vision, headache, eye pain…" lines={3} />

        {/* ─── Past History ─── */}
        <SectionTitle title="Past History" />
        <View style={s.checkGrid}>
          {([
            ["dm", "DM"], ["htn", "HTN"], ["ihd", "IHD"], ["ckd", "CKD"],
            ["ba", "BA"], ["thyDs", "Thyroid Ds"], ["uromax", "Uromax"],
          ] as [keyof PastHistory, string][]).map(([key, label]) => (
            <CheckItem key={key} label={label}
              value={history[key] as boolean}
              onChange={(v) => setHistory((h) => ({ ...h, [key]: v }))} />
          ))}
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={s.miniLabel}>Others</Text>
          <TextInput style={s.input} value={history.others}
            onChangeText={(v) => setHistory((h) => ({ ...h, others: v }))}
            placeholder="Other medical history…" placeholderTextColor={colors.mutedForeground} />
        </View>

        {/* ─── Visual Acuity ─── */}
        <SectionTitle title="Visual Acuity" />
        <VATable reVA={reVA} leVA={leVA} onChange={handleVAChange} />

        {/* ─── Examination ─── */}
        <SectionTitle title="Examination Findings" />
        <Text style={s.miniLabel}>Adnexa</Text>
        <NoteInput value={adnexa} onChange={setAdnexa}
          placeholder="Eyelid, lacrimal, orbit…" lines={2} />
        <View style={{ height: 8 }} />
        <Text style={s.miniLabel}>Anterior Segment</Text>
        <NoteInput value={anteriorSegment} onChange={setAnteriorSegment}
          placeholder="Cornea, AC, iris, lens…" lines={3} />
        <View style={{ height: 8 }} />
        <Text style={s.miniLabel}>Posterior Segment</Text>
        <NoteInput value={posteriorSegment} onChange={setPosteriorSegment}
          placeholder="Vitreous, retina, disc, macula…" lines={3} />

        {/* ─── GAT / IOP ─── */}
        <SectionTitle title="GAT / Intraocular Pressure" />
        <View style={s.gatRow}>
          <View style={s.gatField}>
            <Text style={s.miniLabel}>RE (mmHg)</Text>
            <TextInput style={[s.input, { textAlign: "center" }]}
              value={gatRight} onChangeText={setGatRight}
              placeholder="14" keyboardType="decimal-pad"
              placeholderTextColor={colors.mutedForeground} />
          </View>
          <View style={{ width: 16 }} />
          <View style={s.gatField}>
            <Text style={s.miniLabel}>LE (mmHg)</Text>
            <TextInput style={[s.input, { textAlign: "center" }]}
              value={gatLeft} onChangeText={setGatLeft}
              placeholder="14" keyboardType="decimal-pad"
              placeholderTextColor={colors.mutedForeground} />
          </View>
        </View>

        {/* ─── Spectacle Correction ─── */}
        <SectionTitle title="Spectacle Correction" />
        <SpectacleTable
          reD={reD} leD={leD} reN={reN} leN={leN}
          ipd={ipd}
          onChangeRxD={handleRxDChange}
          onChangeRxN={handleRxNChange}
          onChangeIPD={setIpd}
        />

        {/* ─── Lens Options ─── */}
        <SectionTitle title="Lens Options" />
        <Text style={s.miniLabel}>Usage</Text>
        <ToggleGroup
          value={lensUsage}
          onChange={(v) => setLensUsage(v as string)}
          options={["Constant use", "Distance only", "Near only", "Computer/intermediate"]}
        />
        <View style={{ height: 12 }} />
        <Text style={s.miniLabel}>Type</Text>
        <ToggleGroup
          value={lensType}
          onChange={(v) => setLensType(v as string)}
          options={["Monofocal", "Bifocal", "Progressive"]}
        />
        <View style={{ height: 12 }} />
        <Text style={s.miniLabel}>Coating</Text>
        <ToggleGroup
          value={lensCoating}
          onChange={(v) => setLensCoating(v as string[])}
          options={["Blue-Cut", "Photosun", "Anti-Reflective"]}
          multi
        />
        <View style={{ height: 12 }} />
        <Text style={s.miniLabel}>Material</Text>
        <ToggleGroup
          value={lensMaterial}
          onChange={(v) => setLensMaterial(v as string)}
          options={["Glass", "Plastic"]}
        />

        {/* ─── Advice ─── */}
        <SectionTitle title="Advice (উপদেশ)" />
        <NoteInput value={advice} onChange={setAdvice}
          placeholder="Instructions for the patient…" lines={4} />

        {/* ─── Follow-up ─── */}
        <SectionTitle title="Follow-up" />
        <ToggleGroup
          value={followUp}
          onChange={(v) => setFollowUp(v as string)}
          options={["1 week", "2 weeks", "1 month", "3 months", "6 months", "1 year", "As needed"]}
        />
        <View style={{ height: 8 }} />
        <TextInput
          style={s.input}
          value={["1 week","2 weeks","1 month","3 months","6 months","1 year","As needed"].includes(followUp) ? "" : followUp}
          onChangeText={setFollowUp}
          placeholder="Or type custom follow-up…"
          placeholderTextColor={colors.mutedForeground}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    navBar: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4,
    },
    iconBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.muted, alignItems: "center", justifyContent: "center",
    },
    navTitle: {
      flex: 1, textAlign: "center", fontSize: 17,
      fontFamily: "Inter_700Bold", color: colors.foreground,
    },
    saveBtn: {
      backgroundColor: colors.primary, borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
    scroll: { paddingHorizontal: 16 },
    searchRow: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 11,
      borderWidth: 1.5, borderColor: colors.border,
    },
    patientInput: {
      flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular",
    },
    dropdown: {
      backgroundColor: colors.card, borderRadius: 12,
      marginTop: 4, borderWidth: 1, borderColor: colors.border, overflow: "hidden",
    },
    dropdownItem: {
      paddingHorizontal: 14, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    dropdownName: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_500Medium" },
    dropdownSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 1 },
    linkBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingVertical: 4 },
    linkBtnText: { fontSize: 13, color: colors.primary, fontFamily: "Inter_500Medium" },
    newPatientForm: { gap: 10 },
    row: { flexDirection: "row", marginTop: 10 },
    miniLabel: {
      fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground,
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5,
    },
    input: {
      backgroundColor: colors.card, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 11,
      fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular",
      borderWidth: 1.5, borderColor: colors.border,
    },
    checkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    gatRow: { flexDirection: "row" },
    gatField: { flex: 1 },
  });
