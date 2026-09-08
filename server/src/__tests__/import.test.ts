import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { fileToDocument, markdownToTipTap, titleFromFilename } from '../lib/import';
import { buildPreview, toPlainText } from '../lib/tiptap';
import { app, resetDatabase, seedUsers } from './helpers';

describe('titleFromFilename', () => {
  it('strips the extension and tidies separators', () => {
    expect(titleFromFilename('meeting-notes.md')).toBe('meeting notes');
    expect(titleFromFilename('Q4_report.txt')).toBe('Q4 report');
    expect(titleFromFilename('/tmp/nested/path/plan.markdown')).toBe('plan');
  });

  it('falls back when the name is only an extension', () => {
    expect(titleFromFilename('.md')).toBe('Imported document');
  });
});

describe('markdownToTipTap', () => {
  it('turns plain text paragraphs into paragraph nodes', () => {
    const doc = markdownToTipTap('First line\nsame paragraph\n\nSecond paragraph', false);

    expect(doc.content).toHaveLength(2);
    expect(doc.content[0]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'First line same paragraph' }],
    });
  });

  it('does not treat markdown syntax as markup for a .txt file', () => {
    const doc = markdownToTipTap('# Not a heading', false);

    expect(doc.content[0].type).toBe('paragraph');
    expect(toPlainText(doc)).toBe('# Not a heading');
  });

  it('converts headings up to level 3', () => {
    const doc = markdownToTipTap('# One\n\n## Two\n\n### Three', true);

    expect(doc.content.map((node) => [node.type, node.attrs?.level])).toEqual([
      ['heading', 1],
      ['heading', 2],
      ['heading', 3],
    ]);
  });

  it('converts bullet and ordered lists', () => {
    const doc = markdownToTipTap('- one\n- two\n\n1. first\n2. second', true);

    expect(doc.content[0].type).toBe('bulletList');
    expect(doc.content[0].content).toHaveLength(2);
    expect(doc.content[1].type).toBe('orderedList');
    expect(doc.content[1].content).toHaveLength(2);
  });

  it('converts blockquotes, rules and fenced code blocks', () => {
    const doc = markdownToTipTap('> quoted\n\n---\n\n```\ncode line\n```', true);

    expect(doc.content.map((node) => node.type)).toEqual([
      'blockquote',
      'horizontalRule',
      'codeBlock',
    ]);
    expect(doc.content[2].content?.[0].text).toBe('code line');
  });

  it('applies inline bold, italic and code marks', () => {
    const doc = markdownToTipTap('Some **bold**, some *italic* and `code`.', true);
    const marks = (doc.content[0].content ?? []).map((node) => node.marks?.[0]?.type ?? null);

    expect(marks).toContain('bold');
    expect(marks).toContain('italic');
    expect(marks).toContain('code');
  });

  it('returns an empty document for whitespace-only input', () => {
    expect(markdownToTipTap('\n\n   \n', true)).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  });
});

describe('fileToDocument', () => {
  it('rejects an unsupported extension', () => {
    expect(() => fileToDocument('resume.pdf', 'hello')).toThrowError(/unsupported file type/i);
  });

  it('rejects an empty file', () => {
    expect(() => fileToDocument('notes.md', '   \n  ')).toThrowError(/empty/i);
  });

  it('rejects a file over 1 MB', () => {
    expect(() => fileToDocument('big.txt', 'a'.repeat(1024 * 1024 + 1))).toThrowError(/too large/i);
  });
});

describe('POST /api/documents/import', () => {
  beforeEach(resetDatabase);

  it('imports a markdown file into a formatted document', async () => {
    const { ali } = await seedUsers();

    const response = await request(app)
      .post('/api/documents/import')
      .set('x-user-id', ali.id)
      .send({ filename: 'project-brief.md', content: '# Project brief\n\nSome **bold** text.' })
      .expect(201);

    expect(response.body.data).toMatchObject({
      title: 'project brief',
      role: 'owner',
      owner: { id: ali.id },
    });
    expect(response.body.data.content.content[0]).toMatchObject({
      type: 'heading',
      attrs: { level: 1 },
    });
  });

  it('imports a plain text file as paragraphs', async () => {
    const { ali } = await seedUsers();

    const response = await request(app)
      .post('/api/documents/import')
      .set('x-user-id', ali.id)
      .send({ filename: 'notes.txt', content: 'Line one\n\nLine two' })
      .expect(201);

    expect(response.body.data.content.content.map((n: { type: string }) => n.type)).toEqual([
      'paragraph',
      'paragraph',
    ]);
  });

  it('rejects an unsupported file type', async () => {
    const { ali } = await seedUsers();

    const response = await request(app)
      .post('/api/documents/import')
      .set('x-user-id', ali.id)
      .send({ filename: 'photo.png', content: 'binary-ish' })
      .expect(400);

    expect(response.body.error).toMatch(/unsupported file type/i);
  });

  it('requires authentication', async () => {
    await request(app)
      .post('/api/documents/import')
      .send({ filename: 'notes.md', content: 'hi' })
      .expect(401);
  });
});

describe('buildPreview', () => {
  it('flattens a stored document to plain text', () => {
    const stored = JSON.stringify(markdownToTipTap('# Title\n\nBody text here.', true));

    expect(buildPreview(stored)).toBe('Title Body text here.');
  });

  it('truncates long content with an ellipsis', () => {
    const stored = JSON.stringify(markdownToTipTap('word '.repeat(100), false));

    const preview = buildPreview(stored, 20);
    expect(preview.endsWith('...')).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(23);
  });

  it('handles empty and missing content', () => {
    expect(buildPreview(null)).toBe('');
    expect(buildPreview('')).toBe('');
  });
});
