import { NextResponse } from 'next/server';
import { autoSuggestTagsAndCategory } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { title, content } = await req.json();
    const suggestion = autoSuggestTagsAndCategory(content || '', title || '');
    return NextResponse.json(suggestion);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
