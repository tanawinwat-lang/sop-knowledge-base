import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canAccessPage(user.role_id, '/settings/audit-logs')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ดูประวัติ Audit Logs' }, { status: 403 });
  }

  const db = getDB();
  return NextResponse.json({ audit_logs: db.audit_logs });
}
