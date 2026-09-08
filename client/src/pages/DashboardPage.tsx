import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, FileText, Users } from 'lucide-react';
import { api } from '../lib/api';
import type { DocumentList, DocumentSummary } from '../lib/types';
import { useActiveUser } from '../context/UserContext';
import { AppHeader } from '../components/AppHeader';
import { Banner } from '../components/Banner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DocumentCard } from '../components/DocumentCard';
import { EmptyState } from '../components/EmptyState';
import { ImportButton } from '../components/ImportButton';
import { PageLoader, Spinner } from '../components/Spinner';

const EMPTY_LIST: DocumentList = { owned: [], shared: [] };

export default function DashboardPage() {
  const activeUser = useActiveUser();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<DocumentList>(EMPTY_LIST);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Re-fetches whenever the active user changes, so the switcher swaps the
  // whole dashboard over to that person's documents.
  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    api
      .listDocuments(activeUser.id, controller.signal)
      .then(setDocuments)
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Could not load your documents.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeUser.id]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const created = await api.createDocument(activeUser.id);
      navigate(`/documents/${created.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The document could not be created.');
      setCreating(false);
    }
  }, [activeUser.id, navigate]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteDocument(pendingDelete.id, activeUser.id);
      setDocuments((current) => ({
        ...current,
        owned: current.owned.filter((doc) => doc.id !== pendingDelete.id),
      }));
      setPendingDelete(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The document could not be deleted.');
    } finally {
      setDeleting(false);
    }
  }, [activeUser.id, pendingDelete]);

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {greeting()}, {activeUser.name.split(' ')[0]}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Your documents and everything shared with you.
            </p>
          </div>

          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <div className="flex items-center gap-2">
              <ImportButton
                userId={activeUser.id}
                onImported={(document) => navigate(`/documents/${document.id}`)}
                onError={setError}
              />
              <button type="button" className="btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? <Spinner /> : <FilePlus2 className="h-4 w-4" aria-hidden="true" />}
                New document
              </button>
            </div>
            {/* The supported formats are stated up front, not only in the error
                you get after picking the wrong file. */}
            <p className="text-xs text-slate-400">Import supports .txt and .md files, up to 1 MB.</p>
          </div>
        </div>

        {error && (
          <div className="mt-5">
            <Banner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {loading ? (
          <PageLoader label="Loading your documents..." />
        ) : (
          <>
            <Section title="My documents" count={documents.owned.length}>
              {documents.owned.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No documents yet"
                  message="Create a blank document or import a .txt or .md file to get started."
                  action={
                    <button type="button" className="btn-primary" onClick={handleCreate} disabled={creating}>
                      {creating ? <Spinner /> : <FilePlus2 className="h-4 w-4" aria-hidden="true" />}
                      New document
                    </button>
                  }
                />
              ) : (
                <CardGrid>
                  {documents.owned.map((document) => (
                    <DocumentCard key={document.id} document={document} onDelete={setPendingDelete} />
                  ))}
                </CardGrid>
              )}
            </Section>

            <Section title="Shared with me" count={documents.shared.length}>
              {documents.shared.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nothing shared with you"
                  message="When someone shares a document with you, it will show up here."
                />
              ) : (
                <CardGrid>
                  {documents.shared.map((document) => (
                    <DocumentCard key={document.id} document={document} />
                  ))}
                </CardGrid>
              )}
            </Section>
          </>
        )}
      </main>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete document"
          message={`"${pendingDelete.title}" will be permanently deleted, along with everyone's access to it. This cannot be undone.`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        {title}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {count}
        </span>
      </h2>
      {children}
    </section>
  );
}

function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
