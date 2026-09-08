import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { api } from '../lib/api';
import type { DocumentDetail } from '../lib/types';
import { Spinner } from './Spinner';

const MAX_IMPORT_BYTES = 1024 * 1024; // Matches the server's 1 MB limit.
const ACCEPTED = '.txt,.md,.markdown';

type ImportButtonProps = {
  userId: string;
  onImported: (document: DocumentDetail) => void;
  onError: (message: string) => void;
};

/**
 * Reads the chosen .txt/.md file in the browser and posts its text, so there is
 * no multipart upload. The server converts Markdown into TipTap JSON and
 * re-validates everything checked here.
 */
export function ImportButton({ userId, onImported, onError }: ImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!/\.(txt|md|markdown)$/i.test(file.name)) {
      onError('Unsupported file type. Only .txt and .md files can be imported.');
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      onError('That file is too large. The maximum import size is 1 MB.');
      return;
    }

    setBusy(true);
    try {
      const text = await file.text();
      if (text.trim().length === 0) {
        onError('That file is empty. Import a file with some content in it.');
        return;
      }
      onImported(await api.importDocument(userId, file.name, text));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The file could not be imported.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so picking the same file twice still fires a change event.
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />
      <button
        type="button"
        className="btn-secondary"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Import a .txt or .md file (up to 1 MB) as a new document"
      >
        {busy ? <Spinner /> : <Upload className="h-4 w-4" aria-hidden="true" />}
        Import
      </button>
    </>
  );
}
