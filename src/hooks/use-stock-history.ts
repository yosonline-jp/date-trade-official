"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  historyKey,
  parseHistory,
  upsertHistory,
  type HistoryEntry,
  type HistoryInput,
  type HistoryKind,
} from "@/lib/stock-history";

/** Browser-local metadata only; storage failures never block the workspace. */
export function useStockHistory(kind: HistoryKind) {
  const key = historyKey(kind);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const entriesRef = useRef<HistoryEntry[]>([]);
  const availableRef = useRef(true);

  const updateEntries = useCallback((next: HistoryEntry[]) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);

  const markUnavailable = useCallback(() => {
    availableRef.current = false;
    setStorageAvailable(false);
  }, []);

  useEffect(() => {
    availableRef.current = true;
    setStorageAvailable(true);
    setReady(false);
    try {
      updateEntries(parseHistory(window.localStorage.getItem(key), kind));
    } catch {
      updateEntries([]);
      markUnavailable();
    }
    setReady(true);

    const synchronize = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;
      try {
        if (event.storageArea && event.storageArea !== window.localStorage)
          return;
      } catch {
        markUnavailable();
        return;
      }
      try {
        // Queued events can describe an older write than a recent local delete.
        updateEntries(parseHistory(window.localStorage.getItem(key), kind));
      } catch {
        markUnavailable();
      }
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, [key, kind, markUnavailable, updateEntries]);

  const readCurrent = useCallback(() => {
    // After a failed write, the in-memory version is newer than the disk copy.
    if (!availableRef.current) return entriesRef.current;
    try {
      return parseHistory(window.localStorage.getItem(key), kind);
    } catch {
      markUnavailable();
      return entriesRef.current;
    }
  }, [key, kind, markUnavailable]);

  const persist = useCallback(
    (next: HistoryEntry[], removeKey = false) => {
      updateEntries(next);
      try {
        if (removeKey) window.localStorage.removeItem(key);
        else
          window.localStorage.setItem(
            key,
            JSON.stringify({ version: 1, entries: next }),
          );
        availableRef.current = true;
        setStorageAvailable(true);
      } catch {
        markUnavailable();
      }
    },
    [key, markUnavailable, updateEntries],
  );

  const remember = useCallback(
    (input: HistoryInput) => {
      persist(upsertHistory(readCurrent(), input, kind));
    },
    [kind, persist, readCurrent],
  );

  const remove = useCallback(
    (code: string) => {
      const normalizedCode = code.trim().toUpperCase();
      const next = readCurrent().filter(
        (entry) => entry.code !== normalizedCode,
      );
      persist(next, next.length === 0);
    },
    [persist, readCurrent],
  );

  const clear = useCallback(() => persist([], true), [persist]);

  return { entries, ready, storageAvailable, remember, remove, clear };
}
