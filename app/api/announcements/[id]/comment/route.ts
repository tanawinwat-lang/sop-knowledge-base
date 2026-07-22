import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDB, saveDB } from '@/lib/db';
import type { AnnouncementComment } from '@/lib/db';

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

  try {
    const { comment } = await req.json();
    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกข้อความ' }, { status: 400 });
    }

    const newId = db.announcement_comments.length ? Math.max(...db.announcement_comments.map((c) => c.id)) + 1 : 1;
    const newComment: AnnouncementComment = {
      id: newId,
      announcement_id: announcementId,
      user_id: user.id,
      username: user.username,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    };

    db.announcement_comments.push(newComment);
    saveDB(db);

    return NextResponse.json({ comment: newComment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const announcementId = parseInt(id, 10);
  const db = getDB();

  const comments = db.announcement_comments
    .filter((c) => c.announcement_id === announcementId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return NextResponse.json({ comments });
}
