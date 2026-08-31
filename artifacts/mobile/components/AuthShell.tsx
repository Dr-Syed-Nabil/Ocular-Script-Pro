import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 20 },
  logo: { width: 54, height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 12 },
  brand: { textAlign: "center", fontSize: 25, fontFamily: "Inter_700Bold" },
  tagline: { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 24 },
  card: { width: "100%", maxWidth: 430, alignSelf: "center", borderWidth: 1, borderRadius: 18, padding: 20, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
});

export function AuthShell({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Feather name="eye" size={25} color="#fff" />
        </View>
        <Text style={[styles.brand, { color: colors.foreground }]}>OptiScript</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Ophthalmology prescriptions, made simple
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const authStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    title: { color: colors.foreground, fontSize: 23, fontFamily: "Inter_700Bold", marginBottom: 6 },
    subtitle: { color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 22 },
    label: { color: colors.foreground, fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 7 },
    input: { height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, color: colors.foreground, backgroundColor: colors.surface, fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 13 },
    button: { minHeight: 48, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, marginTop: 3 },
    buttonDisabled: { opacity: 0.55 },
    buttonText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
    secondaryButton: { minHeight: 46, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.border, marginTop: 12, flexDirection: "row" },
    secondaryButtonText: { color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" },
    divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_500Medium" },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
    footerText: { color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" },
    footerLink: { color: colors.primary, fontFamily: "Inter_700Bold" },
    error: { color: colors.destructive, fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginBottom: 10 },
    notice: { color: colors.mutedForeground, fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginBottom: 14 },
  });