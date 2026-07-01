import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Patient } from "@/types";

interface Props {
  patient: Patient;
  rxCount?: number;
  onPress?: () => void;
}

export function PatientCard({ patient, rxCount = 0, onPress }: Props) {
  const colors = useColors();
  const s = styles(colors);

  const handlePress = onPress ?? (() => router.push(`/patient/${patient.id}`));
  const initials = patient.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <TouchableOpacity style={s.card} onPress={handlePress} activeOpacity={0.75}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>
      <View style={s.info}>
        <Text style={s.name}>{patient.name}</Text>
        <Text style={s.sub}>
          {patient.dob ? `DOB: ${patient.dob}` : "No DOB"}{" "}
          {patient.gender ? `· ${patient.gender}` : ""}
        </Text>
        {patient.phone ? <Text style={s.phone}>{patient.phone}</Text> : null}
      </View>
      <View style={s.right}>
        {rxCount > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{rxCount}</Text>
            <Text style={s.badgeLabel}> Rx</Text>
          </View>
        )}
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
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
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
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
    info: {
      flex: 1,
      marginLeft: 12,
    },
    name: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    sub: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 1,
      fontFamily: "Inter_400Regular",
    },
    phone: {
      fontSize: 12,
      color: colors.accent,
      marginTop: 1,
      fontFamily: "Inter_400Regular",
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.secondary,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    badgeLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
