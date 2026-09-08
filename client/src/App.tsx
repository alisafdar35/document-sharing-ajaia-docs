import { Navigate, Route, Routes } from 'react-router-dom';
import { useUserContext } from './context/UserContext';
import { PageLoader } from './components/Spinner';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const { activeUser, loading, error, reload } = useUserContext();

  // Every screen needs an active user, so the whole app waits for one rather
  // than each page guarding against a null.
  if (loading) {
    return <PageLoader label="Starting Ajaia Docs..." />;
  }

  if (error || !activeUser) {
    return <StartupError message={error} onRetry={reload} />;
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/documents/:id" element={<EditorPage />} />
      <Route path="/documents" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function StartupError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold text-slate-900">Ajaia Docs could not start</h1>
        <p className="mt-2 text-sm text-slate-500">
          {message ?? 'No users were found. Run `npm run db:seed` to create the demo users.'}
        </p>
        <button type="button" className="btn-primary mt-6" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
