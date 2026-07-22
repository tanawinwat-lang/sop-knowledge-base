import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDB, saveDB } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || (user.role_name !== 'ADMIN' && user.role_name !== 'SUPERVISOR')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ลบหมวดหมู่ (เฉพาะ Admin และ Supervisor)' }, { status: 403 });
  }

  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: 'ID หมวดหมู่ไม่ถูกต้อง' }, { status: 400 });
  }

  const db = getDB();

  // Find the category
  const categoryIndex = db.categories.findIndex((c) => c.id === categoryId);
  if (categoryIndex === -1) {
    return NextResponse.json({ error: 'ไม่พบหมวดหมู่ที่ต้องการลบ' }, { status: 404 });
  }

  // Check if category has sub-categories
  const hasChildren = db.categories.some((c) => c.parent_id === categoryId);
  if (hasChildren) {
    return NextResponse.json(
      { error: 'ไม่สามารถลบหมวดหมู่ที่มีหมวดหมู่ย่อยอยู่ได้ กรุณาลบหมวดหมู่ย่อยก่อน' },
      { status: 400 }
    );
  }

  // Check if category has SOPs
  const hasSops = db.sops.some((s) => s.category_id === categoryId);
  if (hasSops) {
    return NextResponse.json(
      { error: 'ไม่สามารถลบหมวดหมู่ที่มีเอกสาร SOP อยู่ได้ กรุณาย้ายหรือลบเอกสารก่อน' },
      { status: 400 }
    );
  }

  const deletedCat = db.categories[categoryIndex];
  db.categories.splice(categoryIndex, 1);
  saveDB(db);

  return NextResponse.json({
    success: true,
    message: `ลบหมวดหมู่ "${deletedCat.name}" สำเร็จ`,
  });
}
