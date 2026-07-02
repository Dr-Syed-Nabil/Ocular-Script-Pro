import React from "react";
import { View, Text } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useColors } from "@/hooks/useColors";

interface QRDisplayProps {
  value: string;
  size?: number;
  label?: string;
}

export function QRDisplay({ value, size = 100, label }: QRDisplayProps) {
  const colors = useColors();
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
    </View>
  );
}
