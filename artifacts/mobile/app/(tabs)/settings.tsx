import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { doctor, updateDoctor } = useData();
  const s = styles(colors);

  const [name, setName] = useState(doctor.name);
  const [qualification, setQualification] = useState(doctor.qualification);
  const [regNumber, setRegNumber] = useState(doctor.regNumber);
  const [clinic, setClinic] = useState(doctor.clinic);
  const [phone, setPhone] = useState(doctor.phone);
  const [address, setAddress] = useState(doctor.address);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(doctor.name);
    setQualification(doctor.qualification);
    setRegNumber(doctor.regNumber);
    setClinic(doctor.clinic);
    setPhone(doctor.phone);
    setAddress(doctor.address);
  }, [doctor]);

  const handleSave = async () => {
    await updateDoctor({ name, qualification, regNumber, clinic, phone, address });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
        <Text style={s.sub}>Doctor & Clinic Details</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <View style={s.doctorIcon}>
            <Feather name="user" size={28} color={colors.primary} />
          </View>
          <Text style={s.cardTitle}>Doctor Information</Text>

          <View style={s.field}>
            <Text style={s.fieldLabel}>Full Name</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Dr. Firstname Lastname"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Qualifications</Text>
            <TextInput
              style={s.input}
              value={qualification}
              onChangeText={setQualification}
              placeholder="MBBS, MS (Ophthalmology)"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Registration Number</Text>
            <TextInput
              style={s.input}
              value={regNumber}
              onChangeText={setRegNumber}
              placeholder="e.g. MCI/12345"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Clinic / Hospital</Text>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Clinic Name</Text>
            <TextInput
              style={s.input}
              value={clinic}
              onChangeText={setClinic}
              placeholder="e.g. City Eye Clinic"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Contact Number</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +91 98765 43210"
              keyboardType="phone-pad"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Address</Text>
            <TextInput
              style={[s.input, s.multiline]}
              value={address}
              onChangeText={setAddress}
              placeholder="Full clinic address"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[s.saveBtn, saved && s.savedBtn]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Feather
            name={saved ? "check" : "save"}
            size={18}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={s.saveBtnText}>{saved ? "Saved!" : "Save Profile"}</Text>
        </TouchableOpacity>

        <View style={s.infoBox}>
          <Feather name="info" size={14} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={s.infoText}>
            Your profile details appear on every prescription you write.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
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
    scroll: { paddingHorizontal: 16, paddingTop: 4 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    doctorIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      marginBottom: 14,
    },
    field: { marginBottom: 12 },
    fieldLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      backgroundColor: colors.surface,
    },
    multiline: { minHeight: 80 },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 4,
    },
    savedBtn: { backgroundColor: colors.success },
    saveBtnText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.secondary,
      borderRadius: 10,
      padding: 12,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
  });
