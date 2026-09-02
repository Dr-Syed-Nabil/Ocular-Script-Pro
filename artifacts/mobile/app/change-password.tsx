import { Feather } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function ChangePasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const hasPassword = user?.passwordEnabled ?? true;

  const updatePassword = async () => {
    setErrorMessage("");
    setNotice("");
    if (hasPassword && !currentPassword) {
      setErrorMessage("Enter your current password.");
      return;
    }
    if (newPassword.length < 9) {
      setErrorMessage("Password must be at least 9 characters.");
      return;
    }
    if (newPassword !== confirmation) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (!user) {
      setErrorMessage("Your account is still loading. Please try again.");
      return;
    }

    setLoading(true);
    try {
      await user.updatePassword({
        ...(hasPassword ? { currentPassword } : {}),
        newPassword,
        signOutOfOtherSessions: true,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setNotice("Your password has been updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We couldn't update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const inputStyle = {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    height: 48,
    color: colors.foreground,
    backgroundColor: colors.surface,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 15,
  } as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={21} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Change password</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Keep your OptiScript account secure</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {hasPassword ? "Update your password" : "Set a password"}
          </Text>
          <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
            {hasPassword ? "Enter your current password, then choose a new one." : "Add a password so you can also sign in with email."}
          </Text>

          {errorMessage ? <Text style={[styles.error, { color: colors.destructive }]}>{errorMessage}</Text> : null}
          {notice ? <Text style={[styles.notice, { color: colors.success }]}>{notice}</Text> : null}

          {hasPassword ? (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>Current password</Text>
              <TextInput
                style={inputStyle}
                secureTextEntry
                autoComplete="current-password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Your current password"
                placeholderTextColor={colors.mutedForeground}
              />
            </>
          ) : null}

          <Text style={[styles.label, { color: colors.foreground }]}>New password</Text>
          <TextInput
            style={inputStyle}
            secureTextEntry
            autoComplete="new-password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 9 characters"
            placeholderTextColor={colors.mutedForeground}
          />

          <Text style={[styles.label, { color: colors.foreground }]}>Confirm new password</Text>
          <TextInput
            style={inputStyle}
            secureTextEntry
            autoComplete="new-password"
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="Re-enter your password"
            placeholderTextColor={colors.mutedForeground}
          />

          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: loading ? 0.55 : pressed ? 0.85 : 1 }]}
            onPress={updatePassword}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update password</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 20 },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 6 },
  helpText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 20 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 7 },
  error: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginBottom: 12 },
  notice: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_500Medium", marginBottom: 12 },
  button: { minHeight: 48, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 3 },
  buttonText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});