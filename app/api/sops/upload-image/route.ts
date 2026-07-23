import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDB, saveDB, getNextId } from '@/lib/db';

export async function POST(req: Request) {
  console.log('[Upload] POST /api/sops/upload-image');

  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ' }, { status: 401 });
  }
  if (user.role_name === 'AGENT') {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์อัปโหลดรูปภาพ (เฉพาะ Admin & Supervisor)' }, { status: 403 });
  }

  try {
    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (parseErr: any) {
      return NextResponse.json({
        error: 'ไม่สามารถอ่านข้อมูลรูปภาพได้ — Content-Type หรือขนาดไฟล์อาจไม่ถูกต้อง',
        detail: parseErr.message,
      }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const alignment = (formData.get('alignment') as string) || 'center';

    if (!file) {
      return NextResponse.json({ error: 'กรุณาเลือกไฟล์รูปภาพ' }, { status: 400 });
    }

    console.log(`[Upload] File: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(0)}KB`);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, GIF, WebP, SVG' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'ไฟล์รูปภาพต้องมีขนาดไม่เกิน 10MB' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;

    // Store image in database (keeps base64 out of SOP content)
    const db = getDB();
    const imgId = getNextId('sop_image');
    db.sop_images.push({
      id: imgId,
      filename: file.name,
      mime_type: mimeType,
      data_base64: base64,
      created_at: new Date().toISOString(),
    });
    saveDB(db);

    // Return short reference instead of full base64 data URL
    const shortRef = `@sopimg:${imgId}`;
    const imgRefUrl = `/api/sops/image/${imgId}`;
    const alt = file.name.replace(/\.[^/.]+$/, '');

    console.log(`[Upload] Stored as sop_images#${imgId} (${(base64.length / 1024).toFixed(0)}KB base64 in DB)`);

    return NextResponse.json({
      url: imgRefUrl,
      dataUrl: `data:${mimeType};base64,${base64}`, // Keep for immediate preview
      imgId: imgId,
      shortRef: shortRef,
      filename: file.name,
      alignment,
      markdown: `![${alt}](${shortRef}){:align="${alignment}"}`,
    });
  } catch (err: any) {
    console.error('[Upload] Error:', err);
    return NextResponse.json({
      error: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
      type: err.constructor?.name || 'Unknown',
    }, { status: 500 });
  }
}
