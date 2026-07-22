import { NextResponse } from 'next/server';
import { generateDraftOutline, polishContent } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { action, topic, text } = await req.json();

    if (action === 'DRAFT') {
      const draft = generateDraftOutline(topic || 'คู่มือการทำงานใหม่');
      return NextResponse.json({ result: draft });
    }

    if (action === 'POLISH') {
      const polished = polishContent(text || '');
      return NextResponse.json({ result: polished });
    }

    return NextResponse.json({ error: 'แอ็กชันไม่ถูกต้อง' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
