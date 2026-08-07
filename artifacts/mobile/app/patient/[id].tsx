import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { QRDisplay } from "@/components/QRDisplay";
import { computeNextVisitLabel } from "@/utils/visitInfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrescriptionCard } from "@/components/PrescriptionCard";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { patients, deletePatient, getPrescriptionsForPatient } = useData();
  const s = styles(colors);

  const patient = patients.find((p) => p.id === id);
  const prescriptions = getPrescriptionsForPatient(id ?? "");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!patient) {
    return (
      <View style={[s.container, { paddingTop: topPad }]}>
        <TouchableOpacity style={s.navIconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.notFound}>
          <Text style={s.notFoundText}>Patient not found.</Text>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Patient",
      `Delete ${patient.name} and all their data?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deletePatient(patient.id);
            router.back();
          },
        },
      ]
    );
  };

  const initials = patient.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  const visitLabel = computeNextVisitLabel(prescriptions);

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.navBar}>
        <TouchableOpacity style={s.navIconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.navTitle}>Patient</Text>
        <TouchableOpacity style={s.navIconBtn} onPress={handleDelete}>
          <Feather name="trash-2" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={prescriptions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View style={s.profileCard}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
              <Text style={s.patientName}>{patient.name}</Text>
              {patient.gender ? (
                <Text style={s.patientSub}>{patient.gender}</Text>
              ) : null}

              <View style={s.infoRow}>
                {patient.dob ? (
                  <View style={s.infoChip}>
                    <Feather name="calendar" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={s.infoChipText}>{patient.dob}</Text>
                  </View>
                ) : null}
                {patient.phone ? (
                  <View style={s.infoChip}>
                    <Feather name="phone" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={s.infoChipText}>{patient.phone}</Text>
                  </View>
                ) : null}
              </View>

              {/* PUID + QR */}
              {patient.puid ? (
                <View style={{ alignItems: "center", marginTop: 16, marginBottom: 4, padding: 14, backgroundColor: colors.secondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, width: "100%" }}>
                  <QRDisplay value={patient.puid} size={90} visitLabel={visitLabel} />
                  <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Feather name="hash" size={12} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.primary, letterSpacing: 1.5 }}>{patient.puid}</Text>
                  </View>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 3 }}>Scan on follow-up visit to auto-select patient</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={s.newRxBtn}
                onPress={() => router.push("/new-rx")}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={s.newRxBtnText}>New Prescription</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionTitle}>
              Prescription History ({prescriptions.length})
            </Text>
          </>
        }
        renderItem={({ item }) => <PrescriptionCard prescription={item} />}
        contentContainerStyle={[
          s.list,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="file-text" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No prescriptions yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 8,
      paddingTop: 4,
    },
    navIconBtn: {
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
    list: { paddingTop: 8 },
    profileCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      marginHorizontal: 16,
      marginBottom: 20,
      padding: 20,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    patientName: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    patientSub: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    infoRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
      marginTop: 12,
    },
    infoChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.secondary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    infoChipText: {
      fontSize: 12,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    newRxBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 10,
      marginTop: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    newRxBtnText: {
      color: "#fff",
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 10,
      marginLeft: 16,
    },
    empty: { alignItems: "center", marginTop: 32, gap: 8 },
    emptyText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
    notFoundText: {
      fontSize: 16,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
