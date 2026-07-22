import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDB, saveDB, logAudit, getNextId } from '@/lib/db';
import { canWritePage } from '@/lib/rbac';
import type { Announcement } from '@/lib/db';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDB();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.toLowerCase() || '';
  const includeRead = searchParams.get('include_read') === 'true';

  let announcements = db.announcements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Search filter
  if (q) {
    announcements = announcements.filter(
      (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
    );
  }

  // Filter by target_role_ids — if announcement has target_roles, user must be in one of them
  announcements = announcements.filter((ann) => {
    if (!ann.target_role_ids || ann.target_role_ids.length === 0) return true;
    return ann.target_role_ids.includes(user.role_id);
  });

  // Attach read status and comment count for current user
  const result = announcements.map((ann) => {
    const readEntry = db.announcement_reads.find((r) => r.announcement_id === ann.id && r.user_id === user.id);
    const commentCount = db.announcement_comments.filter((c) => c.announcement_id === ann.id).length;
    const creator = db.users.find((u) => u.id === ann.created_by);
    return {
      ...ann,
      isRead: !!readEntry,
      acknowledged: readEntry?.acknowledged || false,
      readAt: readEntry?.read_at || null,
      commentCount,
      createdBy: creator?.username || 'Unknown',
    };
  });

  // Filter out read if not requested
  const filtered = includeRead ? result : result.filter((a) => !a.isRead);

  // Count unread
  const unreadCount = result.filter((a) => !a.isRead).length;

  return NextResponse.json({ announcements: filtered, unreadCount, total: result.length });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
  }
  // Check DB page_permissions via helper
  if (!canWritePage(user.role_id, '/announcements')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์สร้างประกาศ' }, { status: 403 });
  }

  try {
    const { title, content, announcement_type, related_sop_id, attachments, target_role_ids } = await req.json();
    const db = getDB();
    const newId = getNextId('announcement');

    const newAnn: Announcement = {
      id: newId,
      title,
      content,
      announcement_type: announcement_type || 'GENERAL',
      related_sop_id: related_sop_id || undefined,
      created_by: user.id,
      created_at: new Date().toISOString(),
      attachments: Array.isArray(attachments) ? attachments : [],
      target_role_ids: Array.isArray(target_role_ids) && target_role_ids.length > 0 ? target_role_ids : undefined,
    };

    db.announcements.push(newAnn);
    saveDB(db);
    logAudit(user.id, user.username, 'CREATE_ANNOUNCEMENT', `Announcement #${newId}`, `สร้างประกาศ: ${title}`);

    return NextResponse.json({ announcement: { ...newAnn, isRead: false, acknowledged: false, commentCount: 0, createdBy: user.username } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
