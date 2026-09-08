import { AlertCircle, Check, CloudUpload } from 'lucide-react';
import { formatRelativeTime } from '../lib/format';

export type SaveState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

type SaveStatusProps = {
  state: SaveState;
  lastSavedAt: string | null;
  onRetry?: () => void;
};

/** The "All changes saved" indicator next to the document title. */
export function SaveStatus({ state, lastSavedAt, onRetry }: SaveStatusProps) {
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        Couldn&apos;t save
        {onRetry && (
          <button type="button" onClick={onRetry} className="underline underline-offset-2">
            Retry
          </button>
        )}
      </span>
    );
  }

  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <CloudUpload className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
        Saving...
      </span>
    );
  }

  if (state === 'unsaved') {
    return <span className="text-xs text-slate-400">Unsaved changes</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
      {state === 'saved' ? 'All changes saved' : `Edited ${formatRelativeTime(lastSavedAt ?? '')}`}
    </span>
  );
}
