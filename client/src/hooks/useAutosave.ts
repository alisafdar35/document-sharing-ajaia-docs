import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { DocumentDetail, TipTapDoc } from '../lib/types';
import type { SaveState } from '../components/SaveStatus';

export type SavePayload = { title?: string; content?: TipTapDoc };

type UseAutosaveOptions = {
  documentId: string;
  userId: string;
  /** Quiet period after the last keystroke before a save fires. */
  delay?: number;
  onSaved?: (document: DocumentDetail) => void;
  onError?: (message: string) => void;
};

/**
 * Debounced write-behind saving for the editor.
 *
 * Edits are merged into a single pending patch and flushed once typing pauses.
 * Only one request is ever in flight; anything typed while a save is running is
 * sent immediately afterwards. A failed save keeps its payload so the status
 * bar's Retry button can send it again.
 */
export function useAutosave({
  documentId,
  userId,
  delay = 800,
  onSaved,
  onError,
}: UseAutosaveOptions) {
  const [state, setState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const pendingRef = useRef<SavePayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  // Keep callbacks in refs so flush() stays stable across renders.
  const onSavedRef = useRef(onSaved);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onSavedRef.current = onSaved;
    onErrorRef.current = onError;
  });

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (savingRef.current || !pendingRef.current) return;

    const payload = pendingRef.current;
    pendingRef.current = null;
    savingRef.current = true;
    setState('saving');

    try {
      const updated = await api.updateDocument(documentId, userId, payload);
      setLastSavedAt(updated.updatedAt);
      onSavedRef.current?.(updated);
      // Something was typed mid-save: keep the indicator honest and send it.
      setState(pendingRef.current ? 'unsaved' : 'saved');
    } catch (cause) {
      // Put the payload back (without clobbering newer edits) so Retry works.
      pendingRef.current = { ...payload, ...(pendingRef.current ?? {}) };
      setState('error');
      onErrorRef.current?.(
        cause instanceof Error ? cause.message : 'Your changes could not be saved.'
      );
    } finally {
      savingRef.current = false;
    }
  }, [documentId, userId]);

  // Drain anything that arrived while a save was in flight.
  useEffect(() => {
    if (state === 'unsaved' && pendingRef.current && !savingRef.current && !timerRef.current) {
      timerRef.current = setTimeout(() => void flush(), delay);
    }
  }, [state, flush, delay]);

  const queue = useCallback(
    (patch: SavePayload) => {
      pendingRef.current = { ...(pendingRef.current ?? {}), ...patch };
      setState('unsaved');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(), delay);
    },
    [flush, delay]
  );

  /** True when there is work that has not reached the server yet. */
  const hasUnsavedWork = useCallback(
    () => pendingRef.current !== null || savingRef.current,
    []
  );

  // Warn before the tab closes with unsaved edits.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingRef.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Leaving the editor (or switching document) sends whatever is pending.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      if (pendingRef.current && !savingRef.current) void flush();
    },
    [flush]
  );

  const reset = useCallback((savedAt: string | null) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = null;
    setState('idle');
    setLastSavedAt(savedAt);
  }, []);

  return { state, lastSavedAt, queue, flush, reset, hasUnsavedWork };
}
