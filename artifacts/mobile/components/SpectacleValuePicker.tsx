import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const ITEM_H = 48;
const VISIBLE = 5; // must be odd
const PICKER_H = ITEM_H * VISIBLE;
const PAD = ITEM_H * Math.floor(VISIBLE / 2);

/* ── value generators ── */

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = from; Math.round(v * 1000) <= Math.round(to * 1000); v += step) {
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}

export const SPH_VALUES = range(-15, 15, 0.25);
export const CYL_VALUES = range(-15, 15, 0.25);
export const AXIS_VALUES = range(0, 180, 5);
export const ADD_VALUES = range(0, 3, 0.25);

export function formatSphCyl(n: number): string {
  if (n === 0) return "0.00";
  return (n > 0 ? "+" : "") + n.toFixed(2);
}
export function formatAxis(n: number): string {
  return `${n}°`;
}
export function formatAdd(n: number): string {
  if (n === 0) return "0.00";
  return `+${n.toFixed(2)}`;
}

/* ── component ── */

type FormatFn = (n: number) => string;

interface Props {
  values: number[];
  value: string;
  onChange: (v: string) => void;
  format: FormatFn;
  placeholder?: string;
  accentColor?: string;
  cellWidth?: number;
}

export function SpectacleValuePicker({
  values,
  value,
  onChange,
  format,
  placeholder = "—",
  accentColor,
  cellWidth,
}: Props) {
  const colors = useColors();
  const accent = accentColor ?? colors.primary;
  const insets = useSafeAreaInsets();
  const s = styles(colors, accent);
  const [open, setOpen] = useState(false);
  const listRef = useRef<FlatList<number>>(null);

  const selectedIndex = useMemo(() => {
    const parsed = parseFloat(value.replace("+", ""));
    if (isNaN(parsed)) return Math.floor(values.length / 2);
    const idx = values.findIndex((v) => Math.abs(v - parsed) < 0.001);
    return idx >= 0 ? idx : Math.floor(values.length / 2);
  }, [value, values]);

  const [pendingIndex, setPendingIndex] = useState(selectedIndex);

  useEffect(() => {
    if (open) {
      setPendingIndex(selectedIndex);
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: selectedIndex,
          animated: false,
          viewPosition: 0.5,
        });
      }, 80);
    }
  }, [open, selectedIndex]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const mid = viewableItems[Math.floor(viewableItems.length / 2)];
      if (mid != null && mid.index != null) {
        setPendingIndex(mid.index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });

  const handleConfirm = () => {
    const val = values[pendingIndex];
    onChange(val !== undefined ? format(val) : "");
    setOpen(false);
  };

  const hasValue = value && value !== "0.00" && value !== "0°";
  const displayText = hasValue ? value : placeholder;

  const renderItem = useCallback(
    ({ item, index }: { item: number; index: number }) => {
      const isSel = index === pendingIndex;
      return (
        <TouchableOpacity
          style={[s.item, isSel && s.itemSelected]}
          onPress={() => {
            setPendingIndex(index);
            listRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.5,
            });
          }}
          activeOpacity={0.7}
        >
          <Text style={[s.itemText, isSel && s.itemTextSelected]}>
            {format(item)}
          </Text>
        </TouchableOpacity>
      );
    },
    [pendingIndex, format]
  );

  return (
    <>
      <TouchableOpacity
        style={[
          s.trigger,
          hasValue ? s.triggerFilled : s.triggerEmpty,
          cellWidth ? { width: cellWidth } : {},
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
      >
        <Text
          style={hasValue ? s.triggerTextFilled : s.triggerTextEmpty}
          numberOfLines={1}
        >
          {displayText}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[s.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={s.sheetHandle} />

          {/* Header row */}
          <View style={s.sheetHeader}>
            <TouchableOpacity onPress={() => setOpen(false)} style={s.cancelBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.sheetTitle}>
              {format(values[pendingIndex] ?? 0)}
            </Text>
            <TouchableOpacity onPress={handleConfirm} style={s.doneBtn}>
              <Text style={s.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Drum roller */}
          <View style={s.rollerWrapper}>
            {/* Selection band */}
            <View pointerEvents="none" style={s.selectionBand} />

            <FlatList
              ref={listRef}
              data={values}
              keyExtractor={(_, i) => String(i)}
              renderItem={renderItem}
              getItemLayout={(_, index) => ({
                length: ITEM_H,
                offset: ITEM_H * index,
                index,
              })}
              snapToInterval={ITEM_H}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              style={{ height: PICKER_H }}
              contentContainerStyle={{
                paddingVertical: PAD,
              }}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig.current}
              initialScrollIndex={selectedIndex}
              onScrollToIndexFailed={() => {}}
            />
          </View>

          {/* Quick shortcuts for zero */}
          <View style={s.shortcuts}>
            <TouchableOpacity
              style={s.shortcutChip}
              onPress={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <Text style={s.shortcutText}>Clear / —</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.shortcutChip}
              onPress={() => {
                const zeroIdx = values.findIndex((v) => v === 0);
                if (zeroIdx >= 0) {
                  setPendingIndex(zeroIdx);
                  listRef.current?.scrollToIndex({
                    index: zeroIdx,
                    animated: true,
                    viewPosition: 0.5,
                  });
                }
              }}
            >
              <Text style={s.shortcutText}>Reset to 0</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = (colors: ReturnType<typeof useColors>, accent: string) =>
  StyleSheet.create({
    trigger: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: 7,
      paddingVertical: 9,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 2,
      minHeight: 38,
    },
    triggerEmpty: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    triggerFilled: {
      borderColor: accent,
      backgroundColor: colors.secondary,
    },
    triggerTextEmpty: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    triggerTextFilled: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      color: accent,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.card,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 10,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    sheetTitle: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: accent,
      minWidth: 80,
      textAlign: "center",
    },
    cancelBtn: { padding: 6 },
    cancelText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    doneBtn: {
      backgroundColor: accent,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 7,
    },
    doneText: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
    rollerWrapper: {
      position: "relative",
      height: PICKER_H,
    },
    selectionBand: {
      position: "absolute",
      left: 16,
      right: 16,
      top: ITEM_H * Math.floor(VISIBLE / 2),
      height: ITEM_H,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      borderWidth: 1.5,
      borderColor: accent + "60",
      zIndex: 0,
    },
    item: {
      height: ITEM_H,
      alignItems: "center",
      justifyContent: "center",
    },
    itemSelected: {},
    itemText: {
      fontSize: 20,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    itemTextSelected: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: accent,
    },
    shortcuts: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "center",
      paddingTop: 10,
    },
    shortcutChip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 7,
      backgroundColor: colors.surface,
    },
    shortcutText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
  });
