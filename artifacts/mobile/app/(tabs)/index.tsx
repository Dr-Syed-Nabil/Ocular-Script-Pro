import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { Prescription } from "@/types";

type Filter = "All" | "Needs review" | "Recent";

function formatToday(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).toUpperCase();
}

function formatTime(rx: Prescription): string {
  const source = rx.createdAt || `${rx.date}T09:00:00`;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(rx: Prescription): number {
  const date = new Date(rx.createdAt || rx.date);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function needsReview(rx: Prescription): boolean {
  return !rx.patientPuid
    || (!rx.diagnosis
      && !rx.drugs.length
      && !rx.rightEyeDistance.dsp
      && !rx.leftEyeDistance.dsp
      && !rx.advice
      && !rx.followUp);
}

function lensLabel(rx: Prescription): string {
  if (rx.lensType) {
    if (rx.lensType === "Progressive") return "Progressive";
    if (rx.lensType === "Monofocal") return "Monofocal";
    if (rx.lensType === "Bifocal") return "Bifocal";
    return rx.lensType;
  }
  if (rx.drugs.length) return "Medication";
  return "Clinical visit";
}

function rxSummary(rx: Prescription): string {
  const distance = rx.rightEyeDistance;
  const left = rx.leftEyeDistance;
  const values = [
    distance.dsp && `RE ${distance.dsp}`,
    distance.dcyl && distance.dcyl !== "0.00" ? distance.dcyl : "",
    left.dsp && `LE ${left.dsp}`,
  ].filter(Boolean);
  return values.length ? values.join(" / ") : rx.drugs[0]?.name || "Clinical review";
}

function visitNote(rx: Prescription): string {
  return rx.chiefComplaints || rx.diagnosis || rx.advice || "Prescription visit";
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";
}

export default function PrescriptionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { prescriptions, doctor, loading } = useData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const s = styles(colors);

  const reviewCount = useMemo(() => prescriptions.filter(needsReview).length, [prescriptions]);
  const followUpCount = useMemo(() => prescriptions.filter((rx) => Boolean(rx.followUp)).length, [prescriptions]);
  const doctorName = (doctor.nameEn || "Doctor").replace(/^dr\.?\s*/i, "").trim() || "Doctor";
  const doctorInitials = initials(doctor.nameEn || doctor.nameBn || "Doctor");

  const visiblePrescriptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...prescriptions]
      .sort((a, b) => formatDate(b) - formatDate(a))
      .filter((rx) => {
        const matchesQuery = !normalized
          || `${rx.patientName} ${rx.patientPhone || ""} ${rx.patientPuid || ""} ${rxSummary(rx)} ${lensLabel(rx)}`
            .toLowerCase()
            .includes(normalized);
        const matchesFilter = filter === "All"
          || (filter === "Needs review" && needsReview(rx))
          || (filter === "Recent" && formatDate(rx) >= Date.now() - 7 * 24 * 60 * 60 * 1000);
        return matchesQuery && matchesFilter;
      });
  }, [filter, prescriptions, query]);

  const cycleFilter = () => {
    setFilter((current) => current === "All" ? "Needs review" : current === "Needs review" ? "Recent" : "All");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <FlatList
        data={visiblePrescriptions}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.list, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 86 }]}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.heroTopline}>
                <View style={s.brandMark}>
                  <View style={s.brandDot} />
                  <Text style={s.brandText}>OPTISCRIPT</Text>
                </View>
                <TouchableOpacity
                  style={s.profileButton}
                  onPress={() => router.push("/settings")}
                  accessibilityLabel="Open profile"
                >
                  <Text style={s.profileButtonText}>{doctorInitials.slice(0, 2)}</Text>
                </TouchableOpacity>
              </View>

              <View style={s.greetingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.eyebrow}>{formatToday()}</Text>
                  <Text style={s.greeting}>Good morning,{"\n"}<Text style={s.greetingItalic}>Dr. {doctorName}.</Text></Text>
                </View>
                <View style={s.clinicBadge}>
                  <View style={s.liveDot} />
                  <Text style={s.clinicBadgeText}>Clinic open</Text>
                </View>
              </View>

              <View style={s.statsRow}>
                <View>
                  <Text style={s.statNumber}>{prescriptions.length}</Text>
                  <Text style={s.statLabel}>prescriptions</Text>
                </View>
                <View style={s.statDivider} />
                <View>
                  <Text style={s.statNumber}>{String(reviewCount).padStart(2, "0")}</Text>
                  <Text style={s.statLabel}>need review</Text>
                </View>
                <TouchableOpacity style={s.newButton} onPress={() => router.push("/new-rx")} activeOpacity={0.8}>
                  <Feather name="plus" size={16} color={colors.clinicalHero} />
                  <Text style={s.newButtonText}>New Rx</Text>
                </TouchableOpacity>
              </View>

              <View style={s.searchBox}>
                <Feather name="search" size={17} color={colors.clinicalInkMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search patient, PUID, or Rx"
                  placeholderTextColor={colors.clinicalInkMuted}
                  style={s.searchInput}
                  accessibilityLabel="Search prescriptions"
                />
                <TouchableOpacity style={s.searchAction} onPress={cycleFilter} accessibilityLabel="Cycle prescription filter">
                  <Feather name="sliders" size={16} color={colors.clinicalAccentStrong} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.contentHeader}>
              <View>
                <Text style={s.sectionKicker}>YOUR WORKSPACE</Text>
                <Text style={s.sectionTitle}>Recent prescriptions</Text>
              </View>
              <TouchableOpacity
                style={s.moreButton}
                onPress={() => router.push("/prescription-settings")}
                accessibilityLabel="Open prescription settings"
              >
                <Feather name="more-horizontal" size={19} color={colors.clinicalInkMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.filterRail}>
              {(["All", "Needs review", "Recent"] as Filter[]).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[s.filterButton, filter === item && s.filterButtonActive]}
                  onPress={() => setFilter(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === item }}
                >
                  <Text style={[s.filterText, filter === item && s.filterTextActive]}>{item}</Text>
                  {item === "Needs review" && reviewCount > 0 ? (
                    <View style={s.filterCount}><Text style={s.filterCountText}>{reviewCount}</Text></View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        renderItem={({ item }) => {
          const expanded = expandedId === item.id;
          const review = needsReview(item);
          return (
            <View style={[s.prescriptionRow, expanded && s.prescriptionRowSelected]}>
              <TouchableOpacity
                style={s.rowMain}
                onPress={() => setExpandedId(expanded ? null : item.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
              >
                <View style={s.dateRail}>
                  <Text style={s.dateTime}>{formatTime(item)}</Text>
                  <View style={s.dateLine} />
                </View>
                <View style={[s.avatar, { backgroundColor: item.id.charCodeAt(0) % 2 ? colors.secondary : colors.clinicalSoftAlt }]}>
                  <Text style={s.avatarText}>{initials(item.patientName)}</Text>
                </View>
                <View style={s.rowCopy}>
                  <View style={s.nameLine}>
                    <Text style={s.patientName} numberOfLines={1}>{item.patientName}</Text>
                    {review ? <View style={s.reviewDot} /> : null}
                  </View>
                  <Text style={s.metaLine} numberOfLines={1}>{item.patientAge || "Age not recorded"}  ·  {lensLabel(item)}</Text>
                  <Text style={s.rxLine} numberOfLines={1}>{rxSummary(item)}</Text>
                </View>
                <Feather name="chevron-right" size={17} color={colors.clinicalInkMuted} style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }} />
              </TouchableOpacity>
              {expanded ? (
                <View style={s.expandedRow}>
                  <View style={s.noteBlock}>
                    <Text style={s.noteLabel}>VISIT NOTE</Text>
                    <Text style={s.noteText} numberOfLines={1}>{visitNote(item)}</Text>
                  </View>
                  <TouchableOpacity style={s.openButton} onPress={() => router.push(`/prescription/${item.id}`)}>
                    <Text style={s.openButtonText}>Open Rx</Text>
                    <Feather name="arrow-up-right" size={15} color={colors.clinicalAccentStrong} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Feather name={loading ? "loader" : "file-text"} size={25} color={colors.clinicalInkMuted} />
            <Text style={s.emptyTitle}>{loading ? "Loading prescriptions" : "No matching prescriptions"}</Text>
            <Text style={s.emptySub}>{loading ? "Preparing your workspace…" : "Try a different name or filter."}</Text>
          </View>
        }
        ListFooterComponent={
          followUpCount > 0 ? (
            <View style={s.queueCard}>
              <View style={s.queueIcon}><Feather name="clock" size={17} color={colors.clinicalAccentStrong} /></View>
              <View style={s.queueCopy}>
                <Text style={s.queueTitle}>Follow-up queue</Text>
                <Text style={s.queueText}>{followUpCount} scheduled prescription{followUpCount === 1 ? "" : "s"} to review</Text>
              </View>
              <Feather name="check-circle" size={18} color={colors.clinicalAccentStrong} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.clinicalCanvas },
  list: { paddingBottom: 20 },
  hero: {
    backgroundColor: colors.clinicalHero,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  brandMark: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.clinicalAccent },
  brandText: { color: colors.clinicalAccent, fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.8 },
  profileButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "rgba(246,248,246,0.25)", backgroundColor: "rgba(246,248,246,0.08)", alignItems: "center", justifyContent: "center" },
  profileButtonText: { color: colors.clinicalCanvas, fontSize: 10, fontFamily: "Inter_700Bold" },
  greetingRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  eyebrow: { color: colors.clinicalHeroMuted, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },
  greeting: { color: colors.clinicalCanvas, fontSize: 29, lineHeight: 31, marginTop: 8, fontFamily: "serif" },
  greetingItalic: { fontStyle: "italic" },
  clinicBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: "rgba(126,217,200,0.28)", borderRadius: 18, paddingHorizontal: 9, paddingVertical: 6, marginTop: 1 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.clinicalAccent },
  clinicBadgeText: { color: "#B8DBD6", fontSize: 9, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 24 },
  statNumber: { color: colors.clinicalCanvas, fontSize: 24, lineHeight: 26, fontFamily: "serif" },
  statLabel: { color: "#91B1B5", fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 4 },
  statDivider: { width: 1, height: 31, backgroundColor: "rgba(246,248,246,0.18)" },
  newButton: { flexDirection: "row", alignItems: "center", gap: 7, marginLeft: "auto", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: colors.clinicalAccent },
  newButtonText: { color: colors.clinicalHero, fontSize: 11, fontFamily: "Inter_700Bold" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 9, height: 44, marginTop: 21, paddingLeft: 13, paddingRight: 7, borderRadius: 12, backgroundColor: colors.clinicalCanvas },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 0, color: colors.clinicalHero, fontFamily: "Inter_400Regular", fontSize: 11 },
  searchAction: { width: 31, height: 31, borderRadius: 8, backgroundColor: colors.clinicalSoftAlt, alignItems: "center", justifyContent: "center" },
  contentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 18, paddingTop: 24 },
  sectionKicker: { color: colors.clinicalInkMuted, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  sectionTitle: { color: colors.clinicalHero, fontSize: 23, lineHeight: 26, marginTop: 5, fontFamily: "serif" },
  moreButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.clinicalCardBorder, alignItems: "center", justifyContent: "center" },
  filterRail: { flexDirection: "row", gap: 7, paddingHorizontal: 18, marginTop: 18, marginBottom: 14 },
  filterButton: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.clinicalSoftAlt },
  filterButtonActive: { backgroundColor: colors.clinicalHero },
  filterText: { color: "#6B858B", fontSize: 10, fontFamily: "Inter_700Bold" },
  filterTextActive: { color: colors.clinicalCanvas },
  filterCount: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.clinicalWarning, alignItems: "center", justifyContent: "center" },
  filterCountText: { color: "#FFF8F3", fontSize: 9, fontFamily: "Inter_700Bold" },
  prescriptionRow: { overflow: "hidden", marginHorizontal: 18, marginBottom: 9, borderWidth: 1, borderColor: colors.clinicalCardBorder, borderRadius: 15, backgroundColor: "#FBFCFA" },
  prescriptionRowSelected: { borderColor: "#9DD9CD", backgroundColor: "#F8FCFA" },
  rowMain: { flexDirection: "row", alignItems: "center", width: "100%", paddingVertical: 11, paddingRight: 11 },
  dateRail: { width: 48, alignSelf: "stretch", alignItems: "center", paddingTop: 2 },
  dateTime: { color: "#94A8AA", fontSize: 9, fontFamily: "Inter_700Bold" },
  dateLine: { width: 1, flex: 1, marginTop: 8, backgroundColor: "#DCE8E5" },
  avatar: { width: 37, height: 37, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#245263", fontSize: 10, fontFamily: "Inter_700Bold" },
  rowCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  patientName: { flexShrink: 1, color: colors.clinicalHero, fontSize: 14, fontFamily: "Inter_700Bold" },
  reviewDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.clinicalWarning },
  metaLine: { color: "#84999E", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3 },
  rxLine: { color: "#2C6873", fontSize: 10, fontFamily: "Inter_700Bold", marginTop: 7 },
  expandedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12, paddingLeft: 59, paddingRight: 13, paddingBottom: 13, borderTopWidth: 1, borderStyle: "dashed", borderColor: "#DCE8E5" },
  noteBlock: { flex: 1, minWidth: 0, paddingTop: 10 },
  noteLabel: { color: "#9AADAe", fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  noteText: { color: "#547079", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4 },
  openButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 10 },
  openButtonText: { color: colors.clinicalAccentStrong, fontSize: 10, fontFamily: "Inter_700Bold" },
  queueCard: { flexDirection: "row", alignItems: "center", gap: 11, marginHorizontal: 18, marginTop: 8, paddingHorizontal: 13, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.clinicalSoft },
  queueIcon: { width: 31, height: 31, borderRadius: 9, backgroundColor: "#C9E9E1", alignItems: "center", justifyContent: "center" },
  queueCopy: { flex: 1, minWidth: 0 },
  queueTitle: { color: colors.clinicalHero, fontSize: 12, fontFamily: "Inter_700Bold" },
  queueText: { color: "#547079", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyState: { alignItems: "center", marginTop: 72, paddingHorizontal: 30, gap: 8 },
  emptyTitle: { color: colors.clinicalHero, fontSize: 16, fontFamily: "Inter_700Bold" },
  emptySub: { color: colors.clinicalInkMuted, fontSize: 13, fontFamily: "Inter_400Regular" },
});