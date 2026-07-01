import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const BASE_OPTIONS = [
  "6/6", "6/6P", "6/9", "6/9P", "6/12",
  "6/18", "6/24", "6/36", "6/60",
  "CF", "HM", "PL",
];
const EXTRA_OPTIONS = ["NI"]; // only for PH and BCVA

interface Props {
  value: string;
  onChange: (v: string) => void;
  fieldLabel: string;
  eyeLabel: string;
  includeNI?: boolean;
}

export function VAPicker({ value, onChange, fieldLabel, eyeLabel, includeNI = false }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const s = styles(colors);
  const [open, setOpen] = useState(false);

  const options = includeNI ? [...BASE_OPTIONS, ...EXTRA_OPTIONS] : BASE_OPTIONS;

  const handleSelect = (opt: string) => {
    onChange(value === opt ? "" : opt);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[s.trigger, value ? s.triggerFilled : s.triggerEmpty]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={value ? s.triggerTextFilled : s.triggerTextEmpty}>
          {value || "—"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>
              {eyeLabel} · {fieldLabel}
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={s.grid}>
            {options.map((opt) => {
              const active = value === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => handleSelect(opt)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
            {value ? (
              <TouchableOpacity
                style={[s.chip, s.clearChip]}
                onPress={() => { onChange(""); setOpen(false); }}
              >
                <Text style={s.clearChipText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    trigger: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: 7,
      paddingVertical: 8,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 2,
    },
    triggerEmpty: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    triggerFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    triggerTextEmpty: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    triggerTextFilled: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 12,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    chip: {
      minWidth: 64,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    chipText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    chipTextActive: {
      color: "#fff",
    },
    clearChip: {
      borderColor: colors.destructive + "60",
      backgroundColor: colors.destructive + "10",
    },
    clearChipText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.destructive,
    },
  });
