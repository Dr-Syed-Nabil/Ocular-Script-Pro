import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Prescription } from "@/types";

interface Props {
  prescription: Prescription;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function rxSummary(rx: Prescription): string {
  const d = rx.rightEyeDistance;
  if (d.dsp || d.dcyl) {
    const parts = [];
    if (d.dsp) parts.push(`SPH ${d.dsp}`);
    if (d.dcyl) parts.push(`CYL ${d.dcyl}`);
    return `RE: ${parts.join(", ")}`;
  }
  return "No Rx entered";
}

function historyTags(rx: Prescription): string[] {
  const h = rx.pastHistory;
  if (!h) return [];
  return [
    h.dm && "DM", h.htn && "HTN", h.ihd && "IHD",
    h.ckd && "CKD", h.ba && "BA",
  ].filter(Boolean) as string[];
}

export function PrescriptionCard({ prescription: rx }: Props) {
  const colors = useColors();
  const s = styles(colors);
  const tags = historyTags(rx);

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push(`/prescription/${rx.id}`)}
      activeOpacity={0.75}
    >
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{rx.patientName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={s.headerText}>
          <Text style={s.name}>{rx.patientName}</Text>
          <Text style={s.date}>
            {rx.patientAge ? `${rx.patientAge}  ·  ` : ""}{formatDate(rx.date)}
          </Text>
        </View>
        <View style={s.rightCol}>
          {rx.lensType ? (
            <View style={s.lensTag}>
              <Text style={s.lensText}>
                {rx.lensType === "Progressive" ? "Prog" :
                  rx.lensType === "Monofocal" ? "Mono" :
                  rx.lensType === "Bifocal" ? "Bifocal" : rx.lensType}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={s.divider} />

      <Text style={s.rxSummary} numberOfLines={1}>{rxSummary(rx)}</Text>

      {(rx.chiefComplaints || tags.length > 0) && (
        <View style={s.footer}>
          {rx.chiefComplaints ? (
            <Text style={s.cc} numberOfLines={1}>
              CC: {rx.chiefComplaints}
            </Text>
          ) : null}
          {tags.length > 0 && (
            <View style={s.tagRow}>
              {tags.map((t) => (
                <View key={t} style={s.tag}>
                  <Text style={s.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <Feather name="chevron-right" size={15} color={colors.mutedForeground} style={s.chevron} />
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
    header: { flexDirection: "row", alignItems: "center" },
    avatar: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.secondary,
      alignItems: "center", justifyContent: "center",
    },
    avatarText: {
      fontSize: 16, fontFamily: "Inter_700Bold", color: colors.primary,
    },
    headerText: { flex: 1, marginLeft: 10 },
    name: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    date: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 },
    rightCol: { alignItems: "flex-end" },
    lensTag: {
      backgroundColor: colors.secondary, borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    lensText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.primary },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
    rxSummary: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    footer: { marginTop: 8, gap: 4 },
    cc: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, fontStyle: "italic" },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
    tag: {
      backgroundColor: "#FFF9E6", borderRadius: 4,
      paddingHorizontal: 6, paddingVertical: 2,
      borderWidth: 1, borderColor: "#FFD700",
    },
    tagText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#B8860B" },
    chevron: { position: "absolute", right: 14, top: 22 },
  });
