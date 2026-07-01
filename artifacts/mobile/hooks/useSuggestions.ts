import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const MAX_SUGGESTIONS = 30;
const PREFIX = "@optiscript_suggestions_";

export function useSuggestions(fieldKey: string) {
  const key = PREFIX + fieldKey;
  const [all, setAll] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(key).then((raw) => {
      if (raw) setAll(JSON.parse(raw));
    });
  }, [key]);

  const persist = useCallback(
    (items: string[]) => {
      setAll(items);
      AsyncStorage.setItem(key, JSON.stringify(items));
    },
    [key]
  );

  const add = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length < 3) return;
      setAll((prev) => {
        const filtered = prev.filter(
          (s) => s.toLowerCase() !== trimmed.toLowerCase()
        );
        const updated = [trimmed, ...filtered].slice(0, MAX_SUGGESTIONS);
        AsyncStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });
    },
    [key]
  );

  const remove = useCallback(
    (text: string) => {
      setAll((prev) => {
        const updated = prev.filter((s) => s !== text);
        AsyncStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });
    },
    [key]
  );

  const addMultiple = useCallback(
    (texts: string[]) => {
      texts.forEach((t) => {
        const trimmed = t.trim();
        if (trimmed.length >= 3) add(trimmed);
      });
    },
    [add]
  );

  const match = useCallback(
    (query: string): string[] => {
      if (!query.trim()) return all.slice(0, 6);
      const q = query.toLowerCase();
      return all
        .filter((s) => s.toLowerCase().includes(q))
        .slice(0, 6);
    },
    [all]
  );

  return { all, add, remove, addMultiple, match };
}
