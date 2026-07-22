import { NextResponse } from 'next/server';
import { getDB, saveDB } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';

// POST /api/sops/batch — perform bulk operations on SOPs
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !canAccessPage(user.role_id, '/sops')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await req.json();
  const { action, ids, value } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'กรุณาเลือก SOP ที่ต้องการดำเนินการ' }, { status: 400 });
  }

  if (!action) {
    return NextResponse.json({ error: 'กรุณาระบุประเภทการดำเนินการ' }, { status: 400 });
  }

  const db = getDB();
  const { logAudit } = await import('@/lib/db');

  switch (action) {
    case 'DELETE': {
      // Move to trash
      const toTrash = db.sops.filter((s) => ids.includes(s.id));
      for (const sop of toTrash) {
        db.trash_sops.push({
          sop,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          deleted_by_username: user.username,
        });
      }
      db.sops = db.sops.filter((s) => !ids.includes(s.id));
      logAudit(user.id, user.username, 'BULK_DELETE_SOP', `SOP IDs: ${ids.join(',')}`, `ลบ SOP แบบกลุ่ม ${toTrash.length} รายการ`);
      saveDB(db);
      return NextResponse.json({ success: true, count: toTrash.length, message: `ย้าย ${toTrash.length} รายการไปถังขยะแล้ว` });
    }

    case 'MOVE_CATEGORY': {
      const categoryId = parseInt(value, 10);
      if (!categoryId) {
        return NextResponse.json({ error: 'กรุณาระบุหมวดหมู่ปลายทาง' }, { status: 400 });
      }
      let count = 0;
      for (const sop of db.sops) {
        if (ids.includes(sop.id)) {
          sop.category_id = categoryId;
          count++;
        }
      }
      logAudit(user.id, user.username, 'BULK_MOVE_SOP', `SOP IDs: ${ids.join(',')}`, `ย้ายหมวดหมู่ ${count} รายการไป category_id=${categoryId}`);
      saveDB(db);
      return NextResponse.json({ success: true, count, message: `ย้าย ${count} รายการไปหมวดหมู่ใหม่แล้ว` });
    }

    case 'ADD_TAGS': {
      const newTags: string[] = value || [];
      if (newTags.length === 0) {
        return NextResponse.json({ error: 'กรุณาระบุแท็กที่จะเพิ่ม' }, { status: 400 });
      }
      let count = 0;
      for (const sop of db.sops) {
        if (ids.includes(sop.id)) {
          for (const tag of newTags) {
            if (!sop.tags.includes(tag)) {
              sop.tags.push(tag);
            }
          }
          count++;
        }
      }
      logAudit(user.id, user.username, 'BULK_TAG_SOP', `SOP IDs: ${ids.join(',')}`, `เพิ่มแท็ก ${newTags.join(',')} ให้ ${count} รายการ`);
      saveDB(db);
      return NextResponse.json({ success: true, count, message: `เพิ่มแท็กให้ ${count} รายการแล้ว` });
    }

    case 'REMOVE_TAGS': {
      const removeTags: string[] = value || [];
      if (removeTags.length === 0) {
        return NextResponse.json({ error: 'กรุณาระบุแท็กที่จะลบ' }, { status: 400 });
      }
      let count = 0;
      for (const sop of db.sops) {
        if (ids.includes(sop.id)) {
          sop.tags = sop.tags.filter((t) => !removeTags.includes(t));
          count++;
        }
      }
      logAudit(user.id, user.username, 'BULK_UNTAG_SOP', `SOP IDs: ${ids.join(',')}`, `ลบแท็ก ${removeTags.join(',')} จาก ${count} รายการ`);
      saveDB(db);
      return NextResponse.json({ success: true, count, message: `ลบแท็กจาก ${count} รายการแล้ว` });
    }

    case 'EXPORT_JSON': {
      const selectedSOPs = db.sops.filter((s) => ids.includes(s.id));
      const exportData = selectedSOPs.map((s) => ({
        title: s.title,
        content: s.content,
        tags: s.tags,
        category_id: s.category_id,
        version: s.version,
        status: s.status,
        review_cycle_months: s.review_cycle_months,
        created_at: s.created_at,
        updated_at: s.updated_at,
      }));
      logAudit(user.id, user.username, 'BULK_EXPORT_SOP', `SOP IDs: ${ids.join(',')}`, `Export SOP จำนวน ${exportData.length} รายการ`);
      return NextResponse.json({
        success: true,
        count: exportData.length,
        export_data: exportData,
        filename: `sops-export-${new Date().toISOString().slice(0, 10)}.json`,
      });
    }

    default:
      return NextResponse.json({ error: 'ไม่รู้จักคำสั่งนี้' }, { status: 400 });
  }
}
