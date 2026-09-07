import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SUGGESTIONS = 30;
const PREFIX = "@optiscript_suggestions_";
const writeQueues = new Map<string, Promise<void>>();

function safeSuggestions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length >= 3)
      .filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
      .slice(0, MAX_SUGGESTIONS);
  } catch {
    return [];
  }
}

function queueWrite(key: string, items: string[]) {
  const previous = writeQueues.get(key) || Promise.resolve();
  const next = previous.catch(() => undefined).then(() => AsyncStorage.setItem(key, JSON.stringify(items)));
  writeQueues.set(key, next);
  return next;
}

export function useSuggestions(fieldKey: string) {
  const key = PREFIX + fieldKey;
  const [all, setAll] = useState<string[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(key)
      .then((raw) => { if (mounted.current) setAll(safeSuggestions(raw)); })
      .catch(() => undefined);
    return () => { mounted.current = false; };
  }, [key]);

  const persist = useCallback(
    (items: string[]) => {
      setAll(items);
      void queueWrite(key, items);
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
        void queueWrite(key, updated);
        return updated;
      });
    },
    [key]
  );

  const remove = useCallback(
    (text: string) => {
      setAll((prev) => {
        const updated = prev.filter((s) => s !== text);
        void queueWrite(key, updated);
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
