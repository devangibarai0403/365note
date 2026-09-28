import { cookies } from 'next/headers';
import { UserProfile, UserRole } from '@/types';
import { query } from './db';
import { decodeSession, encodeSession, SessionData } from './session';

export { decodeSession, encodeSession };
export type { SessionData };

const COOKIE_NAME = '365note_session';

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const session = decodeSession(sessionCookie.value);
    if (!session?.username) return null;

    // Fetch fresh profile from database
    const res = await query<UserProfile>(
      'SELECT id, username, display_name, role, pin_code, avatar_url, created_at FROM public.users WHERE username = $1',
      [session.username]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export function getRolePermissions(role: UserRole) {
  return {
    isAdmin: role === 'admin',
    isDevangi: role === 'devangi',
    isShrikesh: role === 'shrikesh',
    canAccessClasses: role === 'admin' || role === 'devangi',
    canAccessSchool: role === 'admin' || role === 'devangi',
    canAccessOffice: role === 'admin' || role === 'shrikesh',
    canAccessKharcha: true,
    canAccessFamilyMoney: true,
    canAccessExcelImport: role === 'admin',
    canAccessAdminCalendar: role === 'admin',
    canAccessAllReports: role === 'admin',
  };
}
