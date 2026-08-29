export type AccountUser = {
  id: string;
  email?: string;
  username: string;
  displayName: string;
  bio?: string;
  locale?: string;
  avatar?: string;
  role?: string;
};

export type LiveRoom = {
  id: string;
  hostId: string;
  title: string;
  status: 'live' | 'ended';
  viewerCount?: number;
  createdAt?: string;
  host?: AccountUser;
};

export type ExternalLiveEvent = {
  id: string;
  cursor: number;
  type: 'chat' | 'question' | 'gift' | 'like' | 'follow' | 'share' | 'subscribe' | 'member' | 'viewer' | 'guest' | 'stream_end';
  occurredAt?: string;
  source?: string;
  text?: string | null;
  user?: { id?: string | null; username?: string | null; displayName?: string };
  gift?: { id?: string | null; name: string; count: number; diamonds: number } | null;
  guest?: { status?: string | null } | null;
};

export type VideoItem = {
  id: string;
  title: string;
  description?: string;
  author?: AccountUser;
  media?: { url?: string | null } | null;
  stream?: { playlistUrl?: string | null } | null;
};
