import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDB, saveDB } from '@/lib/db';
import type { AnnouncementRead } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const announcementId = parseInt(id, 10);
  const db = getDB();

  const announcement = db.announcements.find((a) => a.id === announcementId);
  if (!announcement) {
    return NextResponse.json({ error: 'ไม่พบประกาศ' }, { status: 404 });
  }

  // Check if already marked as read
  const existing = db.announcement_reads.find(
    (r) => r.announcement_id === announcementId && r.user_id === user.id
  );
  if (existing) {
    // Update to acknowledged
    existing.acknowledged = true;
    saveDB(db);
    return NextResponse.json({ success: true, message: 'รับทราบประกาศแล้ว' });
  }

  const newId = db.announcement_reads.length
    ? Math.max(...db.announcement_reads.map((r) => r.id)) + 1
    : 1;

  const newRead: AnnouncementRead = {
    id: newId,
    announcement_id: announcementId,
    user_id: user.id,
    read_at: new Date().toISOString(),
    acknowledged: true,
  };

  db.announcement_reads.push(newRead);
  saveDB(db);

  return NextResponse.json({
    success: true,
    announcementRead: newRead,
  });
}
