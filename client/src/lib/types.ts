/** Mirrors the payload shapes returned by the Ajaia Docs API. */

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

/** The subset of a user that is embedded in document payloads. */
export type UserRef = Pick<User, 'id' | 'name' | 'email'>;

export type DocumentRole = 'owner' | 'editor';

export type Share = {
  id: string;
  permission: string;
  createdAt: string;
  user: UserRef;
};

/** A TipTap / ProseMirror document node. */
export type TipTapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: TipTapNode[];
};

export type TipTapDoc = {
  type: 'doc';
  content?: TipTapNode[];
};

/** A card on the dashboard - the API sends a plain-text preview, not content. */
export type DocumentSummary = {
  id: string;
  title: string;
  preview: string;
  owner: UserRef;
  role: DocumentRole;
  /** Owned documents only. */
  sharedWithCount?: number;
  /** Shared documents only. */
  permission?: string;
  sharedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentList = {
  owned: DocumentSummary[];
  shared: DocumentSummary[];
};

export type DocumentDetail = {
  id: string;
  title: string;
  content: TipTapDoc;
  owner: UserRef;
  role: DocumentRole;
  shares: Share[];
  createdAt: string;
  updatedAt: string;
};
