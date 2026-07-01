import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Prescription } from "@/types";

interface Props {
  prescription: Prescription;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function eyeSummary(eye: Prescription["rightEye"]): string {
  const parts: string[] = [];
  if (eye.sphere) parts.push(`SPH ${eye.sphere}`);
  if (eye.cylinder) parts.push(`CYL ${eye.cylinder}`);
  if (eye.axis) parts.push(`Ax ${eye.axis}°`);
  return parts.join("  ") || "Plano";
}

export function PrescriptionCard({ prescription }: Props) {
  const colors = useColors();
  const s = styles(colors);

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push(`/prescription/${prescription.id}`)}
      activeOpacity={0.75}
    >
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {prescription.patientName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={s.headerText}>
          <Text style={s.name}>{prescription.patientName}</Text>
          <Text style={s.date}>{formatDate(prescription.date)}</Text>
        </View>
        <View style={s.lensTag}>
          <Text style={s.lensText}>{prescription.lensType || "SV"}</Text>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.eyeRow}>
        <View style={s.eyeBlock}>
          <Text style={s.eyeLabel}>RE (OD)</Text>
          <Text style={s.eyeValue} numberOfLines={1}>
            {eyeSummary(prescription.rightEye)}
          </Text>
        </View>
        <View style={s.eyeSep} />
        <View style={s.eyeBlock}>
          <Text style={s.eyeLabel}>LE (OS)</Text>
          <Text style={s.eyeValue} numberOfLines={1}>
            {eyeSummary(prescription.leftEye)}
          </Text>
        </View>
      </View>

      <Feather
        name="chevron-right"
        size={16}
        color={colors.mutedForeground}
        style={s.chevron}
      />
    </TouchableOpacity>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    headerText: {
      flex: 1,
      marginLeft: 10,
    },
    name: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    date: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 1,
      fontFamily: "Inter_400Regular",
    },
    lensTag: {
      backgroundColor: colors.secondary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    lensText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: "600",
      fontFamily: "Inter_600SemiBold",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 10,
    },
    eyeRow: {
      flexDirection: "row",
    },
    eyeBlock: {
      flex: 1,
    },
    eyeSep: {
      width: 1,
      backgroundColor: colors.border,
      marginHorizontal: 12,
    },
    eyeLabel: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    eyeValue: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    chevron: {
      position: "absolute",
      right: 14,
      bottom: 14,
    },
  });
