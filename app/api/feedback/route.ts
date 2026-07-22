import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canAccessPage(currentUser.role_id, '/feedback')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงหน้ารายงาน Feedback' }, { status: 403 });
  }

  const db = getDB();

  // Only return dislikes (is_helpful === false) — the feedback page is for identifying SOPs needing improvement
  const dislikesOnly = db.feedbacks.filter((f) => !f.is_helpful);

  // Join feedback with user info
  const feedbacksWithUsers = dislikesOnly.map((f) => {
    const user = db.users.find((u) => u.id === f.user_id);
    const role = user ? db.roles.find((r) => r.id === user.role_id) : null;
    return {
      ...f,
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email,
            role_name: role ? role.role_name : 'AGENT',
          }
        : {
            id: f.user_id,
            username: `User #${f.user_id}`,
            email: 'agent@company.com',
            role_name: 'AGENT',
          },
    };
  });

  return NextResponse.json({ feedbacks: feedbacksWithUsers, sops: db.sops });
}
