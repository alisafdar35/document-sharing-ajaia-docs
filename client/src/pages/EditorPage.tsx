import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { ArrowLeft, Lock, Share2, Trash2 } from 'lucide-react';
import { ApiError, api } from '../lib/api';
import type { DocumentDetail, Share, TipTapDoc } from '../lib/types';
import { useActiveUser } from '../context/UserContext';
import { useAutosave } from '../hooks/useAutosave';
import { AppHeader } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { Banner } from '../components/Banner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EditorToolbar } from '../components/EditorToolbar';
import { PageLoader } from '../components/Spinner';
import { SaveStatus } from '../components/SaveStatus';
import { ShareDialog } from '../components/ShareDialog';
import { MAX_TITLE_LENGTH } from '../lib/constants';

export default function EditorPage() {
  const { id = '' } = useParams();
  const activeUser = useActiveUser();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | Error | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = document?.role === 'owner';

  const { state, lastSavedAt, queue, flush, reset } = useAutosave({
    documentId: id,
    userId: activeUser.id,
    onSaved: (updated) => {
      setSaveError(null);
      // Refresh metadata only - replacing content here would fight the editor.
      setDocument((current) =>
        current ? { ...current, title: updated.title, updatedAt: updated.updatedAt } : current
      );
    },
    onError: setSaveError,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    editorProps: {
      attributes: {
        class: 'ProseMirror',
        'aria-label': 'Document body',
      },
    },
    onUpdate: ({ editor: instance }) => {
      queue({ content: instance.getJSON() as TipTapDoc });
    },
  });

  // Guards against a slow response for document A landing after we have already
  // navigated to document B (or switched user).
  const requestKeyRef = useRef('');

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = `${id}:${activeUser.id}`;
    requestKeyRef.current = requestKey;

    setLoading(true);
    setLoadError(null);
    setSaveError(null);

    api
      .getDocument(id, activeUser.id, controller.signal)
      .then((detail) => {
        if (requestKeyRef.current !== requestKey) return;
        setDocument(detail);
        setTitle(detail.title);
        reset(detail.updatedAt);
        // `false` keeps this from firing onUpdate and marking the doc dirty.
        editor?.commands.setContent(detail.content, false);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        if (requestKeyRef.current !== requestKey) return;
        setLoadError(cause instanceof Error ? cause : new Error('The document could not be loaded.'));
      })
      .finally(() => {
        if (!controller.signal.aborted && requestKeyRef.current === requestKey) setLoading(false);
      });

    return () => controller.abort();
  }, [id, activeUser.id, editor, reset]);

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      // An empty title is rejected by the API, so only send real ones.
      if (value.trim()) queue({ title: value.trim() });
    },
    [queue]
  );

  const handleTitleBlur = useCallback(() => {
    if (!title.trim() && document) {
      setTitle(document.title); // Restore rather than persist an empty name.
      return;
    }
    void flush();
  }, [title, document, flush]);

  const handleDelete = useCallback(async () => {
    if (!document) return;
    setDeleting(true);
    try {
      await api.deleteDocument(document.id, activeUser.id);
      navigate('/', { replace: true });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'The document could not be deleted.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [document, activeUser.id, navigate]);

  const handleSharesChange = useCallback((shares: Share[]) => {
    setDocument((current) => (current ? { ...current, shares } : current));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <PageLoader label="Opening document..." />
      </div>
    );
  }

  if (loadError || !document) {
    return <LoadFailure error={loadError} />;
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        center={
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="btn-ghost -ml-2 shrink-0 px-2"
              aria-label="Back to all documents"
              onClick={() => void flush()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0 flex-1">
              {isOwner ? (
                <input
                  value={title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  onBlur={handleTitleBlur}
                  maxLength={MAX_TITLE_LENGTH}
                  aria-label="Document title"
                  className="w-full truncate rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-slate-900 hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none"
                />
              ) : (
                <p className="truncate px-1.5 py-1 text-sm font-semibold text-slate-900">
                  {document.title}
                </p>
              )}
              <div className="px-1.5">
                <SaveStatus state={state} lastSavedAt={lastSavedAt} onRetry={() => void flush()} />
              </div>
            </div>
          </div>
        }
      />

      {editor && <EditorToolbar editor={editor} />}

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {isOwner ? (
              <>
                {document.shares.length > 0 ? (
                  <>
                    <span className="flex -space-x-1.5">
                      {document.shares.slice(0, 4).map((share) => (
                        <span key={share.id} className="ring-2 ring-white rounded-full">
                          <Avatar user={share.user} size="sm" />
                        </span>
                      ))}
                    </span>
                    <span>
                      Shared with {document.shares.length}{' '}
                      {document.shares.length === 1 ? 'person' : 'people'}
                    </span>
                  </>
                ) : (
                  <span>Only you can see this document</span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Shared by {document.owner.name} &middot; you can edit the content
              </span>
            )}
          </div>

          {isOwner && (
            <div className="flex items-center gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Share
              </button>
              <button
                type="button"
                className="btn-ghost text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {saveError && (
          <div className="mb-4">
            <Banner message={saveError} onDismiss={() => setSaveError(null)} />
          </div>
        )}

        <div className="ajaia-editor rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-card sm:px-10 sm:py-12">
          <EditorContent editor={editor} />
        </div>
      </main>

      {shareOpen && (
        <ShareDialog
          documentId={document.id}
          documentTitle={document.title}
          owner={document.owner}
          shares={document.shares}
          currentUserId={activeUser.id}
          onSharesChange={handleSharesChange}
          onClose={() => setShareOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete document"
          message={`"${document.title}" will be permanently deleted, along with everyone's access to it. This cannot be undone.`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

/** Renders 403 / 404 / network failures as a readable page rather than a toast. */
function LoadFailure({ error }: { error: ApiError | Error | null }) {
  const apiError = error instanceof ApiError ? error : null;

  const { heading, message } = apiError?.isForbidden
    ? {
        heading: 'You do not have access',
        message:
          'This document has not been shared with the user you are viewing as. Try switching users from the menu in the top-right corner.',
      }
    : apiError?.isNotFound
      ? {
          heading: 'Document not found',
          message: 'It may have been deleted by its owner.',
        }
      : {
          heading: 'Something went wrong',
          message: error?.message ?? 'The document could not be loaded.',
        };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-lg font-semibold text-slate-900">{heading}</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <Link to="/" className="btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to all documents
        </Link>
      </main>
    </div>
  );
}
