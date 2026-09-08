import type { Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ToolbarButton = {
  icon: LucideIcon;
  label: string;
  run: () => void;
  isActive?: () => boolean;
  isDisabled?: () => boolean;
};

/** Formatting controls for the TipTap editor. Hidden entirely when read-only. */
export function EditorToolbar({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const groups: ToolbarButton[][] = [
    [
      {
        icon: Bold,
        label: 'Bold',
        run: () => editor.chain().focus().toggleBold().run(),
        isActive: () => editor.isActive('bold'),
      },
      {
        icon: Italic,
        label: 'Italic',
        run: () => editor.chain().focus().toggleItalic().run(),
        isActive: () => editor.isActive('italic'),
      },
      {
        icon: UnderlineIcon,
        label: 'Underline',
        run: () => editor.chain().focus().toggleUnderline().run(),
        isActive: () => editor.isActive('underline'),
      },
      {
        icon: Strikethrough,
        label: 'Strikethrough',
        run: () => editor.chain().focus().toggleStrike().run(),
        isActive: () => editor.isActive('strike'),
      },
      {
        icon: Code,
        label: 'Inline code',
        run: () => editor.chain().focus().toggleCode().run(),
        isActive: () => editor.isActive('code'),
      },
    ],
    [
      {
        icon: Heading1,
        label: 'Heading 1',
        run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: () => editor.isActive('heading', { level: 1 }),
      },
      {
        icon: Heading2,
        label: 'Heading 2',
        run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: () => editor.isActive('heading', { level: 2 }),
      },
      {
        icon: Heading3,
        label: 'Heading 3',
        run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: () => editor.isActive('heading', { level: 3 }),
      },
    ],
    [
      {
        icon: List,
        label: 'Bullet list',
        run: () => editor.chain().focus().toggleBulletList().run(),
        isActive: () => editor.isActive('bulletList'),
      },
      {
        icon: ListOrdered,
        label: 'Numbered list',
        run: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: () => editor.isActive('orderedList'),
      },
      {
        icon: Quote,
        label: 'Quote',
        run: () => editor.chain().focus().toggleBlockquote().run(),
        isActive: () => editor.isActive('blockquote'),
      },
    ],
    [
      {
        icon: Undo2,
        label: 'Undo',
        run: () => editor.chain().focus().undo().run(),
        isDisabled: () => !editor.can().undo(),
      },
      {
        icon: Redo2,
        label: 'Redo',
        run: () => editor.chain().focus().redo().run(),
        isDisabled: () => !editor.can().redo(),
      },
    ],
  ];

  return (
    <div className="sticky top-14 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-1 px-4 py-2 sm:px-6">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-1">
            {groupIndex > 0 && <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />}
            {group.map(({ icon: Icon, label, run, isActive, isDisabled }) => {
              const active = isActive?.() ?? false;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={run}
                  disabled={disabled || (isDisabled?.() ?? false)}
                  aria-label={label}
                  aria-pressed={active}
                  title={label}
                  className={`rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
