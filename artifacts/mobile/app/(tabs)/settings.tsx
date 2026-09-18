import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBiometricCredentials, useClerk, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.primary, marginBottom: 14 }}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyboard }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboard?: "default" | "phone-pad" | "email-address";
}) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>{label}</Text>
      <TextInput
        style={{
          borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 10,
          fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular",
          backgroundColor: colors.surface,
          ...(multiline ? { minHeight: 72, textAlignVertical: "top" } : {}),
        }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        keyboardType={keyboard ?? "default"}
        autoCorrect={false}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { doctor, updateDoctor, prescriptionConfig, updatePrescriptionConfig, syncStatus } = useData();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { getAvailability, list, enroll, revoke } = useBiometricCredentials();
  const router = useRouter();
  const s = styles(colors);

  const [form, setForm] = useState({ ...doctor });
  const [saved, setSaved] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricCredentialId, setBiometricCredentialId] = useState<string | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState("");

  useEffect(() => { setForm({ ...doctor }); }, [doctor]);

  useEffect(() => {
    let mounted = true;
    if (Platform.OS === "web") return () => { mounted = false; };
    void Promise.all([getAvailability(), list()]).then(([availability, credentials]) => {
      if (!mounted) return;
      setBiometricAvailable(availability.isAvailable);
      setBiometricCredentialId(credentials.find((credential) => credential.status === "active")?.id ?? null);
    }).catch(() => {
      if (mounted) setBiometricAvailable(false);
    });
    return () => { mounted = false; };
  }, [getAvailability, list]);

  const handleBiometricToggle = async () => {
    setBiometricMessage("");
    setBiometricBusy(true);
    try {
      if (biometricCredentialId) {
        await revoke(biometricCredentialId);
        setBiometricCredentialId(null);
        setBiometricMessage("Biometric sign-in has been turned off on this device.");
      } else {
        const credential = await enroll({
          name: "OptiScript on this device",
          identifierHint: user?.primaryEmailAddress?.emailAddress,
          reason: "Protect your OptiScript account with biometrics",
          policy: "biometry_or_device_passcode",
        });
        setBiometricCredentialId(credential.id);
        setBiometricMessage("Biometric sign-in is ready on this device.");
      }
    } catch (error) {
      setBiometricMessage(error instanceof Error ? error.message : "Biometric setup was not completed.");
    } finally {
      setBiometricBusy(false);
    }
  };

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const handleSave = async () => {
    await updateDoctor(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const rxPadOverlays = prescriptionConfig.rxPadOverlays?.length
    ? prescriptionConfig.rxPadOverlays
    : prescriptionConfig.rxPadOverlay
      ? [prescriptionConfig.rxPadOverlay]
      : [];
  const activeRxPadId = prescriptionConfig.activeRxPadOverlayId || rxPadOverlays[0]?.id;
  const selectRxPad = async (id: string) => {
    const active = rxPadOverlays.find((overlay) => overlay.id === id);
    if (!active) return;
    await updatePrescriptionConfig({
      ...prescriptionConfig,
      rxPadOverlays,
      activeRxPadOverlayId: id,
      rxPadOverlay: active,
    });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const syncLabel = syncStatus === "synced"
    ? "Cloud sync up to date"
    : syncStatus === "syncing"
      ? "Syncing changes…"
      : syncStatus === "offline"
        ? "Offline — saved on this device"
        : syncStatus === "error"
          ? "Cloud sync needs attention"
          : "Cloud sync is ready";
  const syncColor = syncStatus === "offline" || syncStatus === "error" ? colors.destructive : colors.primary;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
        <Text style={s.sub}>Doctor & Clinic Details</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
          <Feather name={syncStatus === "offline" ? "cloud-off" : "cloud"} size={13} color={syncColor} />
          <Text style={{ color: syncColor, fontSize: 11, fontFamily: "Inter_500Medium" }}>{syncLabel}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <FieldGroup title="Doctor Name">
          <Field label="Name (Bengali)" value={form.nameBn} onChange={set("nameBn")}
            placeholder="ডাঃ …" />
          <Field label="Name (English)" value={form.nameEn} onChange={set("nameEn")}
            placeholder="Dr. Firstname Lastname" />
        </FieldGroup>

        <FieldGroup title="Qualifications & Designation">
          <Field label="Qualifications (Bengali)" value={form.qualificationBn} onChange={set("qualificationBn")}
            placeholder="এম.বি.বি.এস, এফ.সি.পি.এস" />
          <Field label="Qualifications (English)" value={form.qualificationEn} onChange={set("qualificationEn")}
            placeholder="MBBS, MCPS, FCPS-Ophthalmology" />
          <Field label="Designation (Bengali)" value={form.designationBn} onChange={set("designationBn")}
            placeholder="সহকারী অধ্যাপক…" />
          <Field label="Designation (English)" value={form.designationEn} onChange={set("designationEn")}
            placeholder="Assistant Professor, Ophthalmology" />
        </FieldGroup>

        <FieldGroup title="Institution">
          <Field label="Institution (Bengali)" value={form.institutionBn} onChange={set("institutionBn")}
            placeholder="বাংলাদেশ মেডিকেল কলেজ…" />
          <Field label="Institution (English)" value={form.institutionEn} onChange={set("institutionEn")}
            placeholder="Bangladesh Medical College & Hospital" />
          <Field label="BMDC / Registration No." value={form.regNumber} onChange={set("regNumber")}
            placeholder="e.g. A-70599" />
        </FieldGroup>

        <FieldGroup title="Contact">
          <Field label="Phone" value={form.phone} onChange={set("phone")}
            placeholder="+880 …" keyboard="phone-pad" />
          <Field label="Email" value={form.email} onChange={set("email")}
            placeholder="dr.name@email.com" keyboard="email-address" />
        </FieldGroup>

        <FieldGroup title="Chamber / Clinic">
          <Field label="Chamber Name" value={form.chamberName} onChange={set("chamberName")}
            placeholder="e.g. College Optima" />
          <Field label="Chamber Address" value={form.chamberAddress} onChange={set("chamberAddress")}
            placeholder="Full address…" multiline />
          <Field label="Chamber Phone" value={form.chamberPhone} onChange={set("chamberPhone")}
            placeholder="Appointment number" keyboard="phone-pad" />
        </FieldGroup>

        <TouchableOpacity
          style={[s.saveBtn, saved && s.savedBtn]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Feather name={saved ? "check" : "save"} size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.saveBtnText}>{saved ? "Saved!" : "Save Profile"}</Text>
        </TouchableOpacity>

        <View style={s.infoBox}>
          <Feather name="info" size={13} color={colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={s.infoText}>
            Your name, qualifications, registration number and chamber details appear on every prescription.
          </Text>
        </View>

        <FieldGroup title="Prescription">
          <Text style={{ fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 12 }}>
            Customize every picker option and manage the sections that appear on new prescriptions.
          </Text>
          <TouchableOpacity style={s.changePasswordBtn} onPress={() => router.push("/prescription-settings")} activeOpacity={0.85}>
            <Feather name="sliders" size={17} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={s.changePasswordText}>Customize prescription form</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.foreground, marginTop: 16, marginBottom: 7 }}>
            Rx Pad for printing
          </Text>
          <Text style={{ fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 10 }}>
            Choose which saved pre-printed pad should be used when you select Rx Pad Overlay during printing.
          </Text>
          {rxPadOverlays.map((overlay) => (
            <TouchableOpacity
              key={overlay.id}
              style={[s.rxPadChoice, activeRxPadId === overlay.id && s.rxPadChoiceActive]}
              onPress={() => void selectRxPad(overlay.id)}
              activeOpacity={0.8}
            >
              <View style={[s.rxPadRadio, activeRxPadId === overlay.id && s.rxPadRadioActive]}>
                {activeRxPadId === overlay.id ? <View style={s.rxPadRadioDot} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rxPadChoiceTitle}>{overlay.name}</Text>
                <Text style={s.rxPadChoiceMeta}>{overlay.paperWidthMm} × {overlay.paperHeightMm} mm</Text>
              </View>
              {activeRxPadId === overlay.id ? <Text style={s.rxPadActive}>Active</Text> : null}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.changePasswordBtn} onPress={() => router.push("/rx-pad-settings")} activeOpacity={0.85}>
            <Feather name="layout" size={17} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={s.changePasswordText}>Manage Rx Pad Overlays</Text>
          </TouchableOpacity>
        </FieldGroup>

        <FieldGroup title="Account">
          <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground, marginBottom: 12 }}>
            {user?.primaryEmailAddress?.emailAddress || "Signed-in OptiScript account"}
          </Text>
          <TouchableOpacity style={s.changePasswordBtn} onPress={() => router.push("/change-password")} activeOpacity={0.85}>
            <Feather name="lock" size={17} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={s.changePasswordText}>{user?.passwordEnabled ? "Change password" : "Set a password"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.signOutBtn} onPress={() => signOut()}>
            <Feather name="log-out" size={17} color={colors.destructive} style={{ marginRight: 8 }} />
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </FieldGroup>
        {biometricAvailable ? (
          <FieldGroup title="Security">
            <View style={s.securityRow}>
              <View style={s.securityIcon}>
                <Feather name="shield" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                  Biometric sign-in
                </Text>
                <Text style={{ fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                  {biometricCredentialId ? "Use fingerprint or Face ID for secure sign-in." : "Unlock OptiScript quickly with fingerprint or Face ID."}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.securityToggle, biometricCredentialId ? s.securityToggleOn : null, biometricBusy && { opacity: 0.55 }]}
                onPress={handleBiometricToggle}
                disabled={biometricBusy}
                activeOpacity={0.8}
              >
                <Text style={[s.securityToggleText, biometricCredentialId ? s.securityToggleTextOn : null]}>
                  {biometricBusy ? "..." : biometricCredentialId ? "On" : "Off"}
                </Text>
              </TouchableOpacity>
            </View>
            {biometricMessage ? <Text style={s.securityMessage}>{biometricMessage}</Text> : null}
          </FieldGroup>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 8 },
    title: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground },
    sub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },
    saveBtn: {
      backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15,
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      marginBottom: 14,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
    },
    savedBtn: { backgroundColor: colors.success },
    saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
    infoBox: {
      flexDirection: "row", alignItems: "flex-start",
      backgroundColor: colors.secondary, borderRadius: 10, padding: 12,
    },
    infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 18 },
    rxPadChoice: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1.2, borderColor: colors.border, borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: colors.surface },
    rxPadChoiceActive: { borderColor: colors.primary, backgroundColor: colors.secondary },
    rxPadRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    rxPadRadioActive: { borderColor: colors.primary },
    rxPadRadioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
    rxPadChoiceTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    rxPadChoiceMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    rxPadActive: { fontSize: 10, fontFamily: "Inter_700Bold", color: colors.primary },
    signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.destructive + "50", borderRadius: 11, paddingVertical: 12 },
    signOutText: { color: colors.destructive, fontSize: 14, fontFamily: "Inter_600SemiBold" },
    changePasswordBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.primary + "50", borderRadius: 11, paddingVertical: 12, marginBottom: 10 },
    changePasswordText: { color: colors.primary, fontSize: 14, fontFamily: "Inter_600SemiBold" },
    securityRow: { flexDirection: "row", alignItems: "center" },
    securityIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.secondary, marginRight: 10 },
    securityToggle: { minWidth: 48, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingVertical: 7, paddingHorizontal: 10, alignItems: "center" },
    securityToggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    securityToggleText: { color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_700Bold" },
    securityToggleTextOn: { color: "#fff" },
    securityMessage: { color: colors.primary, fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium", marginTop: 12 },
  });
