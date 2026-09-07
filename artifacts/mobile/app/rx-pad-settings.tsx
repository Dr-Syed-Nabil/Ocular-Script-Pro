import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { RxPadOverlayConfig, RxPadOverlayField } from "@/types";

const PREVIEW_WIDTH = 340;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function OverlayFieldBox({
  field,
  scale,
  paperWidth,
  paperHeight,
  selected,
  onSelect,
  onChange,
}: {
  field: RxPadOverlayField;
  scale: number;
  paperWidth: number;
  paperHeight: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<RxPadOverlayField>) => void;
}) {
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      onChange({
        x: clamp(field.x + gesture.dx / scale, 0, Math.max(0, paperWidth - field.width)),
        y: clamp(field.y + gesture.dy / scale, 0, Math.max(0, paperHeight - field.height)),
      });
    },
  }), [field, onChange, paperHeight, paperWidth, scale]);

  return (
    <View
      {...panResponder.panHandlers}
      onTouchStart={onSelect}
      style={{
        position: "absolute",
        left: field.x * scale,
        top: field.y * scale,
        width: field.width * scale,
        height: field.height * scale,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? "#1A6FAB" : "rgba(26,111,171,0.55)",
        backgroundColor: selected ? "rgba(238,243,250,0.6)" : "rgba(255,255,255,0.18)",
        padding: 2,
      }}
    >
      <Text numberOfLines={2} style={{ color: "#1A6FAB", fontSize: Math.max(7, field.fontSize * scale * 0.8), fontWeight: "700" }}>
        {field.label}
      </Text>
    </View>
  );
}

function FieldNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.numberInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
        value={String(value)}
        onChangeText={(text) => onChange(numberValue(text, value))}
        keyboardType="decimal-pad"
        selectTextOnFocus
      />
    </View>
  );
}

export default function RxPadSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { prescriptionConfig, updatePrescriptionConfig } = useData();
  const [draft, setDraft] = useState<RxPadOverlayConfig>(prescriptionConfig.rxPadOverlay!);
  const [selectedId, setSelectedId] = useState("patient");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prescriptionConfig.rxPadOverlay) setDraft(prescriptionConfig.rxPadOverlay);
  }, [prescriptionConfig.rxPadOverlay]);

  const selectedField = draft.fields.find((field) => field.id === selectedId) || draft.fields[0];
  const previewScale = PREVIEW_WIDTH / draft.paperWidthMm;
  const previewHeight = draft.paperHeightMm * previewScale;

  const updateField = (id: string, patch: Partial<RxPadOverlayField>) => {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field) => field.id === id ? { ...field, ...patch } : field),
    }));
  };

  const chooseImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.75,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const imageUri = asset.base64
      ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
      : asset.uri;
    setDraft((current) => ({
      ...current,
      imageUri,
      imageWidthPx: asset.width,
      imageHeightPx: asset.height,
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updatePrescriptionConfig({ ...prescriptionConfig, rxPadOverlay: draft });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const resetImage = () => {
    Alert.alert("Remove Rx pad image?", "The placement settings will stay saved, but Rx Pad Overlay printing will use the plain data-only template until another image is uploaded.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => setDraft((current) => ({ ...current, imageUri: undefined, imageWidthPx: undefined, imageHeightPx: undefined })) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.muted }]} onPress={() => router.back()}>
          <Text style={{ color: colors.foreground, fontSize: 22 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Rx Pad Overlay</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Place prescription data over your pre-printed pad</Text>
        </View>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{saving ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoBox, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Upload a scan of the complete pre-printed pad. Enter its real paper size in millimeters, then drag each blue category box or edit its exact position and size below.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Pre-printed pad image</Text>
          <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
            A compressed copy is saved on this device so the layout remains available after restarting the app.
          </Text>
          {draft.imageUri ? (
            <View style={styles.imageActions}>
              <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={chooseImage}>
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Replace scan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={resetImage}>
                <Text style={[styles.secondaryButtonText, { color: colors.destructive }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.uploadButton, { backgroundColor: colors.primary }]} onPress={chooseImage}>
              <Text style={styles.uploadButtonText}>Upload scanned Rx pad</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Accurate paper size</Text>
          <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
            Measure the physical pad with a ruler. Printing uses these dimensions as the PDF page size.
          </Text>
          <View style={styles.inputRow}>
            <FieldNumberInput label="Width (mm)" value={draft.paperWidthMm} onChange={(value) => setDraft((current) => ({ ...current, paperWidthMm: Math.max(20, value) }))} />
            <FieldNumberInput label="Height (mm)" value={draft.paperHeightMm} onChange={(value) => setDraft((current) => ({ ...current, paperHeightMm: Math.max(20, value) }))} />
          </View>
          {draft.imageWidthPx && draft.imageHeightPx ? (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Scan: {draft.imageWidthPx} × {draft.imageHeightPx}px · aspect ratio {(draft.imageWidthPx / draft.imageHeightPx).toFixed(3)}
            </Text>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Placement preview</Text>
          <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
            The preview is scaled to fit this screen. The PDF print remains at the physical size entered above.
          </Text>
          <View style={[styles.previewFrame, { width: PREVIEW_WIDTH, height: previewHeight, borderColor: colors.border, backgroundColor: colors.surface }]}>
            {draft.imageUri ? <Image source={{ uri: draft.imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="stretch" /> : (
              <View style={styles.noImage}>
                <Text style={[styles.noImageText, { color: colors.mutedForeground }]}>Upload a pad scan to preview placement</Text>
              </View>
            )}
            {draft.fields.filter((field) => field.enabled).map((field) => (
              <OverlayFieldBox
                key={field.id}
                field={field}
                scale={previewScale}
                paperWidth={draft.paperWidthMm}
                paperHeight={draft.paperHeightMm}
                selected={field.id === selectedId}
                onSelect={() => setSelectedId(field.id)}
                onChange={(patch) => updateField(field.id, patch)}
              />
            ))}
          </View>
        </View>

        {selectedField ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.selectedHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Edit category</Text>
              <TouchableOpacity
                style={[styles.visibilityButton, { borderColor: selectedField.enabled ? colors.primary : colors.border, backgroundColor: selectedField.enabled ? colors.secondary : colors.surface }]}
                onPress={() => updateField(selectedField.id, { enabled: !selectedField.enabled })}
              >
                <Text style={{ color: selectedField.enabled ? colors.primary : colors.mutedForeground, fontSize: 12 }}>{selectedField.enabled ? "Shown" : "Hidden"}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={selectedField.label}
              onChangeText={(label) => updateField(selectedField.id, { label })}
              placeholder="Category label"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.inputRow}>
              <FieldNumberInput label="Left X (mm)" value={selectedField.x} onChange={(value) => updateField(selectedField.id, { x: clamp(value, 0, draft.paperWidthMm - selectedField.width) })} />
              <FieldNumberInput label="Top Y (mm)" value={selectedField.y} onChange={(value) => updateField(selectedField.id, { y: clamp(value, 0, draft.paperHeightMm - selectedField.height) })} />
            </View>
            <View style={styles.inputRow}>
              <FieldNumberInput label="Width (mm)" value={selectedField.width} onChange={(value) => updateField(selectedField.id, { width: clamp(value, 5, draft.paperWidthMm - selectedField.x) })} />
              <FieldNumberInput label="Height (mm)" value={selectedField.height} onChange={(value) => updateField(selectedField.id, { height: clamp(value, 4, draft.paperHeightMm - selectedField.y) })} />
              <FieldNumberInput label="Font (pt)" value={selectedField.fontSize} onChange={(value) => updateField(selectedField.id, { fontSize: clamp(value, 5, 48) })} />
            </View>
          </View>
        ) : null}

        <Text style={[styles.footerHint, { color: colors.mutedForeground }]}>
          In Print Prescription, choose Rx Pad Overlay to apply this image and placement. If no image is saved, the existing data-only overlay remains available.
        </Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  saveButton: { borderRadius: 18, paddingHorizontal: 15, paddingVertical: 9 },
  saveText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  infoBox: { borderRadius: 12, padding: 12, marginBottom: 14 },
  infoText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 15, borderWidth: 1, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardDescription: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3, marginBottom: 10 },
  uploadButton: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  uploadButtonText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  imageActions: { flexDirection: "row", gap: 9 },
  secondaryButton: { borderWidth: 1.2, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  secondaryButtonText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputRow: { flexDirection: "row", gap: 9, marginTop: 9 },
  inputLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginBottom: 4 },
  numberInput: { borderWidth: 1.2, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_400Regular" },
  textInput: { borderWidth: 1.2, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, fontFamily: "Inter_400Regular" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 9 },
  previewFrame: { alignSelf: "center", borderWidth: 1, overflow: "hidden", position: "relative" },
  noImage: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  noImageText: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular" },
  selectedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  visibilityButton: { borderWidth: 1.2, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  footerHint: { textAlign: "center", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingBottom: 12 },
});