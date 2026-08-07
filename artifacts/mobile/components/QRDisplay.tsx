import React from "react";
import { View, Text } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useColors } from "@/hooks/useColors";

interface QRDisplayProps {
  value: string;
  size?: number;
  label?: string;
  /** Visit label shown below the PUID, e.g. "V1NEW" or "V2F/U" */
  visitLabel?: string;
}

export function QRDisplay({ value, size = 100, label, visitLabel }: QRDisplayProps) {
  const colors = useColors();

  // Style visit label differently for NEW vs F/U
  const isNew = visitLabel && !visitLabel.includes("F/U");
  const visitColor = isNew ? colors.success : colors.primary;

  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <View style={{
        padding: 8,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <QRCode
          value={value}
          size={size}
          color="#0D1B2A"
          backgroundColor="#ffffff"
          ecl="M"
        />
      </View>
      {label ? (
        <Text style={{
          fontSize: 11,
          fontFamily: "Inter_600SemiBold",
          color: colors.mutedForeground,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}>{label}</Text>
      ) : null}
      {visitLabel ? (
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          backgroundColor: isNew
            ? (colors.success + "18")
            : (colors.primary + "15"),
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: visitColor + "40",
        }}>
          <Text style={{
            fontSize: 12,
            fontFamily: "Inter_700Bold",
            color: visitColor,
            letterSpacing: 0.8,
          }}>{visitLabel}</Text>
          <Text style={{
            fontSize: 10,
            fontFamily: "Inter_400Regular",
            color: visitColor,
            opacity: 0.85,
          }}>
            {visitLabel.includes("F/U") ? "Follow-up" : "New Visit"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
