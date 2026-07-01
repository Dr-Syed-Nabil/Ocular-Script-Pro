import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { EyePrescription } from "@/types";

const VA_OPTIONS = ["6/6", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60", "CF", "HM", "PL", "NPL"];

interface Props {
  label: string;
  value: EyePrescription;
  onChange: (val: EyePrescription) => void;
}

export function EyeInputGroup({ label, value, onChange }: Props) {
  const colors = useColors();
  const s = styles(colors);

  const update = (field: keyof EyePrescription, v: string) =>
    onChange({ ...value, [field]: v });

  return (
    <View style={s.container}>
      <View style={s.labelRow}>
        <View style={s.labelDot} />
        <Text style={s.label}>{label}</Text>
      </View>

      <View style={s.grid}>
        <View style={s.field}>
          <Text style={s.fieldLabel}>SPH</Text>
          <TextInput
            style={s.input}
            value={value.sphere}
            onChangeText={(t) => update("sphere", t)}
            placeholder="+0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
          />
        </View>
        <View style={s.field}>
          <Text style={s.fieldLabel}>CYL</Text>
          <TextInput
            style={s.input}
            value={value.cylinder}
            onChangeText={(t) => update("cylinder", t)}
            placeholder="-0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
          />
        </View>
        <View style={s.field}>
          <Text style={s.fieldLabel}>AXIS</Text>
          <TextInput
            style={s.input}
            value={value.axis}
            onChangeText={(t) => update("axis", t)}
            placeholder="°"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
          />
        </View>
        <View style={s.field}>
          <Text style={s.fieldLabel}>ADD</Text>
          <TextInput
            style={s.input}
            value={value.addPower}
            onChangeText={(t) => update("addPower", t)}
            placeholder="+0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={s.vaRow}>
        <Text style={s.fieldLabel}>VA</Text>
        <View style={s.vaChips}>
          {VA_OPTIONS.map((va) => (
            <TouchableOpacity
              key={va}
              style={[s.vaChip, value.va === va && s.vaChipActive]}
              onPress={() => update("va", value.va === va ? "" : va)}
            >
              <Text
                style={[s.vaChipText, value.va === va && s.vaChipTextActive]}
              >
                {va}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    labelDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginRight: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.3,
    },
    grid: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    field: {
      flex: 1,
    },
    fieldLabel: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
      backgroundColor: colors.surface,
      textAlign: "center",
    },
    vaRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    vaChips: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    vaChip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.surface,
    },
    vaChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    vaChipText: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    vaChipTextActive: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
  });
