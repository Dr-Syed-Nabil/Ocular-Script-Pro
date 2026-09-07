import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrescriptionCard } from "@/components/PrescriptionCard";
import { SearchBar } from "@/components/SearchBar";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function PrescriptionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { prescriptions } = useData();
  const [query, setQuery] = useState("");
  const s = styles(colors);

  const filtered = useMemo(() => {
    if (!query.trim()) return prescriptions;
    const q = query.toLowerCase();
    return prescriptions.filter((r) =>
      r.patientName.toLowerCase().includes(q)
      || (r.patientPhone || "").toLowerCase().includes(q)
      || (r.patientPuid || "").toLowerCase().includes(q)
    );
  }, [prescriptions, query]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Prescriptions</Text>
          <Text style={s.sub}>{prescriptions.length} total</Text>
        </View>
        <TouchableOpacity
          style={s.newBtn}
          onPress={() => router.push("/new-rx")}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name, phone, or PUID" />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PrescriptionCard prescription={item} />}
        contentContainerStyle={[
          s.list,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="file-text" size={44} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>No prescriptions yet</Text>
            <Text style={s.emptySub}>Tap + to write your first Rx</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 14,
      paddingTop: 8,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    sub: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
    newBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    list: {
      paddingTop: 4,
    },
    empty: {
      alignItems: "center",
      marginTop: 80,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    emptySub: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
