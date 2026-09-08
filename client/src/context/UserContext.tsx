import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

const STORAGE_KEY = 'ajaia-docs:active-user-id';

type UserContextValue = {
  users: User[];
  activeUser: User | null;
  /** True while the initial user list is being fetched. */
  loading: boolean;
  /** Set when the user list could not be loaded at all. */
  error: string | null;
  setActiveUser: (id: string) => void;
  reload: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

/**
 * Authentication is simulated for this exercise: the app loads the seeded demo
 * users and the chosen one is sent to the API as `x-user-id`. The selection is
 * persisted so a refresh keeps you signed in as the same person.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    api
      .listUsers(controller.signal)
      .then((list) => {
        setUsers(list);
        // Fall back to the first user when nothing is stored, or when the
        // stored id no longer exists (for example after a re-seed).
        setActiveUserId((current) => {
          if (current && list.some((user) => user.id === current)) return current;
          return list[0]?.id ?? null;
        });
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Could not load users.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadToken]);

  useEffect(() => {
    try {
      if (activeUserId) window.localStorage.setItem(STORAGE_KEY, activeUserId);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // A blocked localStorage only costs us persistence across reloads.
    }
  }, [activeUserId]);

  const setActiveUser = useCallback((id: string) => setActiveUserId(id), []);
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const value = useMemo<UserContextValue>(
    () => ({
      users,
      activeUser: users.find((user) => user.id === activeUserId) ?? null,
      loading,
      error,
      setActiveUser,
      reload,
    }),
    [users, activeUserId, loading, error, setActiveUser, reload]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used inside a <UserProvider>.');
  }
  return context;
}

/**
 * For screens that only render once a user is resolved. App gates on the
 * provider's loading/error state, so the id is guaranteed to be present here.
 */
export function useActiveUser(): User {
  const { activeUser } = useUserContext();
  if (!activeUser) {
    throw new Error('useActiveUser was called before a user was selected.');
  }
  return activeUser;
}
