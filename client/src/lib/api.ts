import type { DocumentDetail, DocumentList, Share, TipTapDoc, User } from './types';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

/** An error carrying the HTTP status so callers can react to 403 / 404. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** True when the API could not be reached at all. */
  get isOffline() {
    return this.status === 0;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** The active demo user; sent as the x-user-id header. */
  userId?: string | null;
  signal?: AbortSignal;
};

/**
 * Single entry point for every API call. Unwraps the `{ success, data }`
 * envelope and turns `{ success: false, error }` into a thrown ApiError so
 * components only ever deal with data or an exception.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, userId, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (userId) headers['x-user-id'] = userId;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    // Re-throw aborts untouched so callers can ignore them.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    // Name the URL we actually tried: locally that means "start the API",
    // once deployed it usually means VITE_API_URL is unset or wrong.
    throw new ApiError(0, `Cannot reach the API at ${API_URL}. Check that it is running and that VITE_API_URL points at it.`);
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // A non-JSON body (proxy error page, empty 502) is handled below.
  }

  const envelope = payload as { success?: boolean; data?: T; error?: string } | null;

  if (!response.ok || !envelope?.success) {
    throw new ApiError(
      response.status,
      envelope?.error ?? `Request failed (${response.status}).`
    );
  }

  return envelope.data as T;
}

export const api = {
  listUsers: (signal?: AbortSignal) => request<User[]>('/users', { signal }),

  listDocuments: (userId: string, signal?: AbortSignal) =>
    request<DocumentList>('/documents', { userId, signal }),

  getDocument: (id: string, userId: string, signal?: AbortSignal) =>
    request<DocumentDetail>(`/documents/${id}`, { userId, signal }),

  createDocument: (userId: string, title?: string) =>
    request<DocumentDetail>('/documents', {
      method: 'POST',
      userId,
      body: title ? { title } : {},
    }),

  importDocument: (userId: string, filename: string, content: string) =>
    request<DocumentDetail>('/documents/import', {
      method: 'POST',
      userId,
      body: { filename, content },
    }),

  updateDocument: (
    id: string,
    userId: string,
    patch: { title?: string; content?: TipTapDoc },
    signal?: AbortSignal
  ) => request<DocumentDetail>(`/documents/${id}`, { method: 'PATCH', userId, body: patch, signal }),

  deleteDocument: (id: string, userId: string) =>
    request<{ id: string; deleted: boolean }>(`/documents/${id}`, { method: 'DELETE', userId }),

  shareDocument: (id: string, userId: string, targetUserId: string) =>
    request<Share>(`/documents/${id}/share`, {
      method: 'POST',
      userId,
      body: { userId: targetUserId, permission: 'editor' },
    }),

  unshareDocument: (id: string, userId: string, targetUserId: string) =>
    request<{ documentId: string; userId: string; removed: boolean }>(
      `/documents/${id}/share/${targetUserId}`,
      { method: 'DELETE', userId }
    ),
};
