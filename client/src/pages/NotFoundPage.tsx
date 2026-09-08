import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          That link does not lead anywhere in Ajaia Docs.
        </p>
        <Link to="/" className="btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to all documents
        </Link>
      </main>
    </div>
  );
}
