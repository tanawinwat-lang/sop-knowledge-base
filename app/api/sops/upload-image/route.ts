import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role_name === 'AGENT') {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์อัปโหลดรูปภาพ (เฉพาะ Admin & Supervisor)' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const alignment = (formData.get('alignment') as string) || 'center';

    if (!file) {
      return NextResponse.json({ error: 'กรุณาเลือกไฟล์รูปภาพ' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, GIF, WebP, SVG' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'ไฟล์รูปภาพต้องมีขนาดไม่เกิน 10MB' }, { status: 400 });
    }

    // Convert file to base64 data URL (works on Vercel readonly filesystem)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const alt = file.name.replace(/\.[^/.]+$/, '');

    return NextResponse.json({
      url: dataUrl,
      filename: file.name,
      alignment,
      markdown: `![${alt}](${dataUrl}){:align="${alignment}"}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
