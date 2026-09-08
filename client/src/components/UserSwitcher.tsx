import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useUserContext } from '../context/UserContext';
import { Avatar } from './Avatar';

/**
 * Stands in for a real login: switching the active user changes the `x-user-id`
 * sent with every request, so the whole app re-renders as that person.
 */
export function UserSwitcher() {
  const { users, activeUser, setActiveUser } = useUserContext();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!activeUser) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar user={activeUser} size="sm" />
        <span className="hidden sm:inline">{activeUser.name}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-page"
        >
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Viewing as
          </p>
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setActiveUser(user.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-50"
            >
              <Avatar user={user} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">{user.name}</span>
                <span className="block truncate text-xs text-slate-500">{user.email}</span>
              </span>
              {user.id === activeUser.id && (
                <Check className="h-4 w-4 shrink-0 text-brand-600" aria-label="Selected" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
