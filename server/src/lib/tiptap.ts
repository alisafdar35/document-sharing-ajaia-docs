/**
 * Helpers for the TipTap document JSON we persist.
 *
 * TipTap hands us a ProseMirror document (`{ type: "doc", content: [...] }`).
 * SQLite has no JSON column type, so documents are stored as a JSON string and
 * parsed at the API boundary. That keeps the same code path working on
 * PostgreSQL in production.
 */

export type TipTapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: TipTapNode[];
};

export type TipTapDoc = { type: 'doc'; content: TipTapNode[] };

export const emptyDoc = (): TipTapDoc => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

/** Parses stored content, falling back to an empty document if it is unusable. */
export function parseContent(raw: string | null | undefined): TipTapDoc {
  if (!raw) return emptyDoc();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      return parsed as TipTapDoc;
    }
  } catch {
    // fall through - corrupt content should never break the whole document
  }
  return emptyDoc();
}

/** Validates that an incoming payload really is a ProseMirror document. */
export function isTipTapDoc(value: unknown): value is TipTapDoc {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as TipTapDoc).type === 'doc' &&
    (Array.isArray((value as TipTapDoc).content) || (value as TipTapDoc).content === undefined)
  );
}

export const serializeContent = (doc: TipTapDoc): string => JSON.stringify(doc);

/** Flattens a document to plain text - used for dashboard card previews. */
export function toPlainText(doc: TipTapDoc): string {
  const parts: string[] = [];

  const walk = (node: TipTapNode) => {
    if (node.text) parts.push(node.text);
    if (node.content) {
      node.content.forEach(walk);
      // Keep block-level nodes from running into each other.
      if (node.type && node.type !== 'doc') parts.push(' ');
    }
  };

  (doc.content ?? []).forEach(walk);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

export function buildPreview(raw: string | null | undefined, maxLength = 180): string {
  const text = toPlainText(parseContent(raw));
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
