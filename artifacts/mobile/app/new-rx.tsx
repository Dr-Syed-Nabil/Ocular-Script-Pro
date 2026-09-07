import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SmartInput } from "@/components/SmartInput";
import { VAPicker } from "@/components/VAPicker";
import {
  ADD_VALUES, AXIS_VALUES, CYL_VALUES, SPH_VALUES,
  SpectacleValuePicker,
  formatAdd, formatAxis, formatSphCyl,
} from "@/components/SpectacleValuePicker";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { useSuggestions } from "@/hooks/useSuggestions";
import {
  isAlreadyBangla,
  tobnDigits,
  translateToBangla,
} from "@/utils/banglaTranslate";
import {
  Drug,
  DrugDosePhase,
  DrugFormulation,
  DrugInstructionConnector,
  ChiefComplaintSelection,
  ComplaintLaterality,
  EyeSpectacleRx,
  EyeVA,
  PastHistory,
  Patient,
  CustomPrescriptionSection,
  ConfigurableFieldValue,
  PrescriptionSectionConfig,
} from "@/types";
import { INVESTIGATION_GROUPS } from "@/constants/prescriptionConfig";

const newId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

const EMPTY_VA: EyeVA = { ua: "", wa: "", ph: "", bcva: "" };
const EMPTY_RX: EyeSpectacleRx = { dsp: "", dcyl: "", axis: "", va: "" };
const EMPTY_HISTORY: PastHistory = {
  dm: false, htn: false, ihd: false, ckd: false,
  ba: false, thyDs: false, uromax: false, others: "",
};
const LATERALITIES: ComplaintLaterality[] = ["R", "L", "B"];
const DRUG_FORMULATIONS: DrugFormulation[] = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Eye Drop/Gel",
  "Eye Ointment",
  "Topical Ointment/Cream",
];
const TABLET_SCHEDULES = ["০+০+১", "০+১+০", "১+০+১", "১+১+১+১", "১+০+০", "২+০+০", "৩+০+০", "৪+০+০"];
const SYRUP_AMOUNTS = ["১", "১.৫", "২", "২.৫", "৩", "৩.৫", "৪", "৫", "৭.৫", "১০", "১২.৫", "১৫"];
const SYRUP_UNITS = ["চা-চামচ", "ml"];
const SYRUP_FREQUENCIES = ["২ বার", "৩ বার", "৪ বার", "একবার সকালে", "একবার দুপুরে/বিকেলে/সন্ধ্যায়", "একবার রাতে ঘুমানোর আগে"];
const DROP_FREQUENCIES = [
  "৪ ঘণ্টা পরপর", "৫ ঘণ্টা পরপর", "৬ ঘণ্টা পরপর", "৮ ঘণ্টা পরপর", "১২ ঘণ্টা পরপর", "২৪ ঘণ্টা পরপর",
  "৩ ঘণ্টা পরপর", "২ ঘণ্টা পরপর", "১ ঘণ্টা পরপর", "আধা ঘণ্টা পরপর", "দিনে ২ বার", "দিনে ৩ বার",
  "দিনে ৪ বার", "দিনে ৫ বার", "দিনে ৬ বার", "দিনে ৮ বার", "দিনে একবার সকালে", "দিনে একবার সন্ধ্যায়",
  "দিনে একবার রাতে ঘুমানোর আগে",
];
const DROP_SITES = ["ডান", "বাম", "উভয়"];
const OINTMENT_SITES = ["ক্ষতস্থানে", "ডান চোখের ভিতরে", "বাম চোখের ভিতরে", "উভয় চোখের ভিতরে", "ডান চোখের পাতার উপর", "বাম চোখের পাতার উপর", "উভয় চোখের পাতার উপর"];
const OINTMENT_FREQUENCIES = ["রাতে ঘুমানোর আগে", "দিনে ৪ বার", "দিনে ৩ বার", "দিনে ২ বার", "দিনে ১ বার"];
const DURATION_VALUES = ["১", "২", "৩", "৫", "৭", "১০", "১৫", "৩০"];
const DURATION_UNITS: DrugDosePhase["durationUnit"][] = ["দিন", "সপ্তাহ", "মাস"];

type AgeUnit = "years" | "months";

function parseAge(value: string): { number: string; unit: AgeUnit } {
  return {
    number: value.match(/\d+/)?.[0] || "",
    unit: /month|\bmo\b/i.test(value) ? "months" : "years",
  };
}

function formatAge(number: string, unit: AgeUnit): string {
  return number.trim() ? `${number.trim()} ${unit}` : "";
}

function formatChiefComplaints(selections: ChiefComplaintSelection[], freeText: string): string {
  const selected = selections.map(({ complaint, laterality }) =>
    complaint === "Headache" ? complaint : `${complaint} (${laterality ?? "?"})`,
  );
  const custom = freeText.trim();
  return [...selected, ...(custom ? [custom] : [])].join(", ");
}

function genDrugId() {
  return Math.random().toString(36).slice(2);
}
function emptyDrug(): Drug {
  return { id: genDrugId(), name: "", schedule: "", scheduleBn: "", duration: "", durationBn: "", route: "", notes: "" };
}

/* ───────── tiny helpers ───────── */

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 22, marginBottom: 10 }}>
      <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: colors.primary, marginRight: 8 }} />
      <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1 }}>
        {title}
      </Text>
    </View>
  );
}

function MiniLabel({ label }: { label: string }) {
  const colors = useColors();
  return (
    <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>
      {label}
    </Text>
  );
}

function CheckItem({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: value ? colors.primary : colors.border, backgroundColor: value ? colors.secondary : colors.card }}
      onPress={() => onChange(!value)} activeOpacity={0.7}
    >
      <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: value ? colors.primary : colors.mutedForeground, backgroundColor: value ? colors.primary : "transparent", alignItems: "center", justifyContent: "center", marginRight: 6 }}>
        {value && <Feather name="check" size={10} color="#fff" />}
      </View>
      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: value ? colors.primary : colors.foreground }}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleGroup({ options, value, onChange, multi }: { options: string[]; value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = multi ? (value as string[]).includes(opt) : value === opt;
        return (
          <TouchableOpacity key={opt}
            style={{ borderWidth: 1.5, borderColor: active ? colors.primary : colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: active ? colors.secondary : colors.card }}
            onPress={() => {
              if (multi) {
                const arr = value as string[];
                onChange(active ? arr.filter((a) => a !== opt) : [...arr, opt]);
              } else {
                onChange(active ? "" : opt);
              }
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium", color: active ? colors.primary : colors.mutedForeground }}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function configurableFieldText(value: ConfigurableFieldValue): string {
  const selected = value.selectedOptions.map((option) => {
    const laterality = value.optionLateralities?.[option];
    return laterality ? `${option} (${laterality})` : option;
  });
  return [...selected, value.freeText.trim()].filter(Boolean).join(", ");
}

const OPHTHALMIC_INVESTIGATIONS: Set<string> = new Set<string>(
  INVESTIGATION_GROUPS.find((group) => group.title === "Ophthalmic")?.options || [],
);

function InvestigationDropdown({
  options,
  groups,
  value,
  onChange,
}: {
  options: string[];
  groups: readonly { title: string; options: readonly string[] }[];
  value: ConfigurableFieldValue;
  onChange: (value: ConfigurableFieldValue) => void;
}) {
  const colors = useColors();
  const s = styles(colors);
  const [open, setOpen] = useState(false);
  const groupedOptions = new Set(groups.flatMap((group) => group.options));
  const extraOptions = options.filter((option) => !groupedOptions.has(option));

  const toggleOption = (option: string) => {
    const selected = value.selectedOptions.includes(option);
    const nextLateralities = { ...(value.optionLateralities || {}) };
    if (selected) delete nextLateralities[option];
    onChange({
      ...value,
      selectedOptions: selected
        ? value.selectedOptions.filter((item) => item !== option)
        : [...value.selectedOptions, option],
      optionLateralities: nextLateralities,
    });
  };

  const chooseLaterality = (option: string, side: ComplaintLaterality) => {
    onChange({
      ...value,
      optionLateralities: { ...(value.optionLateralities || {}), [option]: side },
    });
  };

  const renderOption = (option: string) => {
    const selected = value.selectedOptions.includes(option);
    const ophthalmic = OPHTHALMIC_INVESTIGATIONS.has(option);
    return (
      <View key={option} style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 }}
          onPress={() => toggleOption(option)}
          activeOpacity={0.7}
        >
          <View style={[s.checkbox, selected && s.checkboxSelected]}>
            {selected && <Feather name="check" size={12} color="#fff" />}
          </View>
          <Text style={[s.dropdownOptionText, selected && s.dropdownOptionTextSelected]}>{option}</Text>
        </TouchableOpacity>
        {selected && ophthalmic ? (
          <View style={{ paddingHorizontal: 42, paddingBottom: 10 }}>
            <Text style={s.dropdownPrompt}>Choose eye side</Text>
            <View style={s.lateralityGroup}>
              {LATERALITIES.map((side) => (
                <TouchableOpacity
                  key={side}
                  style={[s.lateralityButton, value.optionLateralities?.[option] === side && s.lateralityButtonSelected]}
                  onPress={() => chooseLaterality(option, side)}
                >
                  <Text style={[s.lateralityText, value.optionLateralities?.[option] === side && s.lateralityTextSelected]}>{side}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ gap: 8 }}>
      <TouchableOpacity
        style={s.investigationSelect}
        onPress={() => setOpen((current) => !current)}
        activeOpacity={0.8}
      >
        <Text style={value.selectedOptions.length ? s.investigationSelectText : s.investigationSelectPlaceholder} numberOfLines={2}>
          {value.selectedOptions.length
            ? `${value.selectedOptions.length} investigation${value.selectedOptions.length === 1 ? "" : "s"} selected`
            : "Select investigations…"}
        </Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
      {open ? (
        <View style={s.investigationMenu}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 330 }}>
            {groups.map((group) => (
              <View key={group.title}>
                <Text style={s.investigationGroupTitle}>{group.title}</Text>
                {group.options.filter((option) => options.includes(option)).map(renderOption)}
              </View>
            ))}
            {extraOptions.length ? (
              <View>
                <Text style={s.investigationGroupTitle}>Other saved options</Text>
                {extraOptions.map(renderOption)}
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function ConfigurableTextField({
  options,
  optionGroups,
  value,
  onChange,
  fieldKey,
  placeholder,
  minHeight = 64,
}: {
  options: string[];
  optionGroups?: readonly { title: string; options: readonly string[] }[];
  value: ConfigurableFieldValue;
  onChange: (value: ConfigurableFieldValue) => void;
  fieldKey: string;
  placeholder: string;
  minHeight?: number;
}) {
  return (
    <View style={{ gap: 8 }}>
      {optionGroups ? (
        <InvestigationDropdown options={options} groups={optionGroups} value={value} onChange={onChange} />
      ) : options.length ? (
        <ToggleGroup
          options={options}
          value={value.selectedOptions}
          multi
          onChange={(selectedOptions) => onChange({ ...value, selectedOptions: selectedOptions as string[] })}
        />
      ) : null}
      <SmartInput
        fieldKey={fieldKey}
        value={value.freeText}
        onChangeText={(freeText) => onChange({ ...value, freeText })}
        placeholder={placeholder}
        minHeight={minHeight}
        multiline
      />
    </View>
  );
}

function ConfiguredSubsections({
  section,
  getValue,
  onChange,
}: {
  section?: PrescriptionSectionConfig;
  getValue: (key: string) => ConfigurableFieldValue;
  onChange: (key: string, value: ConfigurableFieldValue) => void;
}) {
  if (!section?.subsections?.length) return null;
  return (
    <View style={{ gap: 10, marginTop: 12 }}>
      {section.subsections.filter((subsection) => subsection.enabled).map((subsection) => {
        const fieldKey = `configured:${section.id}:${subsection.id}`;
        return (
          <View key={fieldKey}>
            <MiniLabel label={subsection.title} />
            <ConfigurableTextField
              fieldKey={fieldKey}
              options={subsection.options}
              value={getValue(fieldKey)}
              onChange={(value) => onChange(fieldKey, value)}
              placeholder={`Enter ${subsection.title.toLowerCase()}…`}
              minHeight={70}
            />
          </View>
        );
      })}
    </View>
  );
}

function ConfiguredSectionOptions({
  section,
  getValue,
  onChange,
}: {
  section?: PrescriptionSectionConfig;
  getValue: (key: string) => ConfigurableFieldValue;
  onChange: (key: string, value: ConfigurableFieldValue) => void;
}) {
  if (!section?.options?.length) return null;
  const fieldKey = `configured-section:${section.id}`;
  return (
    <View style={{ marginTop: 12 }}>
      <MiniLabel label={`${section.title} options`} />
      <ConfigurableTextField
        fieldKey={fieldKey}
        options={section.options}
        value={getValue(fieldKey)}
        onChange={(value) => onChange(fieldKey, value)}
        placeholder={`Enter ${section.title.toLowerCase()}…`}
        minHeight={64}
      />
    </View>
  );
}

/* ───────── VA Table ───────── */

function VATable({ reVA, leVA, onChangeRe, onChangeLe, options, mode, onModeChange }: {
  reVA: EyeVA; leVA: EyeVA;
  onChangeRe: (f: keyof EyeVA, v: string) => void;
  onChangeLe: (f: keyof EyeVA, v: string) => void;
  options: string[];
  mode: "ua" | "wa";
  onModeChange: (mode: "ua" | "wa") => void;
}) {
  const colors = useColors();

  const rows: { key: keyof EyeVA; label: string; ni?: boolean }[] = [
    { key: mode, label: mode.toUpperCase() },
    { key: "ph", label: "PH", ni: true },
    { key: "bcva", label: "BCVA", ni: true },
  ];

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", gap: 8, padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {(["ua", "wa"] as const).map((item) => (
          <TouchableOpacity
            key={item}
            style={{ flex: 1, borderWidth: 1.5, borderColor: mode === item ? colors.primary : colors.border, borderRadius: 9, paddingVertical: 8, backgroundColor: mode === item ? colors.secondary : colors.surface }}
            onPress={() => onModeChange(item)}
          >
            <Text style={{ textAlign: "center", fontSize: 12, fontFamily: "Inter_700Bold", color: mode === item ? colors.primary : colors.mutedForeground }}>
              Fill {item.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: "row", backgroundColor: colors.secondary, paddingVertical: 8, paddingHorizontal: 10 }}>
        <View style={{ width: 52 }} />
        <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_700Bold", color: colors.primary, textAlign: "center" }}>RE (OD)</Text>
        <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_700Bold", color: colors.primary, textAlign: "center" }}>LE (OS)</Text>
      </View>
      {rows.map(({ key, label, ni }) => (
        <View key={key} style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ width: 44, fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
          <VAPicker
            value={reVA[key]}
            onChange={(v) => onChangeRe(key, v)}
            fieldLabel={label}
            eyeLabel="RE"
            includeNI={ni}
            options={options}
          />
          <VAPicker
            value={leVA[key]}
            onChange={(v) => onChangeLe(key, v)}
            fieldLabel={label}
            eyeLabel="LE"
            includeNI={ni}
            options={options}
          />
        </View>
      ))}
    </View>
  );
}

/* ───────── Spectacle Table ───────── */

function RxBlock({ title, re, le, onFn, readOnly, vaOptions }: {
  title: string; re: EyeSpectacleRx; le: EyeSpectacleRx;
  onFn: (eye: "re" | "le", f: keyof EyeSpectacleRx, v: string) => void;
  readOnly?: boolean;
  vaOptions: string[];
}) {
  const colors = useColors();
  return (
    <>
      <View style={{ backgroundColor: colors.secondary, paddingVertical: 6, paddingHorizontal: 12 }}>
        <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</Text>
      </View>
      {(["re", "le"] as const).map((eye) => {
        const rx = eye === "re" ? re : le;
        return (
          <View key={eye} style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ width: 28, fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, paddingBottom: 10 }}>{eye === "re" ? "RE" : "LE"}</Text>
            {/* SPH */}
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 2 }}>
              {eye === "re" && <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>SPH</Text>}
              {readOnly ? (
                <View style={{ width: "100%", borderWidth: 1.5, borderColor: colors.primary + "60", borderRadius: 6, paddingVertical: 9, alignItems: "center", backgroundColor: colors.secondary }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.primary }}>{rx.dsp || "—"}</Text>
                </View>
              ) : (
                <SpectacleValuePicker values={SPH_VALUES} value={rx.dsp} onChange={(v) => onFn(eye, "dsp", v)} format={formatSphCyl} placeholder="SPH" />
              )}
            </View>
            {/* CYL */}
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 2 }}>
              {eye === "re" && <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>CYL</Text>}
              {readOnly ? (
                <View style={{ width: "100%", borderWidth: 1.5, borderColor: colors.primary + "60", borderRadius: 6, paddingVertical: 9, alignItems: "center", backgroundColor: colors.secondary }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.primary }}>{rx.dcyl || "—"}</Text>
                </View>
              ) : (
                <SpectacleValuePicker values={CYL_VALUES} value={rx.dcyl} onChange={(v) => onFn(eye, "dcyl", v)} format={formatSphCyl} placeholder="CYL" />
              )}
            </View>
            {/* AXIS */}
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 2 }}>
              {eye === "re" && <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>AXIS</Text>}
              {readOnly ? (
                <View style={{ width: "100%", borderWidth: 1.5, borderColor: colors.primary + "60", borderRadius: 6, paddingVertical: 9, alignItems: "center", backgroundColor: colors.secondary }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.primary }}>{rx.axis ? (rx.axis.includes("°") ? rx.axis : rx.axis + "°") : "—"}</Text>
                </View>
              ) : (
                <SpectacleValuePicker values={AXIS_VALUES} value={rx.axis} onChange={(v) => onFn(eye, "axis", v)} format={formatAxis} placeholder="AXIS" />
              )}
            </View>
            {/* VA — configurable, separately selectable for each eye */}
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 2 }}>
              {eye === "re" && <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>VA</Text>}
              {readOnly ? (
                <View style={{ width: "100%", borderWidth: 1.5, borderColor: colors.primary + "60", borderRadius: 6, paddingVertical: 9, alignItems: "center", backgroundColor: colors.secondary }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.primary }}>{rx.va || "—"}</Text>
                </View>
              ) : (
                <VAPicker
                  value={rx.va}
                  onChange={(v) => onFn(eye, "va", v)}
                  fieldLabel="VA"
                  eyeLabel={eye === "re" ? "RE" : "LE"}
                  options={vaOptions}
                />
              )}
            </View>
          </View>
        );
      })}
    </>
  );
}

function SpectacleTable({ reD, leD, reN, leN, ipd, nearIPD, addValue, onChangeRxD, onChangeRxN, onChangeIPD, onChangeAdd, distanceVA, nearVA }: {
  reD: EyeSpectacleRx; leD: EyeSpectacleRx;
  reN: EyeSpectacleRx; leN: EyeSpectacleRx;
  ipd: string; nearIPD: string; addValue: string;
  onChangeRxD: (eye: "re" | "le", f: keyof EyeSpectacleRx, v: string) => void;
  onChangeRxN: (eye: "re" | "le", f: keyof EyeSpectacleRx, v: string) => void;
  onChangeIPD: (v: string) => void;
  onChangeAdd: (v: string) => void;
  distanceVA: string[];
  nearVA: string[];
}) {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
      <RxBlock title="Distance (D)" re={reD} le={leD} onFn={onChangeRxD} vaOptions={distanceVA} />

      {/* ── Presbyopic Addition ── */}
      <View style={{ borderTopWidth: 2, borderTopColor: colors.border, backgroundColor: colors.secondary + "80", paddingHorizontal: 12, paddingVertical: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: colors.primary }}>Presbyopic Addition</Text>
            <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 }}>Auto-fills Near SPH for both eyes</Text>
          </View>
          <SpectacleValuePicker
            values={ADD_VALUES} value={addValue} onChange={onChangeAdd}
            format={formatAdd} placeholder="0.00 Add"
            accentColor="#0FA3B1"
          />
        </View>
      </View>

      <RxBlock title="Near (N)" re={reN} le={leN} onFn={onChangeRxN} readOnly={false} vaOptions={nearVA} />

      {/* ── IPD ── */}
      <View style={{ borderTopWidth: 2, borderTopColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>IPD (mm)</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 4 }}>Distance</Text>
            <TextInput
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center", backgroundColor: colors.surface }}
              value={ipd} onChangeText={(v) => onChangeIPD(v.replace(/[^0-9]/g, "").slice(0, 2))}
              placeholder="64" keyboardType="number-pad" maxLength={2}
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 4 }}>Near (auto)</Text>
            <View style={{ borderWidth: 1.5, borderColor: nearIPD ? colors.accent + "80" : colors.border, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: nearIPD ? colors.secondary : colors.surface, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: nearIPD ? colors.accent : colors.mutedForeground }}>
                {nearIPD || "—"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ───────── Drug Row ───────── */

function defaultDosePhase(formulation: DrugFormulation, connector?: DrugInstructionConnector): DrugDosePhase {
  const common = { durationValue: "৭", durationUnit: "দিন" as const, connector };
  if (formulation === "Syrup") {
    return { ...common, amount: "১", unit: "চা-চামচ", frequency: "২ বার", schedule: "১ চা-চামচ দিনে ২ বার" };
  }
  if (formulation === "Eye Drop/Gel") {
    return { ...common, frequency: "৪ ঘণ্টা পরপর", site: "বাম", schedule: "১ ফোঁটা করে ৪ ঘণ্টা পরপর বাম চোখে" };
  }
  if (formulation === "Eye Ointment" || formulation === "Topical Ointment/Cream") {
    return { ...common, frequency: "দিনে ৩ বার", site: "ক্ষতস্থানে", schedule: "ক্ষতস্থানে লাগাবেন দিনে ৩ বার" };
  }
  return { ...common, schedule: "০+০+১" };
}

function phaseDuration(phase: DrugDosePhase): string {
  return `${phase.durationValue} ${phase.durationUnit}`;
}

function phaseSchedule(formulation: DrugFormulation, phase: DrugDosePhase): string {
  if (formulation === "Syrup") return `${phase.amount || "১"} ${phase.unit || "চা-চামচ"} দিনে ${phase.frequency || "২ বার"}`;
  if (formulation === "Eye Drop/Gel") return `১ ফোঁটা করে ${phase.frequency || "৪ ঘণ্টা পরপর"} ${phase.site || "বাম"} চোখে`;
  if (formulation === "Eye Ointment" || formulation === "Topical Ointment/Cream") {
    return `${phase.site || "ক্ষতস্থানে"} লাগাবেন ${phase.frequency || "দিনে ৩ বার"}`;
  }
  return phase.schedule;
}

function inferFormulation(drug: Drug): DrugFormulation | undefined {
  if (drug.formulation) return drug.formulation;
  if (/eye drop|gel/i.test(drug.route)) return "Eye Drop/Gel";
  if (/eye ointment/i.test(drug.route)) return "Eye Ointment";
  if (/topical/i.test(drug.route)) return "Topical Ointment/Cream";
  if (/oral/i.test(drug.route)) return "Tablet";
  return undefined;
}

function legacyDosePhase(drug: Drug, formulation: DrugFormulation): DrugDosePhase {
  const phase = defaultDosePhase(formulation);
  const duration = tobnDigits(drug.durationBn || drug.duration)
    .replace(/\bdays?\b/i, "দিন")
    .replace(/\bweeks?\b/i, "সপ্তাহ")
    .replace(/\bmonths?\b/i, "মাস")
    .trim();
  const durationMatch = duration.match(/^(.+?)\s*(দিন|সপ্তাহ|মাস)$/);
  return {
    ...phase,
    schedule: drug.scheduleBn || tobnDigits(drug.schedule) || phase.schedule,
    durationValue: durationMatch?.[1]?.trim() || phase.durationValue,
    durationUnit: (durationMatch?.[2] as DrugDosePhase["durationUnit"]) || phase.durationUnit,
  };
}

function InlineChoice({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 5 }}>
      <TouchableOpacity
        style={{ borderWidth: 1.5, borderColor: open ? colors.primary : colors.border, borderRadius: 8, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}
        onPress={() => setOpen((current) => !current)}
      >
        <Text style={{ flex: 1, color: value ? colors.foreground : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_500Medium" }}>{value || placeholder}</Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
      {open ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={{ borderWidth: 1, borderColor: value === option ? colors.primary : colors.border, backgroundColor: value === option ? colors.secondary : colors.card, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 }}
              onPress={() => { onChange(option); setOpen(false); }}
            >
              <Text style={{ color: value === option ? colors.primary : colors.foreground, fontSize: 12, fontFamily: "Inter_500Medium" }}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DrugNameInput({
  value,
  onChange,
  options,
  usageCounts,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  usageCounts: Record<string, number>;
}) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const matches = value.trim()
    ? options
      .filter((option) => option.toLowerCase().startsWith(value.trim().toLowerCase()) && option.toLowerCase() !== value.trim().toLowerCase())
      .sort((a, b) => (usageCounts[b.toLowerCase()] || 0) - (usageCounts[a.toLowerCase()] || 0) || a.localeCompare(b))
      .slice(0, 5)
    : [];
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Start typing drug name…"
        placeholderTextColor={colors.mutedForeground}
        style={{ borderWidth: 1.5, borderColor: focused ? colors.primary : colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: colors.foreground, backgroundColor: colors.surface, fontSize: 14, fontFamily: "Inter_400Regular" }}
      />
      {focused && matches.length ? (
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.card, overflow: "hidden", marginTop: 3 }}>
          {matches.map((option) => (
            <TouchableOpacity key={option} style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => { onChange(option); setFocused(false); }}>
              <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium" }}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DosePhaseEditor({
  formulation,
  phase,
  index,
  onChange,
}: {
  formulation: DrugFormulation;
  phase: DrugDosePhase;
  index: number;
  onChange: (phase: DrugDosePhase) => void;
}) {
  const colors = useColors();
  const update = (patch: Partial<DrugDosePhase>) => {
    const next = { ...phase, ...patch };
    onChange({ ...next, schedule: phaseSchedule(formulation, next) });
  };
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, marginTop: 10, gap: 8, backgroundColor: colors.surface }}>
      <MiniLabel label={index === 0 ? "Dose schedule" : `${phase.connector || "পরবর্তী"} dose schedule`} />
      {formulation === "Tablet" || formulation === "Capsule" ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {TABLET_SCHEDULES.map((schedule) => (
              <TouchableOpacity key={schedule} style={{ borderWidth: 1, borderColor: phase.schedule === schedule ? colors.primary : colors.border, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: phase.schedule === schedule ? colors.secondary : colors.card }} onPress={() => update({ schedule })}>
                <Text style={{ color: phase.schedule === schedule ? colors.primary : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>{schedule}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={phase.schedule}
            onChangeText={(value) => update({ schedule: tobnDigits(value) })}
            placeholder="নিজস্ব ডোজ লিখুন, যেমন 2+0+1"
            placeholderTextColor={colors.mutedForeground}
            style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, color: colors.foreground, backgroundColor: colors.card, fontSize: 13 }}
          />
        </>
      ) : formulation === "Syrup" ? (
        <View style={{ gap: 7 }}>
          <InlineChoice value={phase.amount || "১"} options={SYRUP_AMOUNTS} onChange={(amount) => update({ amount })} placeholder="পরিমাণ" />
          <InlineChoice value={phase.unit || "চা-চামচ"} options={SYRUP_UNITS} onChange={(unit) => update({ unit })} placeholder="একক" />
          <InlineChoice value={phase.frequency || "২ বার"} options={SYRUP_FREQUENCIES} onChange={(frequency) => update({ frequency })} placeholder="কতবার" />
        </View>
      ) : formulation === "Eye Drop/Gel" ? (
        <View style={{ gap: 7 }}>
          <InlineChoice value={phase.frequency || "৪ ঘণ্টা পরপর"} options={DROP_FREQUENCIES} onChange={(frequency) => update({ frequency })} placeholder="ব্যবহারের সময়" />
          <InlineChoice value={phase.site || "বাম"} options={DROP_SITES} onChange={(site) => update({ site })} placeholder="চোখ" />
        </View>
      ) : (
        <View style={{ gap: 7 }}>
          <InlineChoice value={phase.site || "ক্ষতস্থানে"} options={OINTMENT_SITES} onChange={(site) => update({ site })} placeholder="প্রয়োগের স্থান" />
          <InlineChoice value={phase.frequency || "দিনে ৩ বার"} options={OINTMENT_FREQUENCIES} onChange={(frequency) => update({ frequency })} placeholder="কতবার" />
        </View>
      )}
      <View style={{ paddingVertical: 7, paddingHorizontal: 9, borderRadius: 8, backgroundColor: colors.secondary }}>
        <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{phaseSchedule(formulation, phase)}</Text>
      </View>
      <MiniLabel label="Duration" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><InlineChoice value={phase.durationValue} options={DURATION_VALUES} onChange={(durationValue) => update({ durationValue })} placeholder="সংখ্যা" /></View>
        <View style={{ flex: 1 }}><InlineChoice value={phase.durationUnit} options={DURATION_UNITS} onChange={(durationUnit) => update({ durationUnit: durationUnit as DrugDosePhase["durationUnit"] })} placeholder="একক" /></View>
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_500Medium" }}>{phaseSchedule(formulation, phase)} — {phaseDuration(phase)}</Text>
    </View>
  );
}

function DrugRow({ drug, onChange, onDelete, drugNameOptions, usageCounts }: {
  drug: Drug;
  onChange: (updated: Drug) => void;
  onDelete: () => void;
  drugNameOptions: string[];
  usageCounts: Record<string, number>;
}) {
  const colors = useColors();
  const formulation = inferFormulation(drug);
  const phases = drug.dosePhases?.length
    ? drug.dosePhases
    : formulation
      ? [legacyDosePhase(drug, formulation)]
      : [];

  const savePhases = (next: DrugDosePhase[]) => {
    const first = next[0];
    onChange({
      ...drug,
      dosePhases: next,
      schedule: first?.schedule || "",
      scheduleBn: "",
      duration: first ? phaseDuration(first) : "",
      durationBn: "",
    });
  };

  const selectFormulation = (nextFormulation: DrugFormulation) => {
    const first = defaultDosePhase(nextFormulation);
    onChange({ ...drug, formulation: nextFormulation, route: nextFormulation, dosePhases: [first], schedule: first.schedule, scheduleBn: "", duration: phaseDuration(first), durationBn: "" });
  };

  const addPhase = (connector: DrugInstructionConnector) => {
    if (!formulation) return;
    savePhases([...phases, defaultDosePhase(formulation, connector)]);
  };

  const setPhaseConnector = (phaseIndex: number, connector: DrugInstructionConnector) => {
    if (phaseIndex < 1) return;
    savePhases(phases.map((phase, index) => index === phaseIndex ? { ...phase, connector } : phase));
  };

  const removePhase = (phaseIndex: number) => {
    if (phaseIndex < 1) return;
    savePhases(phases.filter((_, index) => index !== phaseIndex));
  };

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>Drug</Text>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <MiniLabel label="1. Choose formulation" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {DRUG_FORMULATIONS.map((item) => (
          <TouchableOpacity key={item}
            style={{ borderWidth: 1.5, borderColor: formulation === item ? colors.primary : colors.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: formulation === item ? colors.secondary : colors.card }}
            onPress={() => selectFormulation(item)}
          >
            <Text style={{ fontSize: 12, fontFamily: formulation === item ? "Inter_600SemiBold" : "Inter_500Medium", color: formulation === item ? colors.primary : colors.mutedForeground }}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {formulation ? (
        <>
          <View style={{ marginTop: 10 }}>
            <MiniLabel label="2. Drug name" />
            <DrugNameInput value={drug.name} onChange={(name) => onChange({ ...drug, name })} options={drugNameOptions} usageCounts={usageCounts} />
          </View>
          {phases.map((phase, index) => (
            <View key={`${drug.id}-phase-${index}`}>
              <DosePhaseEditor
                formulation={formulation}
                phase={phase}
                index={index}
                onChange={(nextPhase) => savePhases(phases.map((item, itemIndex) => itemIndex === index ? nextPhase : item))}
              />
              {index > 0 ? (
                <View style={{ flexDirection: "row", gap: 6, marginTop: 6, paddingHorizontal: 10 }}>
                  {(["এবং", "তারপর"] as DrugInstructionConnector[]).map((connector) => (
                    <TouchableOpacity
                      key={connector}
                      style={{ flex: 1, borderWidth: 1, borderColor: phase.connector === connector ? colors.primary : colors.border, backgroundColor: phase.connector === connector ? colors.secondary : colors.card, borderRadius: 8, paddingVertical: 6, alignItems: "center" }}
                      onPress={() => setPhaseConnector(index, connector)}
                    >
                      <Text style={{ color: phase.connector === connector ? colors.primary : colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{connector}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={{ borderWidth: 1, borderColor: colors.destructive, borderRadius: 8, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" }}
                    onPress={() => removePhase(index)}
                  >
                    <Feather name="trash-2" size={13} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))}
          <View style={{ marginTop: 10 }}>
            <MiniLabel label="Add another treatment stage" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["এবং", "তারপর"] as DrugInstructionConnector[]).map((connector) => (
                <TouchableOpacity
                  key={connector}
                  style={{ flex: 1, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 9, alignItems: "center", paddingVertical: 9 }}
                  onPress={() => addPhase(connector)}
                >
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>+ {connector}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      ) : (
        <Text style={{ marginTop: 9, color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>Choose a formulation before entering the drug and dosage.</Text>
      )}
      <View style={{ marginTop: 10 }}>
        <MiniLabel label="Notes (optional)" />
        <SmartInput fieldKey="drug_notes" value={drug.notes} onChangeText={(notes) => onChange({ ...drug, notes })} placeholder="Special instructions…" />
      </View>
    </View>
  );
}

/* ───────── Main screen ───────── */

export default function NewRxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { patients, prescriptions, addPrescription, updatePrescription, addPatient, getPatientByPuid, prescriptionConfig, updatePrescriptionConfig, loading: dataLoading } = useData();
  const s = styles(colors);
  const { duplicateFrom, editId, patientId } = useLocalSearchParams<{ duplicateFrom?: string; editId?: string; patientId?: string }>();
  const hydratedSourceRef = useRef("");

  const [cameraPermission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [scanProcessed, setScanProcessed] = useState(false);

  const ccSugg = useSuggestions("chief_complaints");
  const adnexaSugg = useSuggestions("adnexa");
  const anteriorSugg = useSuggestions("anterior_segment");
  const posteriorSugg = useSuggestions("posterior_segment");
  const adviceSugg = useSuggestions("advice");
  const drugNameSugg = useSuggestions("drug_name");

  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientAgeUnit, setPatientAgeUnit] = useState<AgeUnit>("years");
  const [patientWeight, setPatientWeight] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientPuid, setPatientPuid] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [reVA, setReVA] = useState<EyeVA>(EMPTY_VA);
  const [leVA, setLeVA] = useState<EyeVA>(EMPTY_VA);
  const [vaMode, setVaMode] = useState<"ua" | "wa">("ua");

  const [chiefComplaints, setChiefComplaints] = useState("");
  const [chiefComplaintSelections, setChiefComplaintSelections] = useState<ChiefComplaintSelection[]>([]);
  const [customComplaint, setCustomComplaint] = useState("");
  const [showComplaintPicker, setShowComplaintPicker] = useState(false);
  const [history, setHistory] = useState<PastHistory>(EMPTY_HISTORY);
  const [pastHistoryNotes, setPastHistoryNotes] = useState("");

  const [adnexa, setAdnexa] = useState("");
  const [anteriorSegment, setAnteriorSegment] = useState("");
  const [posteriorSegment, setPosteriorSegment] = useState("");

  const [gatRight, setGatRight] = useState("");
  const [gatLeft, setGatLeft] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const [drugs, setDrugs] = useState<Drug[]>([emptyDrug()]);

  const [reD, setReD] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [leD, setLeD] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [reN, setReN] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [leN, setLeN] = useState<EyeSpectacleRx>(EMPTY_RX);
  const [ipd, setIpd] = useState("");
  const [addValue, setAddValue] = useState("");

  // Near IPD = Distance IPD - 4
  const nearIPD = ipd && !isNaN(parseInt(ipd)) ? String(Math.max(0, parseInt(ipd) - 4)) : "";

  // Auto-fill Near SPH when Add changes; copy CYL + AXIS from Distance
  useEffect(() => {
    if (!addValue) return;
    const add = parseFloat(addValue.replace("+", "")) || 0;
    const applyAdd = (distSph: string): string => {
      const d = parseFloat(distSph.replace("+", "")) || 0;
      const r = Math.round((d + add) * 100) / 100;
      if (r === 0) return "0.00";
      return r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2);
    };
    setReN((prev) => ({ ...prev, dsp: applyAdd(reD.dsp), dcyl: reD.dcyl, axis: reD.axis }));
    setLeN((prev) => ({ ...prev, dsp: applyAdd(leD.dsp), dcyl: leD.dcyl, axis: leD.axis }));
  }, [addValue, reD.dsp, leD.dsp, reD.dcyl, leD.dcyl, reD.axis, leD.axis]);

  const [lensUsage, setLensUsage] = useState("");
  const [lensType, setLensType] = useState("");
  const [lensCoating, setLensCoating] = useState<string[]>([]);
  const [lensMaterial, setLensMaterial] = useState("");
  const [investigations, setInvestigations] = useState("");

  const [advice, setAdvice] = useState("");
  const [adviceBn, setAdviceBn] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpBn, setFollowUpBn] = useState("");
  const [customSections, setCustomSections] = useState<CustomPrescriptionSection[]>([]);
  const [sectionFields, setSectionFields] = useState<Record<string, ConfigurableFieldValue>>({});

  const [saving, setSaving] = useState(false);
  const chiefComplaintOptions = useMemo(() => {
    const options = [...prescriptionConfig.chiefComplaints, ...ccSugg.all];
    return options.filter((complaint, index) =>
      complaint.trim() && options.findIndex((item) => item.toLowerCase() === complaint.toLowerCase()) === index
    );
  }, [prescriptionConfig.chiefComplaints, ccSugg.all]);

  const saveCustomComplaintOption = useCallback(async () => {
    const complaint = customComplaint.trim();
    if (!complaint) return;
    ccSugg.add(complaint);
    if (!prescriptionConfig.chiefComplaints.some((item) => item.toLowerCase() === complaint.toLowerCase())) {
      await updatePrescriptionConfig({
        ...prescriptionConfig,
        chiefComplaints: [...prescriptionConfig.chiefComplaints, complaint],
      });
    }
  }, [ccSugg, customComplaint, prescriptionConfig, updatePrescriptionConfig]);

  const filteredPatients = useMemo(() => {
    if (!patientQuery.trim()) return patients.slice(0, 8);
    const q = patientQuery.trim().toLowerCase();
    return patients.filter((p) =>
      p.name.toLowerCase().includes(q)
      || p.phone.toLowerCase().includes(q)
      || (p.puid || "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [patients, patientQuery]);

  const drugUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    prescriptions.forEach((prescription) => prescription.drugs.forEach((drug) => {
      const key = drug.name.trim().toLowerCase();
      if (key) counts[key] = (counts[key] || 0) + 1;
    }));
    return counts;
  }, [prescriptions]);

  const drugNameOptions = useMemo(() => {
    const names = [
      ...prescriptions.flatMap((prescription) => prescription.drugs.map((drug) => drug.name)),
      ...drugNameSugg.all,
      "Optimox",
      "Optafenac TS",
    ].map((name) => name.trim()).filter(Boolean);
    return names.filter((name, index) => names.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index);
  }, [drugNameSugg.all, prescriptions]);

  // ── Duplicate Rx pre-fill ──
  useEffect(() => {
    if (dataLoading) return;
    const sourceId = editId || duplicateFrom;
    const hydrationKey = sourceId ? `${sourceId}:${editId ? "edit" : "duplicate"}` : patientId ? `patient:${patientId}` : "";
    if (!hydrationKey || hydratedSourceRef.current === hydrationKey) return;
    const source = prescriptions.find((r) => r.id === sourceId);
    if (!sourceId && patientId) {
      const patient = patients.find((item) => item.id === patientId);
      if (patient) {
        hydratedSourceRef.current = hydrationKey;
        setSelectedPatient(patient);
        setPatientQuery(patient.name);
        setPatientPhone(patient.phone);
        setPatientPuid(patient.puid || "");
        const patientAgeValue = parseAge(patient.ageAtEnrollment || "");
        setPatientAge(patientAgeValue.number);
        setPatientAgeUnit(patientAgeValue.unit);
      }
      return;
    }
    if (!source) return;
    hydratedSourceRef.current = hydrationKey;
    const patient = patients.find((p) => p.id === source.patientId);
    if (patient) {
      setSelectedPatient(patient);
      setPatientQuery(patient.name);
      setPatientPhone(source.patientPhone ?? patient.phone);
      setPatientPuid(source.patientPuid ?? patient.puid ?? "");
    }
    const sourceAge = parseAge(source.patientAge);
    setPatientAge(sourceAge.number);
    setPatientAgeUnit(sourceAge.unit);
    setPatientWeight(source.patientWeight || "");
    setPrescriptionDate(editId ? source.date : new Date().toISOString().split("T")[0]);
    const sourceVaMode = (source.rightEyeVA.wa || source.leftEyeVA.wa) && !(source.rightEyeVA.ua || source.leftEyeVA.ua) ? "wa" : "ua";
    setVaMode(sourceVaMode);
    setReVA({ ...source.rightEyeVA, [sourceVaMode === "ua" ? "wa" : "ua"]: "" });
    setLeVA({ ...source.leftEyeVA, [sourceVaMode === "ua" ? "wa" : "ua"]: "" });
    setChiefComplaints(source.chiefComplaints);
    setChiefComplaintSelections(source.chiefComplaintSelections || []);
    setCustomComplaint(source.customComplaint || (!source.chiefComplaintSelections?.length ? source.chiefComplaints : ""));
    setHistory(source.pastHistory);
    setPastHistoryNotes(source.pastHistoryNotes || "");
    setSectionFields(source.sectionFields || {});
    setAdnexa(source.sectionFields?.["examination:adnexa"]?.freeText ?? source.adnexa);
    setAnteriorSegment(source.sectionFields?.["examination:anteriorSegment"]?.freeText ?? source.anteriorSegment);
    setPosteriorSegment(source.sectionFields?.["examination:posteriorSegment"]?.freeText ?? source.posteriorSegment);
    setGatRight(source.gatRight); setGatLeft(source.gatLeft);
    setDiagnosis(source.sectionFields?.diagnosis?.freeText ?? source.diagnosis ?? "");
    setDrugs(source.drugs.length ? source.drugs.map((d) => ({ ...d, id: newId() })) : [emptyDrug()]);
    setReD(source.rightEyeDistance); setLeD(source.leftEyeDistance);
    setReN(source.rightEyeNear); setLeN(source.leftEyeNear);
    setIpd(source.ipd); setAddValue(source.addValue || "");
    setLensUsage(source.lensUsage); setLensType(source.lensType);
    setLensCoating(source.lensCoating || []); setLensMaterial(source.lensMaterial);
    const legacyInvestigations = source.customSections?.find((section) =>
      section.id === "investigations" || section.title.trim().toLowerCase() === "investigations"
    );
    setInvestigations(source.sectionFields?.investigations?.freeText ?? source.investigations ?? legacyInvestigations?.freeText ?? legacyInvestigations?.content ?? "");
    setAdvice(source.sectionFields?.advice?.freeText ?? source.advice); setAdviceBn(source.adviceBn);
    setFollowUp(source.followUp); setFollowUpBn(source.followUpBn);
    setCustomSections(source.customSections || []);
  }, [dataLoading, duplicateFrom, editId, patientId, patients, prescriptions]);

  const sectionTitle = (id: string, fallback: string) =>
    prescriptionConfig.sections.find((section) => section.id === id)?.title || fallback;
  const categoryTitle = (id: string, fallback: string) =>
    prescriptionConfig.categoryTitles?.[id] || fallback;
  const sectionEnabled = (id: string) =>
    id === "patient" || prescriptionConfig.sections.find((section) => section.id === id)?.enabled !== false;
  const getSectionField = (key: string, fallback = ""): ConfigurableFieldValue =>
    sectionFields[key] || { selectedOptions: [], freeText: fallback };
  const updateSectionField = (key: string, value: ConfigurableFieldValue) =>
    setSectionFields((current) => ({ ...current, [key]: value }));
  const getCustomSectionField = (id: string): ConfigurableFieldValue => {
    const existing = customSections.find((section) => section.id === id);
    return {
      selectedOptions: existing?.selectedOptions || [],
      freeText: existing?.freeText ?? (existing?.selectedOptions?.length ? "" : existing?.content || ""),
    };
  };
  const updateCustomSection = (id: string, value: ConfigurableFieldValue) => {
    setCustomSections((current) => {
      const existing = current.find((section) => section.id === id);
      const content = configurableFieldText(value);
      if (existing) {
        return current.map((section) => section.id === id
          ? { ...section, content, selectedOptions: value.selectedOptions, freeText: value.freeText }
          : section);
      }
      const definition = prescriptionConfig.sections.find((section) => section.id === id);
      return definition
        ? [...current, { id, title: definition.title, content, selectedOptions: value.selectedOptions, freeText: value.freeText }]
        : current;
    });
  };

  // ── QR scanner handler ──
  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (scanProcessed) return;
    setScanProcessed(true);
    const puid = data.trim().toUpperCase();
    const found = getPatientByPuid(puid);
    if (found) {
      setSelectedPatient(found);
      setPatientQuery(found.name);
      setPatientPhone(found.phone);
      setPatientPuid(found.puid || "");
      const foundAge = parseAge(found.ageAtEnrollment || "");
      setPatientAge(foundAge.number);
      setPatientAgeUnit(foundAge.unit);
      setShowDropdown(false);
      setShowScanner(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert("Patient Not Found", `No patient with ID ${puid} found.`, [
        { text: "OK", onPress: () => setScanProcessed(false) },
      ]);
    }
  }, [scanProcessed, getPatientByPuid]);

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Camera Access", "Camera permission is required to scan QR codes.");
        return;
      }
    }
    setScanProcessed(false);
    setShowScanner(true);
  };

  const updateDrug = (id: string, updated: Drug) =>
    setDrugs((ds) => ds.map((d) => (d.id === id ? updated : d)));
  const removeDrug = (id: string) =>
    setDrugs((ds) => ds.filter((d) => d.id !== id));
  const addDrug = () => setDrugs((ds) => [...ds, emptyDrug()]);

  const handleSave = async () => {
    if (!selectedPatient && !isNewPatient) {
      Alert.alert("Missing Patient", "Please select or create a patient.");
      return;
    }
    if (isNewPatient && !newPatientName.trim()) {
      Alert.alert("Missing Name", "Please enter the patient name.");
      return;
    }
    const incompleteComplaint = chiefComplaintSelections.find(
      (selection) => selection.complaint !== "Headache" && !selection.laterality,
    );
    if (incompleteComplaint) {
      setShowComplaintPicker(true);
      Alert.alert(
        "Select an eye side",
        `Choose R, L, or B for ${incompleteComplaint.complaint}.`,
      );
      return;
    }
    const investigationsField = getSectionField("investigations", investigations);
    const incompleteInvestigation = investigationsField.selectedOptions.find(
      (option) => OPHTHALMIC_INVESTIGATIONS.has(option) && !investigationsField.optionLateralities?.[option],
    );
    if (incompleteInvestigation) {
      Alert.alert("Select an eye side", `Choose R, L, or B for ${incompleteInvestigation}.`);
      return;
    }
    setSaving(true);
    try {
      let patient = selectedPatient;
      const formattedPatientAge = formatAge(patientAge, patientAgeUnit);
      if (isNewPatient) {
        patient = await addPatient({ name: newPatientName.trim(), dob: "", phone: patientPhone.trim(), email: "", gender: "", ageAtEnrollment: formattedPatientAge });
      }
      if (!patient) return;

      // Auto-save suggestions
      if (customComplaint.trim()) ccSugg.add(customComplaint);
      const adnexaField = getSectionField("examination:adnexa", adnexa);
      const anteriorField = getSectionField("examination:anteriorSegment", anteriorSegment);
      const posteriorField = getSectionField("examination:posteriorSegment", posteriorSegment);
      const diagnosisField = getSectionField("diagnosis", diagnosis);
      const adviceField = getSectionField("advice", advice);
      if (adnexaField.freeText.trim()) adnexaSugg.add(adnexaField.freeText);
      if (anteriorField.freeText.trim()) anteriorSugg.add(anteriorField.freeText);
      if (posteriorField.freeText.trim()) posteriorSugg.add(posteriorField.freeText);
      if (adviceField.freeText.trim()) adviceSugg.add(adviceField.freeText);
      drugs.forEach((d) => { if (d.name) drugNameSugg.add(d.name); });

      const appendOption = (options: string[] = [], value: string) => {
        const trimmed = value.trim();
        return !trimmed || options.some((item) => item.toLowerCase() === trimmed.toLowerCase())
          ? options
          : [...options, trimmed];
      };
      const learnedSections = prescriptionConfig.sections.map((section) => {
        if (section.id === "examination") {
          return {
            ...section,
            subsections: (section.subsections || []).map((subsection) => ({
              ...subsection,
              options: appendOption(
                subsection.options,
                getSectionField(
                  `examination:${subsection.id}`,
                  subsection.id === "adnexa" ? adnexa
                    : subsection.id === "anteriorSegment" ? anteriorSegment
                    : subsection.id === "posteriorSegment" ? posteriorSegment
                    : ""
                ).freeText
              ),
            })),
          };
        }
        if (section.id === "advice") {
          return { ...section, options: appendOption(section.options, adviceField.freeText) };
        }
        if (section.id === "diagnosis") {
          return { ...section, options: appendOption(section.options, diagnosisField.freeText) };
        }
        if (section.id === "investigations") {
          return { ...section, options: appendOption(section.options, investigationsField.freeText) };
        }
        if (!section.builtIn) {
          return {
            ...section,
            options: appendOption(section.options, getCustomSectionField(section.id).freeText),
            subsections: (section.subsections || []).map((subsection) => ({
              ...subsection,
              options: appendOption(
                subsection.options,
                getSectionField(`custom:${section.id}:${subsection.id}`).freeText
              ),
            })),
          };
        }
        return section;
      });
      await updatePrescriptionConfig({
        ...prescriptionConfig,
        chiefComplaints: appendOption(prescriptionConfig.chiefComplaints, customComplaint),
        sections: learnedSections,
      });

      const finalAdnexa = configurableFieldText(adnexaField);
      const finalAnteriorSegment = configurableFieldText(anteriorField);
      const finalPosteriorSegment = configurableFieldText(posteriorField);
      const finalDiagnosis = configurableFieldText(diagnosisField);
      const finalInvestigations = configurableFieldText(investigationsField);
      const finalAdvice = configurableFieldText(adviceField);
      const savedCustomSections = prescriptionConfig.sections
        .filter((section) => !section.builtIn && section.enabled && section.title.trim().toLowerCase() !== "investigations")
        .map((section) => {
          const mainValue = getCustomSectionField(section.id);
          const subsectionValues = (section.subsections || [])
            .filter((subsection) => subsection.enabled)
            .map((subsection) => ({
              title: subsection.title,
              content: configurableFieldText(getSectionField(`custom:${section.id}:${subsection.id}`)),
            }))
            .filter((subsection) => subsection.content);
          const contentParts = [
            configurableFieldText(mainValue),
            ...subsectionValues.map((subsection) => `${subsection.title}: ${subsection.content}`),
          ].filter(Boolean);
          return {
            id: section.id,
            title: section.title,
            content: contentParts.join("\n"),
            selectedOptions: mainValue.selectedOptions,
            freeText: mainValue.freeText,
          };
        })
        .filter((section) => section.content);
      const extraExaminationSections = (prescriptionConfig.sections.find((section) => section.id === "examination")?.subsections || [])
        .filter((subsection) => !subsection.builtIn && subsection.enabled)
        .map((subsection) => ({
          id: `examination:${subsection.id}`,
          title: subsection.title,
          content: configurableFieldText(getSectionField(`examination:${subsection.id}`)),
        }))
        .filter((section) => section.content);
      const configuredSubsections = prescriptionConfig.sections
        .filter((section) => section.builtIn && section.id !== "examination")
        .flatMap((section) => (section.subsections || [])
          .filter((subsection) => subsection.enabled)
          .map((subsection) => ({
            id: `configured:${section.id}:${subsection.id}`,
            title: `${section.title} — ${subsection.title}`,
            content: configurableFieldText(getSectionField(`configured:${section.id}:${subsection.id}`)),
          })))
        .filter((section) => section.content);
      const configuredSectionOptions = prescriptionConfig.sections
        .filter((section) => section.builtIn && !["diagnosis", "investigations", "advice"].includes(section.id) && section.options?.length)
        .map((section) => ({
          id: `configured-section:${section.id}`,
          title: section.title,
          content: configurableFieldText(getSectionField(`configured-section:${section.id}`)),
        }))
        .filter((section) => section.content);
      const prescriptionData = {
        patientId: patient.id, patientName: patient.name, patientAge: formattedPatientAge,
        patientWeight: patientWeight.trim(),
        patientPhone: patientPhone.trim() || patient.phone,
        patientPuid: patient.puid || patientPuid,
        date: prescriptionDate,
        rightEyeVA: reVA, leftEyeVA: leVA,
        chiefComplaints, chiefComplaintSelections, customComplaint: customComplaint.trim(),
        pastHistory: history, pastHistoryNotes: pastHistoryNotes.trim(),
        adnexa: finalAdnexa, anteriorSegment: finalAnteriorSegment, posteriorSegment: finalPosteriorSegment,
        gatRight, gatLeft,
        diagnosis: finalDiagnosis,
        drugs: drugs.filter((d) => d.name.trim()),
        rightEyeDistance: reD, leftEyeDistance: leD,
        rightEyeNear: reN, leftEyeNear: leN, ipd, nearIPD, addValue,
        lensUsage, lensType, lensCoating, lensMaterial,
        investigations: finalInvestigations,
        advice: finalAdvice, adviceBn, followUp, followUpBn,
        customSections: [...savedCustomSections, ...extraExaminationSections, ...configuredSubsections, ...configuredSectionOptions],
        sectionFields: {
          ...sectionFields,
          "examination:adnexa": adnexaField,
          "examination:anteriorSegment": anteriorField,
          "examination:posteriorSegment": posteriorField,
          diagnosis: diagnosisField,
          investigations: investigationsField,
          advice: adviceField,
        },
        sectionTitles: Object.fromEntries(prescriptionConfig.sections.map((section) => [section.id, section.title])),
        subsectionTitles: Object.fromEntries(
          prescriptionConfig.sections.flatMap((section) =>
            (section.subsections || []).map((subsection) => [`${section.id}:${subsection.id}`, subsection.title])
          )
        ),
        hiddenSections: prescriptionConfig.sections.filter((section) => !section.enabled).map((section) => section.id),
      };
      if (editId) {
        await updatePrescription(editId, prescriptionData);
      } else {
        await addPrescription(prescriptionData);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save prescription.");
    } finally {
      setSaving(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>

      {/* ─── QR Scanner Modal ─── */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanProcessed ? undefined : handleBarCodeScanned}
          />
          {/* Overlay frame */}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", pointerEvents: "none" }}>
            <View style={{ width: 220, height: 220, borderWidth: 3, borderColor: "#fff", borderRadius: 16, opacity: 0.85 }} />
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 20, textAlign: "center", textShadowColor: "#000", textShadowRadius: 4 }}>
              Point at a patient QR code
            </Text>
          </View>
          <View style={{ position: "absolute", top: (Platform.OS === "web" ? 20 : insets.top) + 8, left: 16 }}>
            <TouchableOpacity
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}
              onPress={() => setShowScanner(false)}
            >
              <Feather name="x" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Chief complaints picker ─── */}
      <Modal
        visible={showComplaintPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComplaintPicker(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.complaintModal}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>{categoryTitle("chiefComplaints", "Chief Complaints")}</Text>
                <Text style={s.modalSub}>Select symptoms and the affected eye</Text>
              </View>
              <TouchableOpacity style={s.modalClose} onPress={() => setShowComplaintPicker(false)}>
                <Feather name="x" size={19} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <KeyboardAwareScrollView
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {chiefComplaintOptions.map((complaint) => {
                const selection = chiefComplaintSelections.find((item) => item.complaint === complaint);
                const selected = Boolean(selection);
                return (
                  <View key={complaint} style={[s.complaintRow, selected && s.complaintRowSelected]}>
                    <TouchableOpacity
                      style={s.complaintNameButton}
                      onPress={() => {
                        setChiefComplaintSelections((current) => selected
                          ? current.filter((item) => item.complaint !== complaint)
                          : [...current, { complaint }]);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[s.checkbox, selected && s.checkboxSelected]}>
                        {selected && <Feather name="check" size={12} color="#fff" />}
                      </View>
                      <Text style={[s.complaintName, selected && s.complaintNameSelected]}>{complaint}</Text>
                    </TouchableOpacity>
                    {selected && complaint !== "Headache" && (
                      <View style={s.lateralityGroup}>
                        {LATERALITIES.map((side) => (
                          <TouchableOpacity
                            key={side}
                            style={[s.lateralityButton, selection?.laterality === side && s.lateralityButtonSelected]}
                            onPress={() => setChiefComplaintSelections((current) => current.map((item) =>
                              item.complaint === complaint ? { ...item, laterality: side } : item,
                            ))}
                          >
                            <Text style={[s.lateralityText, selection?.laterality === side && s.lateralityTextSelected]}>
                              {side}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={s.customComplaintBlock}>
                <MiniLabel label="Other complaint" />
                <TextInput
                  style={[s.input, { minHeight: 64, textAlignVertical: "top" }]}
                  value={customComplaint}
                  onChangeText={setCustomComplaint}
                  placeholder="Type another complaint…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                />
              </View>
            </KeyboardAwareScrollView>
            <TouchableOpacity
              style={s.doneButton}
              onPress={() => {
                void saveCustomComplaintOption();
                setChiefComplaints(formatChiefComplaints(chiefComplaintSelections, customComplaint));
                setShowComplaintPicker(false);
              }}
            >
              <Text style={s.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={s.navBar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.navTitle}>{editId ? "Edit Prescription" : duplicateFrom ? "Duplicate Rx" : "New Prescription"}</Text>
        <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? "Saving…" : "Save Rx"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 }]}
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── 1. Patient Particulars ─── */}
        <SectionTitle title={sectionTitle("patient", "Patient Particulars")} />
        <MiniLabel label="Name of the patient" />
        {!isNewPatient ? (
          <View>
            <View style={s.searchRow}>
              <Feather name="user" size={15} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput style={s.patientInput} value={patientQuery}
                onChangeText={(t) => {
                  setPatientQuery(t);
                  setSelectedPatient(null);
                  setPatientAge("");
                  setPatientAgeUnit("years");
                  setPatientPhone("");
                  setPatientPuid("");
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name, phone, or PUID…" placeholderTextColor={colors.mutedForeground}
              />
              {selectedPatient
                ? <Feather name="check-circle" size={16} color={colors.success} />
                : (
                  <TouchableOpacity
                    onPress={openScanner}
                    style={{ marginLeft: 6, width: 32, height: 32, borderRadius: 8, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border }}
                  >
                    <Feather name="maximize" size={14} color={colors.primary} />
                  </TouchableOpacity>
                )
              }
            </View>
            {showDropdown && !selectedPatient && (
              <View style={s.dropdown}>
                {filteredPatients.map((p) => (
                  <TouchableOpacity key={p.id} style={s.dropdownItem}
                    onPress={() => {
                      setSelectedPatient(p);
                      setPatientQuery(p.name);
                      const selectedAge = parseAge(p.ageAtEnrollment || "");
                      setPatientAge(selectedAge.number);
                      setPatientAgeUnit(selectedAge.unit);
                      setPatientPhone(p.phone);
                      setPatientPuid(p.puid || "");
                      setShowDropdown(false);
                    }}>
                    <Text style={s.dropdownName}>{p.name}</Text>
                    <Text style={s.dropdownSub}>{[p.phone, p.puid].filter(Boolean).join("  ·  ")}</Text>
                  </TouchableOpacity>
                ))}
                {filteredPatients.length === 0 && <View style={s.dropdownItem}><Text style={s.dropdownSub}>No patients found</Text></View>}
              </View>
            )}
            <TouchableOpacity style={s.linkBtn} onPress={() => {
              setIsNewPatient(true);
              setSelectedPatient(null);
              setPatientQuery("");
              setPatientAge("");
              setPatientAgeUnit("years");
              setPatientPhone("");
              setPatientPuid("");
              setShowDropdown(false);
            }}>
              <Feather name="user-plus" size={13} color={colors.primary} /><Text style={s.linkBtnText}>Create new patient</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <TextInput style={s.input} value={newPatientName} onChangeText={setNewPatientName} placeholder="Patient full name *" placeholderTextColor={colors.mutedForeground} />
            <TouchableOpacity style={s.linkBtn} onPress={() => setIsNewPatient(false)}>
              <Feather name="search" size={13} color={colors.primary} /><Text style={s.linkBtnText}>Search existing patient</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <MiniLabel label="Age of the patient" />
            <TextInput
              style={s.input}
              value={patientAge}
              onChangeText={(value) => setPatientAge(value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 45"
              keyboardType="number-pad"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
              {(["years", "months"] as AgeUnit[]).map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={{ flex: 1, borderWidth: 1.5, borderColor: patientAgeUnit === unit ? colors.primary : colors.border, backgroundColor: patientAgeUnit === unit ? colors.secondary : colors.card, borderRadius: 8, paddingVertical: 7, alignItems: "center" }}
                  onPress={() => setPatientAgeUnit(unit)}
                >
                  <Text style={{ color: patientAgeUnit === unit ? colors.primary : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{unit === "years" ? "Years" : "Months"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <MiniLabel label="Weight of the patient" />
            <TextInput style={s.input} value={patientWeight} onChangeText={setPatientWeight} placeholder="e.g. 62 kg" keyboardType="decimal-pad" placeholderTextColor={colors.mutedForeground} />
          </View>
        </View>
        <View style={[s.row, { marginTop: 10 }]}>
          <View style={{ flex: 1 }}>
            <MiniLabel label="Contact number" />
            <TextInput style={s.input} value={patientPhone} onChangeText={setPatientPhone} placeholder="Phone number" keyboardType="phone-pad" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <MiniLabel label="Date" />
            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ fontSize: 14, color: colors.foreground, fontFamily: "Inter_500Medium" }}>
                {new Date(`${prescriptionDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ marginTop: 10 }}>
          <MiniLabel label="PUID" />
          <View style={[s.input, { justifyContent: "center" }]}>
            <Text style={{ fontSize: 14, color: patientPuid ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
              {patientPuid || (isNewPatient ? "Generated when prescription is saved" : "Select a patient to view PUID")}
            </Text>
          </View>
        </View>
        <ConfiguredSubsections
          section={prescriptionConfig.sections.find((section) => section.id === "patient")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        <ConfiguredSectionOptions
          section={prescriptionConfig.sections.find((section) => section.id === "patient")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />

        {/* ─── 2. History ─── */}
        {(sectionEnabled("chiefComplaints") || sectionEnabled("pastHistory")) ? (
          <SectionTitle title={sectionTitle("pastHistory", "History")} />
        ) : null}
        {sectionEnabled("chiefComplaints") ? <>
        <MiniLabel label={categoryTitle("chiefComplaints", sectionTitle("chiefComplaints", "Chief Complaints"))} />
        <TouchableOpacity
          style={s.complaintField}
          onPress={() => setShowComplaintPicker(true)}
          activeOpacity={0.75}
        >
          <Text style={chiefComplaints ? s.complaintFieldText : s.complaintFieldPlaceholder}>
            {chiefComplaints || "Tap to select symptoms…"}
          </Text>
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        </> : null}

        {sectionEnabled("pastHistory") ? <>
        <View style={{ height: 12 }} />
        <MiniLabel label="Comorbidities" />
        <View style={s.checkGrid}>
          {([["dm","DM"],["htn","HTN"],["ihd","IHD"],["ckd","CKD"],["ba","BA"],["thyDs","Thyroid Ds"],["uromax","Uromax"]] as [keyof PastHistory, string][]).map(([key, label]) => (
            <CheckItem key={key} label={label} value={history[key] as boolean} onChange={(v) => setHistory((h) => ({ ...h, [key]: v }))} />
          ))}
        </View>
        <View style={{ marginTop: 8 }}>
          <MiniLabel label="Other comorbidity" />
          <SmartInput fieldKey="past_history_others" value={history.others}
            onChangeText={(v) => setHistory((h) => ({ ...h, others: v }))}
            placeholder="Other comorbidity…" />
        </View>
        <View style={{ marginTop: 10 }}>
          <MiniLabel label="Past History" />
          <SmartInput
            fieldKey="past_history_notes"
            value={pastHistoryNotes}
            onChangeText={setPastHistoryNotes}
            placeholder="Previous illnesses, surgeries, treatment, or relevant history…"
            minHeight={72}
            multiline
          />
        </View>
        </> : null}
        <ConfiguredSubsections
          section={prescriptionConfig.sections.find((section) => section.id === "chiefComplaints")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        <ConfiguredSubsections
          section={prescriptionConfig.sections.find((section) => section.id === "pastHistory")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        <ConfiguredSectionOptions
          section={prescriptionConfig.sections.find((section) => section.id === "chiefComplaints")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        <ConfiguredSectionOptions
          section={prescriptionConfig.sections.find((section) => section.id === "pastHistory")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />

        {/* ─── Visual Acuity ─── */}
        {sectionEnabled("visualAcuity") ? <>
        <SectionTitle title={categoryTitle("visualAcuity", sectionTitle("visualAcuity", "Visual Acuity"))} />
        <VATable
          reVA={reVA} leVA={leVA}
          onChangeRe={(f, v) => setReVA((p) => ({ ...p, [f]: v }))}
          onChangeLe={(f, v) => setLeVA((p) => ({ ...p, [f]: v }))}
          options={[
            ...prescriptionConfig.visualAcuity,
            ...(prescriptionConfig.sections.find((section) => section.id === "visualAcuity")?.options || []),
          ].filter((option, index, all) => all.findIndex((item) => item.toLowerCase() === option.toLowerCase()) === index)}
          mode={vaMode}
          onModeChange={(mode) => {
            setVaMode(mode);
            if (mode === "ua") {
              setReVA((current) => ({ ...current, wa: "" }));
              setLeVA((current) => ({ ...current, wa: "" }));
            } else {
              setReVA((current) => ({ ...current, ua: "" }));
              setLeVA((current) => ({ ...current, ua: "" }));
            }
          }}
        />
        </> : null}
        <ConfiguredSubsections
          section={prescriptionConfig.sections.find((section) => section.id === "visualAcuity")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        <ConfiguredSectionOptions
          section={prescriptionConfig.sections.find((section) => section.id === "visualAcuity")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />

        {/* ─── 4. Other Examination Findings ─── */}
        {(sectionEnabled("examination") || sectionEnabled("gat")) ? <>
        <SectionTitle title={sectionTitle("examination", "Other Examination Findings")} />
        {sectionEnabled("examination") ? (prescriptionConfig.sections.find((section) => section.id === "examination")?.subsections || [])
          .filter((subsection) => subsection.enabled)
          .map((subsection, index) => {
            const fallback = subsection.id === "adnexa" ? adnexa
              : subsection.id === "anteriorSegment" ? anteriorSegment
              : subsection.id === "posteriorSegment" ? posteriorSegment
              : "";
            const value = getSectionField(`examination:${subsection.id}`, fallback);
            return (
              <View key={subsection.id} style={{ marginTop: index ? 10 : 0 }}>
                <MiniLabel label={subsection.title} />
                <ConfigurableTextField
                  fieldKey={`examination_${subsection.id}`}
                  options={subsection.options}
                  value={value}
                  onChange={(nextValue) => {
                    updateSectionField(`examination:${subsection.id}`, nextValue);
                    if (subsection.id === "adnexa") setAdnexa(nextValue.freeText);
                    if (subsection.id === "anteriorSegment") setAnteriorSegment(nextValue.freeText);
                    if (subsection.id === "posteriorSegment") setPosteriorSegment(nextValue.freeText);
                  }}
                  placeholder={`Enter ${subsection.title.toLowerCase()} findings…`}
                  minHeight={subsection.id === "adnexa" ? 64 : 80}
                />
              </View>
            );
          }) : null}
        <ConfiguredSectionOptions
          section={prescriptionConfig.sections.find((section) => section.id === "examination")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        {sectionEnabled("gat") ? <View style={{ marginTop: 12 }}>
        <MiniLabel label={sectionTitle("gat", "IOP")} />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <MiniLabel label="RE (mmHg)" />
            <TextInput style={[s.input, { textAlign: "center" }]} value={gatRight} onChangeText={setGatRight} placeholder="14" keyboardType="decimal-pad" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View style={{ width: 16 }} />
          <View style={{ flex: 1 }}>
            <MiniLabel label="LE (mmHg)" />
            <TextInput style={[s.input, { textAlign: "center" }]} value={gatLeft} onChangeText={setGatLeft} placeholder="14" keyboardType="decimal-pad" placeholderTextColor={colors.mutedForeground} />
          </View>
        </View>
        </View> : null}
        </> : null}

        {/* ─── 5. Diagnosis ─── */}
        {sectionEnabled("diagnosis") ? <>
        <SectionTitle title={sectionTitle("diagnosis", "Diagnosis")} />
        <ConfigurableTextField
          fieldKey="diagnosis"
          options={prescriptionConfig.sections.find((section) => section.id === "diagnosis")?.options || []}
          value={getSectionField("diagnosis", diagnosis)}
          onChange={(value) => {
            updateSectionField("diagnosis", value);
            setDiagnosis(value.freeText);
          }}
          placeholder="Enter diagnosis…"
          minHeight={80}
        />
        <ConfiguredSubsections
          section={prescriptionConfig.sections.find((section) => section.id === "diagnosis")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        </> : null}

        {/* ─── 6. Treatment (Rx) ─── */}
        {sectionEnabled("drugs") ? <>
        <SectionTitle title={sectionTitle("drugs", "Treatment (Rx)")} />
        {drugs.map((drug) => (
          <DrugRow
            key={drug.id}
            drug={drug}
            onChange={(u) => updateDrug(drug.id, u)}
            onDelete={() => removeDrug(drug.id)}
            drugNameOptions={drugNameOptions}
            usageCounts={drugUsageCounts}
          />
        ))}
        <TouchableOpacity style={s.addDrugBtn} onPress={addDrug}>
          <Feather name="plus" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Add Drug</Text>
        </TouchableOpacity>
        <ConfiguredSubsections
          section={prescriptionConfig.sections.find((section) => section.id === "drugs")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        <ConfiguredSectionOptions
          section={prescriptionConfig.sections.find((section) => section.id === "drugs")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        </> : null}

        {/* ─── 7. Spectacle Correction ─── */}
        {(sectionEnabled("spectacle") || sectionEnabled("lens")) ? <>
        <SectionTitle title={sectionTitle("spectacle", "Spectacle Correction")} />
        {sectionEnabled("spectacle") ? (
        <SpectacleTable
          reD={reD} leD={leD} reN={reN} leN={leN}
          ipd={ipd} nearIPD={nearIPD} addValue={addValue}
          onChangeRxD={(eye, f, v) => { if (eye === "re") setReD((p) => ({ ...p, [f]: v })); else setLeD((p) => ({ ...p, [f]: v })); }}
          onChangeRxN={(eye, f, v) => { if (eye === "re") setReN((p) => ({ ...p, [f]: v })); else setLeN((p) => ({ ...p, [f]: v })); }}
          onChangeIPD={setIpd}
          onChangeAdd={setAddValue}
          distanceVA={prescriptionConfig.distanceVA}
          nearVA={prescriptionConfig.nearVA}
        />
        ) : null}
        {sectionEnabled("lens") ? <View style={{ marginTop: 14 }}>
        <MiniLabel label={sectionTitle("lens", "Lens Options")} />
        <MiniLabel label={categoryTitle("lensUsage", "Usage")} />
        <ToggleGroup value={lensUsage} onChange={(v) => setLensUsage(v as string)} options={prescriptionConfig.lensUsage} />
        <View style={{ height: 12 }} />
        <MiniLabel label={categoryTitle("lensType", "Type")} />
        <ToggleGroup value={lensType} onChange={(v) => setLensType(v as string)} options={prescriptionConfig.lensType} />
        <View style={{ height: 12 }} />
        <MiniLabel label={categoryTitle("lensCoating", "Coating")} />
        <ToggleGroup value={lensCoating} onChange={(v) => setLensCoating(v as string[])} options={prescriptionConfig.lensCoating} multi />
        <View style={{ height: 12 }} />
        <MiniLabel label={categoryTitle("lensMaterial", "Material")} />
        <ToggleGroup value={lensMaterial} onChange={(v) => setLensMaterial(v as string)} options={prescriptionConfig.lensMaterial} />
        </View> : null}
        <ConfiguredSubsections
          section={prescriptionConfig.sections.find((section) => section.id === "spectacle")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        <ConfiguredSubsections
          section={prescriptionConfig.sections.find((section) => section.id === "lens")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        <ConfiguredSectionOptions
          section={prescriptionConfig.sections.find((section) => section.id === "spectacle")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        <ConfiguredSectionOptions
          section={prescriptionConfig.sections.find((section) => section.id === "lens")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        </> : null}

        {/* ─── 8. Investigations ─── */}
        {sectionEnabled("investigations") ? <>
        <SectionTitle title={sectionTitle("investigations", "Investigations")} />
        <ConfigurableTextField
          fieldKey="investigations"
          options={prescriptionConfig.sections.find((section) => section.id === "investigations")?.options || []}
          optionGroups={INVESTIGATION_GROUPS}
          value={getSectionField("investigations", investigations)}
          onChange={(value) => {
            updateSectionField("investigations", value);
            setInvestigations(value.freeText);
          }}
          placeholder="Enter requested investigations…"
          minHeight={80}
        />
        <ConfiguredSubsections
          section={prescriptionConfig.sections.find((section) => section.id === "investigations")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        </> : null}

        {/* ─── 9. Advice ─── */}
        {sectionEnabled("advice") ? <>
        <SectionTitle title={sectionTitle("advice", "Advice/উপদেশ")} />
        <ConfigurableTextField
          fieldKey="advice"
          options={prescriptionConfig.sections.find((section) => section.id === "advice")?.options || []}
          value={getSectionField("advice", advice)}
          onChange={(value) => {
            updateSectionField("advice", value);
            setAdvice(value.freeText);
            setAdviceBn("");
          }}
          placeholder="Instructions for the patient…"
          minHeight={100}
        />
        {!isAlreadyBangla(advice) && advice.trim() ? (
          <TouchableOpacity style={s.bnBtn}
            onPress={() => setAdviceBn(translateToBangla(advice))}>
            <Text style={s.bnBtnText}>↳ Translate to বাংলা</Text>
          </TouchableOpacity>
        ) : null}
        {adviceBn ? (
          <View style={s.bnBlock}>
            <Text style={s.bnText}>{adviceBn}</Text>
            <TouchableOpacity onPress={() => setAdviceBn("")} style={{ marginLeft: 8 }}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : null}
        <ConfiguredSubsections
          section={prescriptionConfig.sections.find((section) => section.id === "advice")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        </> : null}

        {/* ─── 10. Follow-up ─── */}
        {sectionEnabled("followUp") ? <>
        <SectionTitle title={categoryTitle("followUp", sectionTitle("followUp", "Follow-Up Time"))} />
        <ToggleGroup value={followUp}
          onChange={(v) => { setFollowUp(v as string); setFollowUpBn(translateToBangla(v as string)); }}
          options={prescriptionConfig.followUp}
        />
        <View style={{ height: 8 }} />
        <SmartInput fieldKey="followup_custom" value={followUp} onChangeText={(v) => { setFollowUp(v); setFollowUpBn(translateToBangla(v)); }}
          placeholder="Or type custom follow-up…" showTranslate />
        {followUpBn && followUpBn !== followUp ? (
          <View style={[s.bnBlock, { marginTop: 6 }]}>
            <Text style={s.bnText}>{followUpBn}</Text>
            <TouchableOpacity onPress={() => setFollowUpBn("")} style={{ marginLeft: 8 }}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : null}
        <ConfiguredSubsections
          section={prescriptionConfig.sections.find((section) => section.id === "followUp")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        <ConfiguredSectionOptions
          section={prescriptionConfig.sections.find((section) => section.id === "followUp")}
          getValue={getSectionField}
          onChange={updateSectionField}
        />
        </> : null}

        {/* Additional custom sections */}
        {prescriptionConfig.sections.filter((section) => !section.builtIn && section.enabled).map((section) => (
          <View key={section.id}>
            <SectionTitle title={section.title} />
            <ConfigurableTextField
              fieldKey={`custom_${section.id}`}
              options={section.options || []}
              value={getCustomSectionField(section.id)}
              onChange={(value) => updateCustomSection(section.id, value)}
              placeholder={`Enter ${section.title.toLowerCase()}…`}
              minHeight={90}
            />
            {(section.subsections || []).filter((subsection) => subsection.enabled).map((subsection) => (
              <View key={subsection.id} style={{ marginTop: 10 }}>
                <MiniLabel label={subsection.title} />
                <ConfigurableTextField
                  fieldKey={`custom_${section.id}_${subsection.id}`}
                  options={subsection.options}
                  value={getSectionField(`custom:${section.id}:${subsection.id}`)}
                  onChange={(value) => updateSectionField(`custom:${section.id}:${subsection.id}`, value)}
                  placeholder={`Enter ${subsection.title.toLowerCase()}…`}
                  minHeight={72}
                />
              </View>
            ))}
          </View>
        ))}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    navBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
    iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    navTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
    scroll: { paddingHorizontal: 16 },
    searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1.5, borderColor: colors.border },
    patientInput: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
    dropdown: { backgroundColor: colors.card, borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    dropdownName: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_500Medium" },
    dropdownSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 1 },
    linkBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingVertical: 4 },
    linkBtnText: { fontSize: 13, color: colors.primary, fontFamily: "Inter_500Medium" },
    row: { flexDirection: "row", marginTop: 10 },
    input: { backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", borderWidth: 1.5, borderColor: colors.border },
    checkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    complaintField: { minHeight: 80, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, borderWidth: 1.5, borderColor: colors.border, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    complaintFieldText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.foreground, fontFamily: "Inter_400Regular", paddingRight: 8 },
    complaintFieldPlaceholder: { flex: 1, fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", paddingRight: 8 },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" },
    complaintModal: { maxHeight: "88%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },
    modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
    modalTitle: { fontSize: 19, color: colors.foreground, fontFamily: "Inter_700Bold" },
    modalSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 3 },
    modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    complaintRow: { minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    complaintRowSelected: { backgroundColor: colors.secondary, borderRadius: 10, borderBottomWidth: 0, paddingHorizontal: 8, marginBottom: 2 },
    complaintNameButton: { flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 10 },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.mutedForeground, marginRight: 10, alignItems: "center", justifyContent: "center" },
    checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    complaintName: { flex: 1, fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular" },
    complaintNameSelected: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
    lateralityGroup: { flexDirection: "row", gap: 4, marginLeft: 6 },
    lateralityButton: { width: 31, height: 29, borderRadius: 7, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
    lateralityButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    lateralityText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    lateralityTextSelected: { color: "#fff" },
    investigationSelect: { minHeight: 48, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 13, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    investigationSelectText: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_500Medium", paddingRight: 8 },
    investigationSelectPlaceholder: { flex: 1, fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", paddingRight: 8 },
    investigationMenu: { borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: "hidden" },
    investigationGroupTitle: { paddingHorizontal: 12, paddingTop: 11, paddingBottom: 7, backgroundColor: colors.secondary, color: colors.primary, fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.7 },
    dropdownOptionText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.foreground, fontFamily: "Inter_400Regular" },
    dropdownOptionTextSelected: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
    dropdownPrompt: { fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 },
    customComplaintBlock: { paddingTop: 14 },
    doneButton: { marginTop: 10, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", paddingVertical: 14 },
    doneButtonText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
    addDrugBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.secondary, borderRadius: 10, padding: 12, borderWidth: 1.5, borderColor: colors.primary + "40", justifyContent: "center" },
    bnBtn: { marginTop: 6, paddingVertical: 4 },
    bnBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.accent },
    bnBlock: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.secondary, borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: colors.accent },
    bnText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 22 },
  });
