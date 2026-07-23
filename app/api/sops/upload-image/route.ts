import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  // Log request info for debugging
  console.log('[Upload] POST /api/sops/upload-image');

  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    console.log('[Upload] Unauthorized: no user session');
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ' }, { status: 401 });
  }
  if (user.role_name === 'AGENT') {
    console.log('[Upload] Forbidden: agent role');
    return NextResponse.json({ error: 'ไม่มีสิทธิ์อัปโหลดรูปภาพ (เฉพาะ Admin & Supervisor)' }, { status: 403 });
  }

  try {
    // Parse multipart form data
    console.log('[Upload] Parsing form data...');
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (parseErr: any) {
      console.error('[Upload] FormData parse error:', parseErr);
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

    console.log(`[Upload] File received: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(0)}KB`);

    // Validate file type (exact MIME match, case-insensitive)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, GIF, WebP, SVG' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'ไฟล์รูปภาพต้องมีขนาดไม่เกิน 10MB' }, { status: 400 });
    }

    // Convert file to base64 data URL
    console.log('[Upload] Converting to base64...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const alt = file.name.replace(/\.[^/.]+$/, '');
    console.log(`[Upload] Success: ${(dataUrl.length / 1024).toFixed(0)}KB base64`);

    return NextResponse.json({
      url: dataUrl,
      filename: file.name,
      alignment,
      markdown: `![${alt}](${dataUrl}){:align="${alignment}"}`,
    });
  } catch (err: any) {
    console.error('[Upload] Error:', err);
    return NextResponse.json({
      error: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
      type: err.constructor?.name || 'Unknown',
    }, { status: 500 });
  }
}
