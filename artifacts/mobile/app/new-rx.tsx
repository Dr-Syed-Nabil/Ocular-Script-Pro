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
import { EyeInputGroup } from "@/components/EyeInputGroup";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { EyePrescription, Patient } from "@/types";

const EMPTY_EYE: EyePrescription = {
  sphere: "",
  cylinder: "",
  axis: "",
  addPower: "",
  va: "",
};

const LENS_TYPES = ["Single Vision", "Bifocal", "Progressive", "Computer", "Tinted", "Contact Lens"];

export default function NewRxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { patients, addPrescription, addPatient } = useData();
  const s = styles(colors);

  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientDob, setNewPatientDob] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");

  const [rightEye, setRightEye] = useState<EyePrescription>(EMPTY_EYE);
  const [leftEye, setLeftEye] = useState<EyePrescription>(EMPTY_EYE);
  const [pdMode, setPdMode] = useState<"binocular" | "monocular">("binocular");
  const [pdBino, setPdBino] = useState("");
  const [pdRight, setPdRight] = useState("");
  const [pdLeft, setPdLeft] = useState("");
  const [lensType, setLensType] = useState("Single Vision");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!patientQuery.trim()) return patients.slice(0, 8);
    const q = patientQuery.toLowerCase();
    return patients.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [patients, patientQuery]);

  const selectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setPatientQuery(p.name);
    setShowPatientDropdown(false);
    setIsNewPatient(false);
  };

  const handleSave = async () => {
    if (!selectedPatient && !isNewPatient) {
      Alert.alert("Missing Patient", "Please select or create a patient.");
      return;
    }
    if (isNewPatient && !newPatientName.trim()) {
      Alert.alert("Missing Name", "Please enter the patient's name.");
      return;
    }
    setSaving(true);
    try {
      let patient = selectedPatient;
      if (isNewPatient) {
        patient = await addPatient({
          name: newPatientName.trim(),
          dob: newPatientDob.trim(),
          phone: newPatientPhone.trim(),
          email: "",
          gender: "",
        });
      }
      if (!patient) return;

      await addPrescription({
        patientId: patient.id,
        patientName: patient.name,
        date: new Date().toISOString().split("T")[0],
        rightEye,
        leftEye,
        pdBinocular: pdBino,
        pdRight,
        pdLeft,
        pdMode,
        lensType,
        notes: notes.trim(),
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
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.navTitle}>New Prescription</Text>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={s.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
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
        <Text style={s.sectionTitle}>Patient</Text>

        {!isNewPatient ? (
          <View style={s.patientSection}>
            <View style={s.patientSearch}>
              <Feather name="user" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput
                style={s.patientInput}
                value={patientQuery}
                onChangeText={(t) => {
                  setPatientQuery(t);
                  setSelectedPatient(null);
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
                placeholder="Search existing patient..."
                placeholderTextColor={colors.mutedForeground}
              />
              {selectedPatient && (
                <Feather name="check-circle" size={16} color={colors.success} />
              )}
            </View>
            {showPatientDropdown && !selectedPatient && (
              <View style={s.dropdown}>
                {filteredPatients.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={s.dropdownItem}
                    onPress={() => selectPatient(p)}
                  >
                    <Text style={s.dropdownName}>{p.name}</Text>
                    {p.dob ? <Text style={s.dropdownSub}>{p.dob}</Text> : null}
                  </TouchableOpacity>
                ))}
                {filteredPatients.length === 0 && (
                  <View style={s.dropdownItem}>
                    <Text style={s.dropdownSub}>No patients found</Text>
                  </View>
                )}
              </View>
            )}
            <TouchableOpacity
              style={s.newPatientLink}
              onPress={() => {
                setIsNewPatient(true);
                setShowPatientDropdown(false);
              }}
            >
              <Feather name="user-plus" size={14} color={colors.primary} />
              <Text style={s.newPatientLinkText}>Create new patient</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.newPatientForm}>
            <TextInput
              style={s.fieldInput}
              value={newPatientName}
              onChangeText={setNewPatientName}
              placeholder="Full name *"
              placeholderTextColor={colors.mutedForeground}
            />
            <TextInput
              style={s.fieldInput}
              value={newPatientDob}
              onChangeText={setNewPatientDob}
              placeholder="Date of birth (e.g. 15 Jan 1990)"
              placeholderTextColor={colors.mutedForeground}
            />
            <TextInput
              style={s.fieldInput}
              value={newPatientPhone}
              onChangeText={setNewPatientPhone}
              placeholder="Phone number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={s.newPatientLink}
              onPress={() => {
                setIsNewPatient(false);
                setNewPatientName("");
              }}
            >
              <Feather name="search" size={14} color={colors.primary} />
              <Text style={s.newPatientLinkText}>Search existing patient</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={s.sectionTitle}>Spectacle Prescription</Text>

        <EyeInputGroup
          label="Right Eye (OD)"
          value={rightEye}
          onChange={setRightEye}
        />
        <EyeInputGroup
          label="Left Eye (OS)"
          value={leftEye}
          onChange={setLeftEye}
        />

        <Text style={s.sectionTitle}>Pupillary Distance</Text>
        <View style={s.pdCard}>
          <View style={s.pdToggle}>
            {(["binocular", "monocular"] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[s.pdTab, pdMode === mode && s.pdTabActive]}
                onPress={() => setPdMode(mode)}
              >
                <Text style={[s.pdTabText, pdMode === mode && s.pdTabTextActive]}>
                  {mode === "binocular" ? "Binocular" : "Monocular"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {pdMode === "binocular" ? (
            <View style={s.pdField}>
              <Text style={s.pdLabel}>PD (mm)</Text>
              <TextInput
                style={s.pdInput}
                value={pdBino}
                onChangeText={setPdBino}
                placeholder="64"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          ) : (
            <View style={s.pdMonoRow}>
              <View style={s.pdField}>
                <Text style={s.pdLabel}>Right PD</Text>
                <TextInput
                  style={s.pdInput}
                  value={pdRight}
                  onChangeText={setPdRight}
                  placeholder="32"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={s.pdField}>
                <Text style={s.pdLabel}>Left PD</Text>
                <TextInput
                  style={s.pdInput}
                  value={pdLeft}
                  onChangeText={setPdLeft}
                  placeholder="32"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
          )}
        </View>

        <Text style={s.sectionTitle}>Lens Type</Text>
        <View style={s.lensGrid}>
          {LENS_TYPES.map((lt) => (
            <TouchableOpacity
              key={lt}
              style={[s.lensChip, lensType === lt && s.lensChipActive]}
              onPress={() => setLensType(lt)}
            >
              <Text style={[s.lensChipText, lensType === lt && s.lensChipTextActive]}>
                {lt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionTitle}>Clinical Notes</Text>
        <TextInput
          style={s.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional instructions, remarks..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 12,
      paddingTop: 4,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    navTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 17,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      color: "#fff",
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    scroll: {
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 20,
      marginBottom: 10,
    },
    patientSection: {},
    patientSearch: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    patientInput: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    dropdown: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    dropdownItem: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownName: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    dropdownSub: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
    newPatientLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
      paddingVertical: 4,
    },
    newPatientLinkText: {
      fontSize: 13,
      color: colors.primary,
      fontFamily: "Inter_500Medium",
    },
    newPatientForm: {
      gap: 10,
    },
    fieldInput: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    pdCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    pdToggle: {
      flexDirection: "row",
      backgroundColor: colors.muted,
      borderRadius: 8,
      padding: 3,
      marginBottom: 14,
    },
    pdTab: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 6,
      alignItems: "center",
    },
    pdTabActive: {
      backgroundColor: colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    pdTabText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    pdTabTextActive: {
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    pdField: {
      flex: 1,
    },
    pdMonoRow: {
      flexDirection: "row",
      gap: 12,
    },
    pdLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    pdInput: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
      backgroundColor: colors.surface,
    },
    lensGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    lensChip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.card,
    },
    lensChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    lensChipText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    lensChipTextActive: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    notesInput: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      minHeight: 100,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
  });
