import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'png';
    const filename = `sop-image-${timestamp}-${random}.${ext}`;

    // Save to public/uploads/sops/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sops');
    const filepath = path.join(uploadDir, filename);

    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {}

    await writeFile(filepath, buffer);

    // Return the public URL
    const url = `/uploads/sops/${filename}`;

    return NextResponse.json({
      url,
      filename,
      alignment,
      markdown: `![${file.name.replace(/\.[^/.]+$/, '')}](${url}){:align="${alignment}"}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
