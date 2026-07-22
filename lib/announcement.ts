import { getDB, saveDB, getNextId } from './db';
import type { Announcement } from './db';

export function createSOPAnnouncement(
  userId: number,
  action: 'CREATED' | 'UPDATED' | 'APPROVED',
  sopTitle: string,
  sopId: number
) {
  const db = getDB();

  const title =
    action === 'CREATED'
      ? `📄 SOP ใหม่: ${sopTitle}`
      : action === 'UPDATED'
        ? `✏️ อัปเดต SOP: ${sopTitle}`
        : `✅ อนุมัติ SOP: ${sopTitle}`;

  const content =
    action === 'CREATED'
      ? `มีเอกสาร SOP ใหม่ถูกเผยแพร่ในระบบ: "${sopTitle}" โปรดเข้าไปตรวจสอบรายละเอียด`
      : action === 'UPDATED'
        ? `เอกสาร SOP "${sopTitle}" มีการอัปเดตเนื้อหาเวอร์ชันใหม่ โปรดตรวจสอบและรับทราบ`
        : `เอกสาร SOP "${sopTitle}" ได้รับการอนุมัติแล้ว สามารถนำไปใช้งานได้`;

  const newAnnouncement: Announcement = {
    id: getNextId('announcement'),
    title,
    content,
    announcement_type: 'SOP_UPDATE',
    related_sop_id: sopId,
    created_by: userId,
    created_at: new Date().toISOString(),
    attachments: [],
  };

  db.announcements.push(newAnnouncement);
  saveDB(db);
}
