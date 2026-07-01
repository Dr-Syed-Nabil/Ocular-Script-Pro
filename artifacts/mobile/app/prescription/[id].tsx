import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { EyePrescription } from "@/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function EyeRow({
  label,
  eye,
  colors,
}: {
  label: string;
  eye: EyePrescription;
  colors: ReturnType<typeof useColors>;
}) {
  const s = eyeStyles(colors);
  const hasData =
    eye.sphere || eye.cylinder || eye.axis || eye.addPower || eye.va;

  return (
    <View style={s.eyeCard}>
      <View style={s.eyeHeader}>
        <View style={s.eyeDot} />
        <Text style={s.eyeLabel}>{label}</Text>
        {eye.va ? (
          <View style={s.vaTag}>
            <Text style={s.vaTagText}>VA {eye.va}</Text>
          </View>
        ) : null}
      </View>
      {hasData ? (
        <View style={s.eyeGrid}>
          <EyeField label="SPH" value={eye.sphere || "—"} colors={colors} />
          <EyeField label="CYL" value={eye.cylinder || "—"} colors={colors} />
          <EyeField label="AXIS" value={eye.axis ? `${eye.axis}°` : "—"} colors={colors} />
          <EyeField label="ADD" value={eye.addPower || "—"} colors={colors} />
        </View>
      ) : (
        <Text style={s.noData}>No data entered</Text>
      )}
    </View>
  );
}

function EyeField({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  const s = eyeStyles(colors);
  return (
    <View style={s.eyeFieldBlock}>
      <Text style={s.efLabel}>{label}</Text>
      <Text style={s.efValue}>{value}</Text>
    </View>
  );
}

const eyeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    eyeCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    eyeHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    eyeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginRight: 8,
    },
    eyeLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    vaTag: {
      backgroundColor: colors.secondary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    vaTagText: {
      fontSize: 11,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    eyeGrid: {
      flexDirection: "row",
      gap: 8,
    },
    eyeFieldBlock: {
      flex: 1,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingVertical: 10,
    },
    efLabel: {
      fontSize: 9,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    efValue: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    noData: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
    },
  });

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { prescriptions, deletePrescription, doctor } = useData();
  const s = styles(colors);

  const prescription = prescriptions.find((r) => r.id === id);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!prescription) {
    return (
      <View style={[s.container, { paddingTop: topPad }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.notFound}>
          <Text style={s.notFoundText}>Prescription not found.</Text>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Prescription",
      "Are you sure you want to delete this prescription? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deletePrescription(prescription.id);
            router.back();
          },
        },
      ]
    );
  };

  const pd =
    prescription.pdMode === "binocular"
      ? prescription.pdBinocular
        ? `${prescription.pdBinocular} mm`
        : "—"
      : prescription.pdRight && prescription.pdLeft
      ? `R: ${prescription.pdRight}  /  L: ${prescription.pdLeft} mm`
      : "—";

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.navBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.navTitle} numberOfLines={1}>
          {prescription.patientName}
        </Text>
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
          <Feather name="trash-2" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.meta}>
          <View style={s.metaAvatar}>
            <Text style={s.metaAvatarText}>
              {prescription.patientName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={s.metaInfo}>
            <Text style={s.metaName}>{prescription.patientName}</Text>
            <Text style={s.metaDate}>{formatDate(prescription.date)}</Text>
            {prescription.lensType ? (
              <View style={s.lensTag}>
                <Text style={s.lensTagText}>{prescription.lensType}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={s.sectionTitle}>Prescription</Text>
        <EyeRow label="Right Eye (OD)" eye={prescription.rightEye} colors={colors} />
        <EyeRow label="Left Eye (OS)" eye={prescription.leftEye} colors={colors} />

        <Text style={s.sectionTitle}>Pupillary Distance</Text>
        <View style={s.infoCard}>
          <Feather name="maximize" size={16} color={colors.primary} style={{ marginRight: 10 }} />
          <Text style={s.infoValue}>{pd}</Text>
        </View>

        {prescription.notes ? (
          <>
            <Text style={s.sectionTitle}>Clinical Notes</Text>
            <View style={s.notesCard}>
              <Text style={s.notesText}>{prescription.notes}</Text>
            </View>
          </>
        ) : null}

        {(doctor.name || doctor.clinic) && (
          <View style={s.doctorFooter}>
            <Feather name="user" size={14} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            <View>
              {doctor.name ? (
                <Text style={s.doctorName}>
                  {doctor.name}
                  {doctor.qualification ? `, ${doctor.qualification}` : ""}
                </Text>
              ) : null}
              {doctor.regNumber ? (
                <Text style={s.doctorReg}>Reg. No: {doctor.regNumber}</Text>
              ) : null}
              {doctor.clinic ? (
                <Text style={s.doctorClinic}>{doctor.clinic}</Text>
              ) : null}
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
    deleteBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    scroll: { paddingHorizontal: 16 },
    meta: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 8,
    },
    metaAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    metaAvatarText: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    metaInfo: { flex: 1 },
    metaName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    metaDate: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    lensTag: {
      marginTop: 6,
      alignSelf: "flex-start",
      backgroundColor: colors.secondary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    lensTagText: {
      fontSize: 11,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 18,
      marginBottom: 8,
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
    },
    infoValue: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    notesCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
    },
    notesText: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      lineHeight: 22,
    },
    doctorFooter: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: 20,
      padding: 14,
      backgroundColor: colors.secondary,
      borderRadius: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    doctorName: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    doctorReg: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
    doctorClinic: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
    notFound: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    notFoundText: {
      fontSize: 16,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
