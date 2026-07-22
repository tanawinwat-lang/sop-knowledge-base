import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDB, saveDB, logAudit } from '@/lib/db';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const announcementId = parseInt(id, 10);
  const db = getDB();

  const announcement = db.announcements.find((a) => a.id === announcementId);
  if (!announcement) {
    return NextResponse.json({ error: 'ไม่พบประกาศนี้' }, { status: 404 });
  }

  // Only ADMIN can delete
  if (user.role_name !== 'ADMIN') {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ลบประกาศ (เฉพาะ Admin เท่านั้น)' }, { status: 403 });
  }

  // Remove the announcement
  db.announcements = db.announcements.filter((a) => a.id !== announcementId);

  // Also clean up related reads and comments
  db.announcement_reads = db.announcement_reads.filter((r) => r.announcement_id !== announcementId);
  db.announcement_comments = db.announcement_comments.filter((c) => c.announcement_id !== announcementId);

  saveDB(db);

  logAudit(
    user.id,
    user.username,
    'DELETE_ANNOUNCEMENT',
    `Announcement #${announcementId}`,
    `ลบประกาศ: ${announcement.title}`
  );

  return NextResponse.json({ success: true, message: 'ลบประกาศเรียบร้อยแล้ว' });
}
