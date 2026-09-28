import { NextResponse } from 'next/server';
import { getCurrentUser, getRolePermissions } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null, permissions: null }, { status: 401 });
  }

  const permissions = getRolePermissions(user.role);
  return NextResponse.json({ user, permissions });
}
