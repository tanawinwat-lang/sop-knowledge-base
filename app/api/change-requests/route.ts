import { NextResponse } from 'next/server';
import { getDB, saveDB, logAudit } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canWritePage } from '@/lib/rbac';

// GET /api/change-requests?status=PENDING — list change requests
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
  }

  const db = getDB();
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status');

  let requests = [...db.change_requests];

  if (statusFilter) {
    requests = requests.filter((r) => r.status === statusFilter);
  }

  // Sort newest first
  requests.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());

  // Attach SOP title for display
  const result = requests.map((cr) => {
    const sop = db.sops.find((s) => s.id === cr.sop_id);
    return {
      ...cr,
      sop_title: sop?.title || '(SOP ถูกลบแล้ว)',
    };
  });

  return NextResponse.json({ change_requests: result });
}
