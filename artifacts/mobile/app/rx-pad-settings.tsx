import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
import { RxPadImageFit, RxPadOverlayConfig, RxPadOverlayField } from "@/types";
import {
  constrainRxPadOverlayField,
  constrainRxPadOverlayFields,
  getRxPadImageRenderGeometry,
  getRxPadImageResizeMode,
  getRxPadOverlayContentOptions,
  normalizeRxPadImageFit,
  normalizeRxPadImagePosition,
  normalizeRxPadPaperSize,
} from "@/utils/rxPadOverlay";
import { getRxPadOverlayFieldValue } from "@/utils/generatePrescriptionHTML";

const PREVIEW_WIDTH = 340;
const IMAGE_FIT_OPTIONS: Array<{ value: RxPadImageFit; label: string; description: string }> = [
  { value: "fit", label: "Fit", description: "Fill the paper" },
  { value: "contain", label: "Contain", description: "Show the whole scan" },
  { value: "crop", label: "Crop", description: "Fill and trim edges" },
];

function configuredOverlays(config: { rxPadOverlays?: RxPadOverlayConfig[]; rxPadOverlay?: RxPadOverlayConfig }) {
  return config.rxPadOverlays?.length ? config.rxPadOverlays : config.rxPadOverlay ? [config.rxPadOverlay] : [];
}

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
  const fieldRef = React.useRef(field);
  const onChangeRef = React.useRef(onChange);
  const scaleRef = React.useRef(scale);
  const paperWidthRef = React.useRef(paperWidth);
  const paperHeightRef = React.useRef(paperHeight);
  const dragStart = React.useRef({ x: field.x, y: field.y });
  const resizeStart = React.useRef({ width: field.width, height: field.height });
  const interactionMode = React.useRef<"move" | "resize">("move");
  fieldRef.current = field;
  onChangeRef.current = onChange;
  scaleRef.current = scale;
  paperWidthRef.current = paperWidth;
  paperHeightRef.current = paperHeight;

  const panResponder = React.useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: (event) => {
      const current = fieldRef.current;
      const handleSize = 30;
      const { locationX, locationY } = event.nativeEvent;
      interactionMode.current = locationX >= current.width * scaleRef.current - handleSize
        && locationY >= current.height * scaleRef.current - handleSize
        ? "resize"
        : "move";
      dragStart.current = { x: current.x, y: current.y };
      resizeStart.current = { width: current.width, height: current.height };
      onSelect();
    },
    onPanResponderMove: (_, gesture) => {
      const current = fieldRef.current;
      const currentScale = scaleRef.current;
      if (interactionMode.current === "resize") {
        onChangeRef.current({
          width: clamp(resizeStart.current.width + gesture.dx / currentScale, 5, paperWidthRef.current - current.x),
          height: clamp(resizeStart.current.height + gesture.dy / currentScale, 4, paperHeightRef.current - current.y),
        });
      } else {
        onChangeRef.current({
          x: clamp(dragStart.current.x + gesture.dx / currentScale, 0, Math.max(0, paperWidthRef.current - current.width)),
          y: clamp(dragStart.current.y + gesture.dy / currentScale, 0, Math.max(0, paperHeightRef.current - current.height)),
        });
      }
    },
  })).current;

  return (
    <View
      {...panResponder.panHandlers}
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
      {selected ? (
        <View
          accessibilityLabel={`Resize ${field.label}`}
          style={{
            position: "absolute",
            right: 2,
            bottom: 2,
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: "#fff",
            backgroundColor: "#1A6FAB",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#102C3D",
            shadowOpacity: 0.2,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        >
          <Feather name="maximize-2" size={10} color="#fff" />
        </View>
      ) : null}
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

function ImageAlignmentControl({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  testID: string;
}) {
  const colors = useColors();
  const normalizedValue = normalizeRxPadImagePosition(value);
  const adjust = (amount: number) => onChange(normalizeRxPadImagePosition(normalizedValue + amount));

  return (
    <View style={styles.alignmentRow}>
      <Text style={[styles.alignmentLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.alignmentActions}>
        <TouchableOpacity
          accessibilityLabel={`Move scan ${label.toLowerCase()} backward`}
          testID={`${testID}-decrease`}
          style={[styles.alignmentButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => adjust(-5)}
          disabled={normalizedValue <= 0}
        >
          <Feather name="minus" size={14} color={normalizedValue <= 0 ? colors.mutedForeground : colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.alignmentValue, { color: colors.foreground }]}>{Math.round(normalizedValue)}%</Text>
        <TouchableOpacity
          accessibilityLabel={`Move scan ${label.toLowerCase()} forward`}
          testID={`${testID}-increase`}
          style={[styles.alignmentButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => adjust(5)}
          disabled={normalizedValue >= 100}
        >
          <Feather name="plus" size={14} color={normalizedValue >= 100 ? colors.mutedForeground : colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel={`Center scan ${label.toLowerCase()}`}
          testID={`${testID}-center`}
          style={[styles.centerButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => onChange(50)}
        >
          <Text style={[styles.centerButtonText, { color: colors.primary }]}>Center</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RxPadSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { prescriptionId } = useLocalSearchParams<{ prescriptionId?: string }>();
  const { prescriptions, prescriptionConfig, updatePrescriptionConfig } = useData();
  const currentPrescription = prescriptions.find((prescription) => prescription.id === prescriptionId);
  const initialOverlays = configuredOverlays(prescriptionConfig);
  const initialSelectedId = prescriptionConfig.activeRxPadOverlayId || initialOverlays[0]?.id || "rx-pad-1";
  const [templates, setTemplates] = useState<RxPadOverlayConfig[]>(initialOverlays);
  const [draft, setDraft] = useState<RxPadOverlayConfig>(initialOverlays.find((overlay) => overlay.id === initialSelectedId) || initialOverlays[0]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialSelectedId);
  const [selectedId, setSelectedId] = useState("patient");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const incoming = configuredOverlays(prescriptionConfig);
    if (!incoming.length) return;
    const activeId = prescriptionConfig.activeRxPadOverlayId || incoming[0].id;
    setTemplates(incoming);
    setSelectedTemplateId(activeId);
    setDraft(incoming.find((overlay) => overlay.id === activeId) || incoming[0]);
  }, [prescriptionConfig]);

  const selectedField = draft.fields.find((field) => field.id === selectedId) || draft.fields[0];
  const selectedContentOptions = selectedField ? getRxPadOverlayContentOptions(selectedField.id) : [];
  const selectedContentIds = new Set(selectedField?.contentSelection || []);
  const selectedContentIsPartial = selectedField?.printMode === "selected";
  const printableFields = currentPrescription
    ? draft.fields.filter((field) => field.enabled && getRxPadOverlayFieldValue(currentPrescription, field).trim().length > 0)
    : [];
  const enabledFieldCount = draft.fields.filter((field) => field.enabled).length;
  const selectedFieldIsPrintable = Boolean(
    currentPrescription
    && selectedField?.enabled
    && getRxPadOverlayFieldValue(currentPrescription, selectedField).trim().length > 0,
  );
  const previewScale = PREVIEW_WIDTH / draft.paperWidthMm;
  const previewHeight = draft.paperHeightMm * previewScale;
  const imageFit = normalizeRxPadImageFit(draft.imageFit);
  const previewImageGeometry = draft.imageWidthPx && draft.imageHeightPx
    ? getRxPadImageRenderGeometry(
      PREVIEW_WIDTH,
      previewHeight,
      draft.imageWidthPx,
      draft.imageHeightPx,
      imageFit,
      draft.imagePositionX,
      draft.imagePositionY,
    )
    : undefined;

  const updateField = (id: string, patch: Partial<RxPadOverlayField>) => {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field) => field.id === id
        ? constrainRxPadOverlayField({ ...field, ...patch }, current.paperWidthMm, current.paperHeightMm)
        : field),
    }));
  };

  const updatePaperSize = (dimension: "paperWidthMm" | "paperHeightMm", value: number) => {
    setDraft((current) => {
      const next = {
        ...current,
        [dimension]: normalizeRxPadPaperSize(value, current[dimension]),
      };
      return {
        ...next,
        fields: constrainRxPadOverlayFields(next.fields, next.paperWidthMm, next.paperHeightMm),
      };
    });
  };

  const selectTemplate = (id: string) => {
    const committed = templates.map((template) => template.id === selectedTemplateId ? draft : template);
    const next = committed.find((template) => template.id === id);
    if (!next) return;
    setTemplates(committed);
    setSelectedTemplateId(id);
    setDraft(next);
    setSelectedId("patient");
  };

  const addTemplate = () => {
    const id = `rx-pad-${Date.now().toString(36)}`;
    const next: RxPadOverlayConfig = {
      ...(templates[0] || draft),
      id,
      name: "New Rx Pad",
      imageUri: undefined,
      imageWidthPx: undefined,
      imageHeightPx: undefined,
      fields: (templates[0] || draft).fields.map((field) => ({ ...field })),
    };
    const committed = templates.map((template) => template.id === selectedTemplateId ? draft : template);
    setTemplates([...committed, next]);
    setSelectedTemplateId(id);
    setDraft(next);
    setSelectedId("patient");
  };

  const deleteTemplate = () => {
    if (templates.length <= 1) {
      Alert.alert("Keep one Rx Pad", "At least one Rx Pad Overlay must remain configured.", [{ text: "OK" }]);
      return;
    }
    Alert.alert("Delete this Rx Pad?", "Its saved placement settings will be removed. Existing printed prescriptions are unchanged.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const remaining = templates.filter((template) => template.id !== selectedTemplateId);
          const next = remaining[0];
          setTemplates(remaining);
          setSelectedTemplateId(next.id);
          setDraft(next);
          setSelectedId("patient");
        },
      },
    ]);
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
      const committed = templates.map((template) => template.id === selectedTemplateId ? draft : template);
      const active = committed.find((template) => template.id === selectedTemplateId) || committed[0];
      await updatePrescriptionConfig({
        ...prescriptionConfig,
        rxPadOverlays: committed,
        activeRxPadOverlayId: active.id,
        rxPadOverlay: active,
      });
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
            Upload a scan of the complete pre-printed pad. Enter its real paper size in millimeters, then press and hold a blue category to move it. Select a category and hold its corner handle to resize it.
          </Text>
        </View>

        <View
          accessibilityRole="summary"
          style={[
            styles.readinessCard,
            {
              backgroundColor: !currentPrescription
                ? colors.surface
                : printableFields.length
                  ? colors.clinicalSoft
                  : "#FFF3EF",
              borderColor: !currentPrescription
                ? colors.border
                : printableFields.length
                  ? colors.clinicalAccent
                  : colors.clinicalWarning,
            },
          ]}
        >
          <View
            style={[
              styles.readinessIcon,
              {
                backgroundColor: !currentPrescription
                  ? colors.secondary
                  : printableFields.length
                    ? colors.clinicalAccent
                    : "#FADBD5",
              },
            ]}
          >
            <Feather
              name={!currentPrescription ? "info" : printableFields.length ? "check" : "alert-triangle"}
              size={16}
              color={!currentPrescription ? colors.primary : printableFields.length ? colors.clinicalHero : colors.clinicalWarning}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.readinessTitle, { color: colors.foreground }]}>
              {!currentPrescription
                ? "Print readiness"
                : printableFields.length
                  ? "Ready to print"
                  : "Nothing to print"}
            </Text>
            <Text style={[styles.readinessText, { color: colors.mutedForeground }]}>
              {!currentPrescription
                ? "Open Rx Pad settings from a prescription to check its printable fields."
                : printableFields.length
                  ? `${printableFields.length} of ${enabledFieldCount} enabled field${enabledFieldCount === 1 ? "" : "s"} has content for ${currentPrescription.patientName || "this prescription"}.`
                  : "No enabled Rx Pad field has printable content. Enable a field or enter prescription details."}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.selectedHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Saved Rx Pad Overlays</Text>
              <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
                Create multiple pad layouts and choose which one is active from your Profile.
              </Text>
            </View>
            <TouchableOpacity style={[styles.smallAction, { backgroundColor: colors.secondary }]} onPress={addTemplate}>
              <Text style={[styles.smallActionText, { color: colors.primary }]}>+ New</Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 8 }}>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[styles.templateRow, { borderColor: template.id === selectedTemplateId ? colors.primary : colors.border, backgroundColor: template.id === selectedTemplateId ? colors.secondary : colors.surface }]}
                onPress={() => selectTemplate(template.id)}
              >
                <View style={[styles.radio, { borderColor: template.id === selectedTemplateId ? colors.primary : colors.border }]}>
                  {template.id === selectedTemplateId ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.templateName, { color: colors.foreground }]} numberOfLines={1}>{template.name}</Text>
                  <Text style={[styles.templateMeta, { color: colors.mutedForeground }]}>{template.paperWidthMm} × {template.paperHeightMm} mm{template.imageUri ? " · scan ready" : " · no scan"}</Text>
                </View>
                {template.id === selectedTemplateId ? <Text style={[styles.activeText, { color: colors.primary }]}>Editing</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.deleteTemplateButton, { borderColor: colors.border }]} onPress={deleteTemplate}>
            <Text style={[styles.secondaryButtonText, { color: colors.destructive }]}>Delete selected overlay</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.selectedHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Edit selected overlay</Text>
            <Text style={[styles.templateMeta, { color: colors.mutedForeground }]}>{draft.name}</Text>
          </View>
          <TextInput
            style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="Overlay name"
            placeholderTextColor={colors.mutedForeground}
          />
          <Text style={[styles.cardTitle, { color: colors.foreground, marginTop: 14 }]}>Pre-printed pad image</Text>
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
          <Text style={[styles.fitLabel, { color: colors.foreground }]}>Scan fit</Text>
          <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
            Choose how the scan should fit the physical paper. This applies to the preview and printed overlay.
          </Text>
          <View style={styles.fitOptions}>
            {IMAGE_FIT_OPTIONS.map((option) => {
              const selected = imageFit === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.fitOption,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.secondary : colors.surface,
                    },
                  ]}
                  onPress={() => setDraft((current) => ({ ...current, imageFit: option.value }))}
                >
                  <Text style={[styles.fitOptionLabel, { color: selected ? colors.primary : colors.foreground }]}>{option.label}</Text>
                  <Text style={[styles.fitOptionDescription, { color: colors.mutedForeground }]}>{option.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {draft.imageUri && imageFit !== "fit" ? (
            <View style={[styles.alignmentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.alignmentTitle, { color: colors.foreground }]}>Scan alignment</Text>
              <Text style={[styles.alignmentDescription, { color: colors.mutedForeground }]}>
                Shift the scan without moving prescription fields. These settings are saved with this Rx Pad.
              </Text>
              <ImageAlignmentControl
                label="Horizontal"
                value={draft.imagePositionX ?? 50}
                testID="rx-pad-alignment-horizontal"
                onChange={(imagePositionX) => setDraft((current) => ({ ...current, imagePositionX }))}
              />
              <ImageAlignmentControl
                label="Vertical"
                value={draft.imagePositionY ?? 50}
                testID="rx-pad-alignment-vertical"
                onChange={(imagePositionY) => setDraft((current) => ({ ...current, imagePositionY }))}
              />
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Accurate paper size</Text>
          <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
            Measure the physical pad with a ruler. Printing uses these dimensions as the PDF page size.
          </Text>
          <View style={styles.inputRow}>
            <FieldNumberInput label="Width (mm)" value={draft.paperWidthMm} onChange={(value) => updatePaperSize("paperWidthMm", value)} />
            <FieldNumberInput label="Height (mm)" value={draft.paperHeightMm} onChange={(value) => updatePaperSize("paperHeightMm", value)} />
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
            The preview is scaled to fit this screen. Press and hold a category to move it, or drag the blue corner handle to resize it. The PDF print remains at the physical size entered above.
          </Text>
          <View style={[styles.previewFrame, { width: PREVIEW_WIDTH, height: previewHeight, borderColor: colors.border, backgroundColor: colors.surface }]}>
            {draft.imageUri ? (
              <Image
                source={{ uri: draft.imageUri }}
                style={previewImageGeometry
                  ? {
                    position: "absolute",
                    left: previewImageGeometry.left,
                    top: previewImageGeometry.top,
                    width: previewImageGeometry.width,
                    height: previewImageGeometry.height,
                  }
                  : StyleSheet.absoluteFillObject}
                resizeMode={previewImageGeometry ? "stretch" : getRxPadImageResizeMode(imageFit)}
              />
            ) : (
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Edit category</Text>
                {currentPrescription ? (
                  <Text style={[styles.fieldReadiness, { color: selectedFieldIsPrintable ? colors.success : colors.mutedForeground }]}>
                    {selectedFieldIsPrintable ? "Has printable content" : "No printable content"}
                  </Text>
                ) : null}
              </View>
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
            {selectedContentOptions.length ? (
              <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.contentHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contentTitle, { color: colors.foreground }]}>Print contents</Text>
                    <Text style={[styles.contentDescription, { color: colors.mutedForeground }]}>
                      Print the whole category or choose only the details needed on this pad.
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: !selectedContentIsPartial }}
                    style={[styles.wholeCategoryButton, { borderColor: !selectedContentIsPartial ? colors.primary : colors.border, backgroundColor: !selectedContentIsPartial ? colors.secondary : colors.card }]}
                    onPress={() => updateField(selectedField.id, { printMode: "all", contentSelection: undefined })}
                  >
                    <Feather name={!selectedContentIsPartial ? "check-square" : "square"} size={15} color={!selectedContentIsPartial ? colors.primary : colors.mutedForeground} />
                    <Text style={{ color: !selectedContentIsPartial ? colors.primary : colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Whole category</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.contentOptions}>
                  {selectedContentOptions.map((option) => {
                    const checked = !selectedContentIsPartial || selectedContentIds.has(option.id);
                    return (
                      <TouchableOpacity
                        key={option.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        style={[styles.contentOption, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.secondary : colors.card }]}
                        onPress={() => {
                          const current = selectedField.contentSelection || selectedContentOptions.map((item) => item.id);
                          const next = current.includes(option.id)
                            ? current.filter((item) => item !== option.id)
                            : [...current, option.id];
                          updateField(selectedField.id, { printMode: "selected", contentSelection: next });
                        }}
                      >
                        <Feather name={checked ? "check-square" : "square"} size={14} color={checked ? colors.primary : colors.mutedForeground} />
                        <Text style={{ flex: 1, color: colors.foreground, fontSize: 11, fontFamily: "Inter_500Medium" }}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
            <View style={styles.inputRow}>
              <FieldNumberInput label="Left X (mm)" value={selectedField.x} onChange={(value) => updateField(selectedField.id, { x: value })} />
              <FieldNumberInput label="Top Y (mm)" value={selectedField.y} onChange={(value) => updateField(selectedField.id, { y: value })} />
            </View>
            <View style={styles.inputRow}>
              <FieldNumberInput label="Width (mm)" value={selectedField.width} onChange={(value) => updateField(selectedField.id, { width: value })} />
              <FieldNumberInput label="Height (mm)" value={selectedField.height} onChange={(value) => updateField(selectedField.id, { height: value })} />
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
  readinessCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 13, borderWidth: 1, padding: 12, marginBottom: 14 },
  readinessIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  readinessTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  readinessText: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 2 },
  fieldReadiness: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  card: { borderRadius: 15, borderWidth: 1, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardDescription: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3, marginBottom: 10 },
  uploadButton: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  uploadButtonText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  imageActions: { flexDirection: "row", gap: 9 },
  secondaryButton: { borderWidth: 1.2, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  secondaryButtonText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fitLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 14, marginBottom: 3 },
  fitOptions: { flexDirection: "row", gap: 7 },
  fitOption: { flex: 1, borderWidth: 1.2, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 9 },
  fitOptionLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  fitOptionDescription: { fontSize: 9, lineHeight: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  alignmentCard: { borderWidth: 1, borderRadius: 11, padding: 10, marginTop: 11 },
  alignmentTitle: { fontSize: 12, fontFamily: "Inter_700Bold" },
  alignmentDescription: { fontSize: 10, lineHeight: 14, fontFamily: "Inter_400Regular", marginTop: 2, marginBottom: 4 },
  alignmentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 7 },
  alignmentLabel: { flex: 1, fontSize: 11, fontFamily: "Inter_500Medium" },
  alignmentActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  alignmentButton: { width: 30, height: 30, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  alignmentValue: { width: 42, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  centerButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, height: 30, alignItems: "center", justifyContent: "center" },
  centerButtonText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
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
  contentCard: { borderWidth: 1, borderRadius: 11, padding: 10, marginTop: 10 },
  contentHeader: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  contentTitle: { fontSize: 12, fontFamily: "Inter_700Bold" },
  contentDescription: { fontSize: 10, lineHeight: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  wholeCategoryButton: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.2, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 6 },
  contentOptions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 },
  contentOption: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 6 },
  smallAction: { borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  smallActionText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  templateRow: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1.2, borderRadius: 10, padding: 10 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
  templateName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  templateMeta: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  activeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  deleteTemplateButton: { borderWidth: 1.2, borderRadius: 10, alignItems: "center", paddingVertical: 9, marginTop: 10 },
  footerHint: { textAlign: "center", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingBottom: 12 },
});