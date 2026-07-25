import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { canAccessPage } from '@/lib/rbac';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 🔐 RBAC check: only users with permission can view acknowledgments
  if (!canAccessPage(user.role_id, '/announcements/acknowledgments')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' }, { status: 403 });
  }

  const announcementId = parseInt(id, 10);
  const db = getDB();

  const announcement = db.announcements.find((a) => a.id === announcementId);
  if (!announcement) {
    return NextResponse.json({ error: 'ไม่พบประกาศ' }, { status: 404 });
  }

  // Get all read/acknowledged entries for this announcement
  const reads = db.announcement_reads.filter(
    (r) => r.announcement_id === announcementId && r.acknowledged === true
  );

  // Enrich with user info
  const acknowledgments = reads.map((r) => {
    const aUser = db.users.find((u) => u.id === r.user_id);
    return {
      id: r.id,
      user_id: r.user_id,
      username: aUser?.username || 'Unknown',
      email: aUser?.email || '',
      role: db.roles.find((rl) => rl.id === aUser?.role_id)?.role_name || '',
      read_at: r.read_at,
    };
  });

  // Sort by most recent first
  acknowledgments.sort(
    (a, b) => new Date(b.read_at).getTime() - new Date(a.read_at).getTime()
  );

  return NextResponse.json({
    announcement_id: announcementId,
    announcement_title: announcement.title,
    total: acknowledgments.length,
    acknowledgments,
  });
}
