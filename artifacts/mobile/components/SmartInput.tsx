import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { useSuggestions } from "@/hooks/useSuggestions";
import { useColors } from "@/hooks/useColors";
import { translateToBangla, isAlreadyBangla } from "@/utils/banglaTranslate";

interface Props extends Omit<TextInputProps, "value" | "onChangeText"> {
  fieldKey: string;
  value: string;
  onChangeText: (text: string) => void;
  minHeight?: number;
  showTranslate?: boolean;
}

export function SmartInput({
  fieldKey,
  value,
  onChangeText,
  minHeight = 44,
  showTranslate = false,
  ...rest
}: Props) {
  const colors = useColors();
  const s = styles(colors);
  const { match, add, remove } = useSuggestions(fieldKey);
  const [focused, setFocused] = useState(false);

  const suggestions = focused ? match(value) : [];
  const canTranslate = showTranslate && value.trim().length > 0 && !isAlreadyBangla(value);

  const handleTranslate = () => {
    onChangeText(translateToBangla(value));
  };

  return (
    <View>
      <View style={[s.inputWrap, focused && s.inputWrapFocused, { minHeight }]}>
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (value.trim().length >= 3) add(value.trim());
          }}
          style={[s.input, { minHeight }, rest.style as object]}
          placeholderTextColor={colors.mutedForeground}
          textAlignVertical={minHeight > 44 ? "top" : "center"}
          multiline={minHeight > 44}
        />
        {showTranslate && canTranslate && (
          <TouchableOpacity style={s.translateBtn} onPress={handleTranslate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.translateBtnText}>বাংলা</Text>
          </TouchableOpacity>
        )}
      </View>

      {suggestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.suggestionsRow}
          keyboardShouldPersistTaps="always"
        >
          {suggestions.map((s_item) => (
            <View key={s_item} style={s.chipWrap}>
              <TouchableOpacity
                style={s.chip}
                onPress={() => {
                  onChangeText(s_item);
                  setFocused(false);
                }}
              >
                <Text style={s.chipText} numberOfLines={1}>{s_item}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.chipDel}
                onPress={() => remove(s_item)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Feather name="x" size={9} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 2,
    },
    inputWrapFocused: {
      borderColor: colors.primary,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      paddingVertical: 9,
    },
    translateBtn: {
      backgroundColor: colors.secondary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginLeft: 6,
    },
    translateBtnText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    suggestionsRow: {
      paddingVertical: 6,
      paddingHorizontal: 2,
      gap: 6,
      flexDirection: "row",
    },
    chipWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.secondary,
      borderRadius: 14,
      paddingLeft: 10,
      paddingRight: 4,
      paddingVertical: 5,
      maxWidth: 200,
    },
    chip: {
      flexShrink: 1,
    },
    chipText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
    },
    chipDel: {
      marginLeft: 4,
      padding: 2,
    },
  });
