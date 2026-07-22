import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { performHybridSearch } from '@/lib/search';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const user = await getCurrentUser();
  const roleId = user ? user.role_id : 3;

  const results = performHybridSearch(q, roleId).slice(0, 6);

  return NextResponse.json({
    items: results.map((r) => ({
      id: r.sop.id,
      title: r.sop.title,
      category_id: r.sop.category_id,
      tags: r.sop.tags,
      matchType: r.matchType,
      snippet: r.snippet,
    })),
  });
}
