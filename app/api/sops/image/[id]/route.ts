import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const imgId = parseInt(id, 10);

  if (isNaN(imgId)) {
    return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 });
  }

  const db = getDB();
  const image = db.sop_images.find((img) => img.id === imgId);

  if (!image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  // Decode base64 and return as binary response with proper Content-Type
  const buffer = Buffer.from(image.data_base64, 'base64');

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': image.mime_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': buffer.length.toString(),
    },
  });
}
