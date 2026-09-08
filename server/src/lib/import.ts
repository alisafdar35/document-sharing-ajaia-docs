import { badRequest } from './http';
import type { TipTapDoc, TipTapNode } from './tiptap';
import { emptyDoc } from './tiptap';

export const SUPPORTED_IMPORT_EXTENSIONS = ['.txt', '.md'] as const;
export const MAX_IMPORT_BYTES = 1024 * 1024; // 1 MB

/** Strips the extension and tidies the filename into a document title. */
export function titleFromFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const withoutExt = base.replace(/\.(txt|md|markdown)$/i, '');
  const cleaned = withoutExt.replace(/[_-]+/g, ' ').trim();
  return cleaned.slice(0, 200) || 'Imported document';
}

export function assertSupportedFile(filename: string, content: string) {
  const lower = filename.toLowerCase();
  const isSupported =
    lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.markdown');

  if (!isSupported) {
    throw badRequest('Unsupported file type. Only .txt and .md files can be imported.');
  }
  if (!content || content.trim().length === 0) {
    throw badRequest('That file is empty. Import a file with some content in it.');
  }
  if (Buffer.byteLength(content, 'utf8') > MAX_IMPORT_BYTES) {
    throw badRequest('That file is too large. The maximum import size is 1 MB.');
  }
}

/** Inline markdown (bold / italic / inline code) -> TipTap text nodes. */
function inlineToNodes(input: string): TipTapNode[] {
  const nodes: TipTapNode[] = [];
  // Order matters: ** before *, so bold wins over italic.
  const pattern = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushText = (text: string, marks?: TipTapNode['marks']) => {
    if (!text) return;
    nodes.push(marks ? { type: 'text', text, marks } : { type: 'text', text });
  };

  while ((match = pattern.exec(input)) !== null) {
    pushText(input.slice(lastIndex, match.index));
    if (match[2] !== undefined) pushText(match[2], [{ type: 'bold' }]);
    else if (match[4] !== undefined) pushText(match[4], [{ type: 'italic' }]);
    else if (match[5] !== undefined) pushText(match[5], [{ type: 'code' }]);
    lastIndex = pattern.lastIndex;
  }
  pushText(input.slice(lastIndex));

  return nodes;
}

const paragraph = (text: string): TipTapNode => ({
  type: 'paragraph',
  content: inlineToNodes(text),
});

const listItem = (text: string): TipTapNode => ({
  type: 'listItem',
  content: [paragraph(text)],
});

/**
 * Converts plain text or a light subset of Markdown into a TipTap document.
 *
 * Supported Markdown: `#`/`##`/`###` headings, `-`/`*`/`+` bullet lists,
 * `1.` ordered lists, `>` blockquotes, `---` horizontal rules, fenced code
 * blocks, and inline bold / italic / code. Anything else becomes a paragraph,
 * which is exactly what a .txt import needs.
 */
export function markdownToTipTap(source: string, treatAsMarkdown: boolean): TipTapDoc {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const content: TipTapNode[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === '') {
      index += 1;
      continue;
    }

    if (!treatAsMarkdown) {
      // Plain text: consecutive non-empty lines form one paragraph.
      const buffer: string[] = [];
      while (index < lines.length && lines[index].trim() !== '') {
        buffer.push(lines[index].trim());
        index += 1;
      }
      content.push({ type: 'paragraph', content: [{ type: 'text', text: buffer.join(' ') }] });
      continue;
    }

    // Fenced code block
    if (/^```/.test(trimmed)) {
      const buffer: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        buffer.push(lines[index]);
        index += 1;
      }
      index += 1; // closing fence
      content.push({
        type: 'codeBlock',
        content: buffer.length ? [{ type: 'text', text: buffer.join('\n') }] : [],
      });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      content.push({ type: 'horizontalRule' });
      index += 1;
      continue;
    }

    // Heading (TipTap StarterKit is configured for levels 1-3 here)
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      content.push({
        type: 'heading',
        attrs: { level: heading[1].length },
        content: inlineToNodes(heading[2].trim()),
      });
      index += 1;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(trimmed)) {
      const buffer: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        buffer.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      content.push({ type: 'blockquote', content: [paragraph(buffer.join(' '))] });
      continue;
    }

    // Bullet list
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: TipTapNode[] = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) {
        items.push(listItem(lines[index].trim().replace(/^[-*+]\s+/, '')));
        index += 1;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: TipTapNode[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(listItem(lines[index].trim().replace(/^\d+[.)]\s+/, '')));
        index += 1;
      }
      content.push({ type: 'orderedList', attrs: { start: 1 }, content: items });
      continue;
    }

    // Paragraph: join soft-wrapped lines until a blank line or a new block.
    const buffer: string[] = [];
    while (index < lines.length) {
      const next = lines[index].trim();
      const startsNewBlock =
        next === '' ||
        /^(#{1,3}\s|[-*+]\s|\d+[.)]\s|>\s?|```)/.test(next) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(next);
      if (startsNewBlock && buffer.length) break;
      if (startsNewBlock && !buffer.length) break;
      buffer.push(next);
      index += 1;
    }
    if (buffer.length) content.push(paragraph(buffer.join(' ')));
    else index += 1;
  }

  return content.length ? { type: 'doc', content } : emptyDoc();
}

export function fileToDocument(filename: string, rawContent: string) {
  assertSupportedFile(filename, rawContent);
  const isMarkdown = /\.(md|markdown)$/i.test(filename);
  return {
    title: titleFromFilename(filename),
    doc: markdownToTipTap(rawContent, isMarkdown),
  };
}
