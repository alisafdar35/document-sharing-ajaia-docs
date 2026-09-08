import { useMemo, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { api } from '../lib/api';
import { useUserContext } from '../context/UserContext';
import type { Share, UserRef } from '../lib/types';
import { Avatar } from './Avatar';
import { Banner } from './Banner';
import { Modal } from './Modal';
import { Spinner } from './Spinner';

type ShareDialogProps = {
  documentId: string;
  documentTitle: string;
  owner: UserRef;
  shares: Share[];
  /** The owner performing the change; sent as x-user-id. */
  currentUserId: string;
  onSharesChange: (shares: Share[]) => void;
  onClose: () => void;
};

/**
 * Owner-only dialog for granting and revoking editor access. Everyone the
 * document is shared with gets full edit rights (the API's only permission).
 */
export function ShareDialog({
  documentId,
  documentTitle,
  owner,
  shares,
  currentUserId,
  onSharesChange,
  onClose,
}: ShareDialogProps) {
  const { users } = useUserContext();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The owner and anyone who already has access are not offerable again.
  const candidates = useMemo(
    () => users.filter((user) => user.id !== owner.id && !shares.some((s) => s.user.id === user.id)),
    [users, owner.id, shares]
  );

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    setError(null);
    try {
      const share = await api.shareDocument(documentId, currentUserId, selectedUserId);
      onSharesChange([...shares, share]);
      setSelectedUserId('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The document could not be shared.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (share: Share) => {
    setRemovingId(share.user.id);
    setError(null);
    try {
      await api.unshareDocument(documentId, currentUserId, share.user.id);
      onSharesChange(shares.filter((entry) => entry.id !== share.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Access could not be removed.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Modal
      title="Share document"
      description={`Give someone edit access to "${documentTitle}".`}
      onClose={onClose}
      footer={
        <button type="button" className="btn-secondary" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="space-y-4">
        {error && <Banner message={error} onDismiss={() => setError(null)} />}

        {candidates.length > 0 ? (
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">Add a person</span>
              <select
                className="input"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                disabled={adding}
              >
                <option value="">Select someone...</option>
                {candidates.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAdd}
              disabled={!selectedUserId || adding}
            >
              {adding ? <Spinner /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
              Share
            </button>
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
            Everyone already has access to this document.
          </p>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            People with access
          </p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            <li className="flex items-center gap-2.5 px-3 py-2.5">
              <Avatar user={owner} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">{owner.name}</span>
                <span className="block truncate text-xs text-slate-500">{owner.email}</span>
              </span>
              <span className="text-xs font-medium text-slate-500">Owner</span>
            </li>

            {shares.map((share) => (
              <li key={share.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <Avatar user={share.user} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {share.user.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{share.user.email}</span>
                </span>
                <span className="text-xs font-medium capitalize text-slate-500">
                  {share.permission}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(share)}
                  disabled={removingId === share.user.id}
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  aria-label={`Remove ${share.user.name}`}
                >
                  {removingId === share.user.id ? <Spinner /> : <X className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
