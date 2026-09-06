import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { PrescriptionConfig, PrescriptionSectionConfig, PrescriptionSubsectionConfig } from "@/types";

type OptionKey = Exclude<keyof PrescriptionConfig, "sections" | "version">;

function OptionEditor({
  title,
  description,
  options,
  onChange,
}: {
  title: string;
  description: string;
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const colors = useColors();
  const [newValue, setNewValue] = useState("");
  const update = (index: number, value: string) => {
    onChange(options.map((item, itemIndex) => itemIndex === index ? value : item));
  };
  const remove = (index: number) => {
    onChange(options.filter((_, itemIndex) => itemIndex !== index));
  };
  const add = () => {
    const value = newValue.trim();
    if (!value || options.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    onChange([...options, value]);
    setNewValue("");
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>{description}</Text>
      {options.map((option, index) => (
        <View key={`${title}-${index}`} style={[styles.optionRow, { borderBottomColor: colors.border }]}>
          <TextInput
            style={[styles.optionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={option}
            onChangeText={(value) => update(index, value)}
            placeholder="Option label"
            placeholderTextColor={colors.mutedForeground}
            selectTextOnFocus
          />
          <TouchableOpacity onPress={() => remove(index)} style={styles.deleteButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.addRow}>
        <TextInput
          style={[styles.optionInput, { flex: 1, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
          value={newValue}
          onChangeText={setNewValue}
          placeholder="Add a new option"
          placeholderTextColor={colors.mutedForeground}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={add}>
          <Feather name="plus" size={17} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SectionEditor({
  sections,
  onChange,
}: {
  sections: PrescriptionSectionConfig[];
  onChange: (sections: PrescriptionSectionConfig[]) => void;
}) {
  const colors = useColors();
  const [newSection, setNewSection] = useState("");
  const [newSubsections, setNewSubsections] = useState<Record<string, string>>({});
  const update = (id: string, patch: Partial<PrescriptionSectionConfig>) =>
    onChange(sections.map((section) => section.id === id ? { ...section, ...patch } : section));
  const updateSubsection = (sectionId: string, subsectionId: string, patch: Partial<PrescriptionSubsectionConfig>) =>
    onChange(sections.map((section) => section.id === sectionId
      ? {
          ...section,
          subsections: (section.subsections || []).map((subsection) =>
            subsection.id === subsectionId ? { ...subsection, ...patch } : subsection
          ),
        }
      : section));
  const add = () => {
    const title = newSection.trim();
    if (!title || sections.some((section) => section.title.toLowerCase() === title.toLowerCase())) return;
    onChange([...sections, {
      id: `custom-${Date.now().toString(36)}`,
      title,
      enabled: true,
      builtIn: false,
      options: [],
      subsections: [],
    }]);
    setNewSection("");
  };
  const addSubsection = (sectionId: string) => {
    const title = (newSubsections[sectionId] || "").trim();
    const section = sections.find((item) => item.id === sectionId);
    if (!title || section?.subsections?.some((item) => item.title.toLowerCase() === title.toLowerCase())) return;
    update(sectionId, {
      subsections: [
        ...(section?.subsections || []),
        { id: `sub-${Date.now().toString(36)}`, title, enabled: true, builtIn: false, options: [] },
      ],
    });
    setNewSubsections((current) => ({ ...current, [sectionId]: "" }));
  };
  const removeSubsection = (sectionId: string, subsectionId: string) => {
    const section = sections.find((item) => item.id === sectionId);
    update(sectionId, {
      subsections: (section?.subsections || []).filter((item) => item.id !== subsectionId),
    });
  };
  const remove = (id: string) => {
    Alert.alert("Delete section", "This removes the section from future prescriptions. Existing prescriptions stay unchanged.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onChange(sections.filter((section) => section.id !== id)) },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Prescription sections</Text>
      <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
        Rename sections, edit sub-sections, add picker options, or create your own configurable section.
      </Text>
      {sections.map((section) => (
        <View key={section.id} style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[styles.sectionRow, { borderBottomColor: colors.border }]}>
            <TextInput
              style={[styles.sectionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={section.title}
              onChangeText={(title) => update(section.id, { title })}
              editable={!section.builtIn || section.id !== "patient"}
              placeholder="Section title"
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity
              style={[styles.visibilityButton, { borderColor: section.enabled ? colors.primary : colors.border, backgroundColor: section.enabled ? colors.secondary : colors.card }]}
              onPress={() => {
                if (section.id !== "patient") update(section.id, { enabled: !section.enabled });
              }}
              disabled={section.id === "patient"}
            >
              <Feather name={section.enabled ? "eye" : "eye-off"} size={15} color={section.enabled ? colors.primary : colors.mutedForeground} />
            </TouchableOpacity>
            {!section.builtIn ? (
              <TouchableOpacity onPress={() => remove(section.id)} style={styles.deleteButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            ) : null}
          </View>

          {section.id === "advice" || !section.builtIn ? (
            <OptionEditor
              title={`${section.title} options`}
              description="Selectable choices shown above the free-text box."
              options={section.options || []}
              onChange={(options) => update(section.id, { options })}
            />
          ) : null}

          {section.id === "examination" || !section.builtIn ? (
            <View style={styles.subsectionArea}>
              <Text style={[styles.subsectionHeading, { color: colors.foreground }]}>Sub-sections</Text>
              {(section.subsections || []).map((subsection) => (
                <View key={subsection.id} style={[styles.subsectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={styles.sectionRow}>
                    <TextInput
                      style={[styles.sectionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                      value={subsection.title}
                      onChangeText={(title) => updateSubsection(section.id, subsection.id, { title })}
                      placeholder="Sub-section title"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    <TouchableOpacity
                      style={[styles.visibilityButton, { borderColor: subsection.enabled ? colors.primary : colors.border, backgroundColor: subsection.enabled ? colors.secondary : colors.surface }]}
                      onPress={() => updateSubsection(section.id, subsection.id, { enabled: !subsection.enabled })}
                    >
                      <Feather name={subsection.enabled ? "eye" : "eye-off"} size={15} color={subsection.enabled ? colors.primary : colors.mutedForeground} />
                    </TouchableOpacity>
                    {!subsection.builtIn ? (
                      <TouchableOpacity onPress={() => removeSubsection(section.id, subsection.id)} style={styles.deleteButton}>
                        <Feather name="trash-2" size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <OptionEditor
                    title={`${subsection.title} options`}
                    description="Selectable choices; free text remains available."
                    options={subsection.options}
                    onChange={(options) => updateSubsection(section.id, subsection.id, { options })}
                  />
                </View>
              ))}
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.optionInput, { flex: 1, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={newSubsections[section.id] || ""}
                  onChangeText={(value) => setNewSubsections((current) => ({ ...current, [section.id]: value }))}
                  placeholder="Add a sub-section"
                  placeholderTextColor={colors.mutedForeground}
                  onSubmitEditing={() => addSubsection(section.id)}
                />
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={() => addSubsection(section.id)}>
                  <Feather name="plus" size={17} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      ))}
      <View style={styles.addRow}>
        <TextInput
          style={[styles.optionInput, { flex: 1, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
          value={newSection}
          onChangeText={setNewSection}
          placeholder="Add a section, e.g. Refraction Notes"
          placeholderTextColor={colors.mutedForeground}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={add}>
          <Feather name="plus" size={17} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.lockedHint, { color: colors.mutedForeground }]}>Patient is required and cannot be hidden.</Text>
    </View>
  );
}

export default function PrescriptionSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { prescriptionConfig, updatePrescriptionConfig } = useData();
  const [draft, setDraft] = useState<PrescriptionConfig>(prescriptionConfig);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(prescriptionConfig);
  }, [prescriptionConfig]);

  const setOptions = (key: OptionKey, options: string[]) =>
    setDraft((current) => ({ ...current, [key]: options }));

  const save = async () => {
    setSaving(true);
    try {
      await updatePrescriptionConfig(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.muted }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={19} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Prescription setup</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Customize fields used in new prescriptions</Text>
        </View>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]} onPress={save} disabled={saving}>
          <Feather name={saved ? "check" : "save"} size={16} color="#fff" />
          <Text style={styles.saveText}>{saved ? "Saved" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoBox, { backgroundColor: colors.secondary }]}>
          <Feather name="sliders" size={17} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Changes apply to new prescriptions on this device. Existing prescriptions keep their original values.
          </Text>
        </View>

        <SectionEditor sections={draft.sections} onChange={(sections) => setDraft((current) => ({ ...current, sections }))} />
        <OptionEditor title="Chief complaints" description="Symptoms shown in the complaint picker." options={draft.chiefComplaints} onChange={(value) => setOptions("chiefComplaints", value)} />
        <OptionEditor title="Visual acuity" description="Options for UA, WA, PH and BCVA." options={draft.visualAcuity} onChange={(value) => setOptions("visualAcuity", value)} />
        <OptionEditor title="Distance spectacle VA" description="Options for the VA column in Distance (D), independently for each eye." options={draft.distanceVA} onChange={(value) => setOptions("distanceVA", value)} />
        <OptionEditor title="Near spectacle VA" description="Options for the VA column in Near (N), independently for RE and LE." options={draft.nearVA} onChange={(value) => setOptions("nearVA", value)} />
        <OptionEditor title="Drug routes" description="Route chips shown for each medication." options={draft.drugRoutes} onChange={(value) => setOptions("drugRoutes", value)} />
        <OptionEditor title="Lens usage" description="Usage choices in Lens Options." options={draft.lensUsage} onChange={(value) => setOptions("lensUsage", value)} />
        <OptionEditor title="Lens type" description="Lens type choices." options={draft.lensType} onChange={(value) => setOptions("lensType", value)} />
        <OptionEditor title="Lens coating" description="Coating choices; multiple can be selected." options={draft.lensCoating} onChange={(value) => setOptions("lensCoating", value)} />
        <OptionEditor title="Lens material" description="Material choices." options={draft.lensMaterial} onChange={(value) => setOptions("lensMaterial", value)} />
        <OptionEditor title="Follow-up" description="Follow-up interval choices." options={draft.followUp} onChange={(value) => setOptions("followUp", value)} />
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
  saveButton: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  saveText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderRadius: 12, padding: 12, marginBottom: 14 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 15, borderWidth: 1, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardDescription: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3, marginBottom: 10 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 7, borderBottomWidth: 1 },
  optionInput: { borderWidth: 1.2, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_400Regular" },
  deleteButton: { width: 28, alignItems: "center" },
  addRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingTop: 10 },
  addButton: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionCard: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, borderBottomWidth: 1 },
  sectionInput: { flex: 1, borderWidth: 1.2, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_400Regular" },
  visibilityButton: { width: 34, height: 34, borderRadius: 9, borderWidth: 1.2, alignItems: "center", justifyContent: "center" },
  subsectionArea: { paddingTop: 10 },
  subsectionHeading: { fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subsectionCard: { borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 8 },
  lockedHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 9 },
});