import { Link } from 'react-router-dom';
import { Trash2, Users } from 'lucide-react';
import { formatRelativeTime } from '../lib/format';
import type { DocumentSummary } from '../lib/types';
import { Avatar } from './Avatar';

type DocumentCardProps = {
  document: DocumentSummary;
  onDelete?: (document: DocumentSummary) => void;
};

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const isOwner = document.role === 'owner';
  const sharedWith = document.sharedWithCount ?? 0;

  return (
    <div className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-page focus-within:shadow-page">
      <Link to={`/documents/${document.id}`} className="flex min-h-[7.5rem] flex-col focus:outline-none">
        {/* Stretched link keeps the whole card clickable while the delete
            button below stays independently focusable. */}
        <span className="absolute inset-0 rounded-xl" aria-hidden="true" />
        <h3 className="truncate pr-8 text-sm font-semibold text-slate-900">{document.title}</h3>
        <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">
          {document.preview || <span className="italic text-slate-400">No content yet</span>}
        </p>
      </Link>

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        {!isOwner && <Avatar user={document.owner} size="sm" />}
        <span className="min-w-0 flex-1 truncate">
          {isOwner ? `Edited ${formatRelativeTime(document.updatedAt)}` : `Shared by ${document.owner.name}`}
        </span>

        {isOwner && sharedWith > 0 && (
          <span
            className="z-10 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600"
            title={`Shared with ${sharedWith} ${sharedWith === 1 ? 'person' : 'people'}`}
          >
            <Users className="h-3 w-3" aria-hidden="true" />
            {sharedWith}
          </span>
        )}

        {isOwner && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(document)}
            className="z-10 rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Delete ${document.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
