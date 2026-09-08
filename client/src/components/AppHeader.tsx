import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { UserSwitcher } from './UserSwitcher';

/**
 * The bar shared by every screen. `center` lets the editor drop its title
 * field into the middle without duplicating the shell.
 */
export function AppHeader({ center }: { center?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">Ajaia Docs</span>
        </Link>

        <div className="min-w-0 flex-1">{center}</div>

        <UserSwitcher />
      </div>
    </header>
  );
}
