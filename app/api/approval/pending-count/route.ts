import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';

// GET /api/approval/pending-count — lightweight endpoint returning just the count
// Used by Sidebar to show a badge on the "รออนุมัติ SOP" menu item
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ total: 0 });
  }

  const db = getDB();

  // Counts filtered by user's access permissions
  let pendingSOPs = 0, pendingCRs = 0, feedbacks = 0;

  if (canAccessPage(user.role_id, '/approval')) {
    pendingSOPs = db.sops.filter((s) => s.status === 'PENDING_APPROVE').length;
    pendingCRs = db.change_requests.filter((cr) => cr.status === 'PENDING').length;
  }

  if (canAccessPage(user.role_id, '/feedback')) {
    // Count feedbacks that need attention (dislikes with reasons)
    feedbacks = db.feedbacks.filter((f) => !f.is_helpful).length;
  }

  return NextResponse.json({
    total: pendingSOPs + pendingCRs + feedbacks,
    sops: pendingSOPs,
    change_requests: pendingCRs,
    feedbacks,
  });
}
