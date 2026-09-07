import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PatientCard } from "@/components/PatientCard";
import { SearchBar } from "@/components/SearchBar";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function PatientsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { patients, prescriptions, addPatient } = useData();
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("");
  const [saving, setSaving] = useState(false);
  const s = styles(colors);

  const filtered = useMemo(() => {
    if (!query.trim()) return patients;
    const q = query.trim().toLowerCase();
    return patients.filter((p) =>
      p.name.toLowerCase().includes(q)
      || p.phone.toLowerCase().includes(q)
      || (p.puid || "").toLowerCase().includes(q)
    );
  }, [patients, query]);

  const getRxCount = (pid: string) =>
    prescriptions.filter((r) => r.patientId === pid).length;

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Patient name is required.");
      return;
    }
    setSaving(true);
    try {
      await addPatient({ name: name.trim(), dob, phone, email: "", gender });
      setShowModal(false);
      setName("");
      setDob("");
      setPhone("");
      setGender("");
    } finally {
      setSaving(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Patients</Text>
          <Text style={s.sub}>{patients.length} registered</Text>
        </View>
        <TouchableOpacity style={s.newBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
          <Feather name="user-plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name, phone, or PUID..." />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PatientCard patient={item} rxCount={getRxCount(item.id)} />
        )}
        contentContainerStyle={[
          s.list,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="users" size={44} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>No patients yet</Text>
            <Text style={s.emptySub}>Add your first patient to get started</Text>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { paddingTop: insets.top + 12 }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Patient</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={s.form}>
            <Text style={s.fieldLabel}>Full Name *</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rajesh Kumar"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />

            <Text style={s.fieldLabel}>Date of Birth</Text>
            <TextInput
              style={s.input}
              value={dob}
              onChangeText={setDob}
              placeholder="e.g. 15 Jan 1985"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={s.fieldLabel}>Phone</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={s.fieldLabel}>Gender</Text>
            <View style={s.genderRow}>
              {(["Male", "Female", "Other"] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[s.genderChip, gender === g && s.genderChipActive]}
                  onPress={() => setGender(gender === g ? "" : g)}
                >
                  <Text style={[s.genderText, gender === g && s.genderTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleAdd}
            disabled={saving}
          >
            <Text style={s.saveBtnText}>{saving ? "Saving..." : "Add Patient"}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 14,
      paddingTop: 8,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    sub: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
    newBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    list: { paddingTop: 4 },
    empty: { alignItems: "center", marginTop: 80, gap: 8 },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    emptySub: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    modal: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    form: { gap: 6 },
    fieldLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 12,
      marginBottom: 4,
    },
    input: {
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
    genderRow: { flexDirection: "row", gap: 10 },
    genderChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      backgroundColor: colors.card,
    },
    genderChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    genderText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    genderTextActive: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 32,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
  });
