import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encodeSession, getCurrentUser } from '@/lib/auth';
import { UserProfile } from '@/types';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function POST(req: NextRequest) {
  try {
    const { username, pin_code } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const res = await query<UserProfile>(
      'SELECT id, username, display_name, role, pin_code, avatar_url, created_at FROM public.users WHERE username = $1',
      [username.toLowerCase().trim()]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = res.rows[0];

    // Optional PIN verification if provided
    if (pin_code && user.pin_code && user.pin_code !== pin_code) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    const sessionData = {
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    };

    const encoded = encodeSession(sessionData);

    const response = NextResponse.json({
      success: true,
      user,
    });

    response.cookies.set({
      name: '365note_session',
      value: encoded,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year persistence
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
