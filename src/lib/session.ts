import { UserRole } from '@/types';

export interface SessionData {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
}

export function encodeSession(session: SessionData): string {
  // Works in both Node and Edge runtime
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(JSON.stringify(session)).toString('base64');
  }
  return btoa(JSON.stringify(session));
}

export function decodeSession(encoded: string): SessionData | null {
  try {
    if (typeof Buffer !== 'undefined') {
      return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
    }
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}
