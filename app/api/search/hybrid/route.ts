import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { performHybridSearch } from '@/lib/search';
import { generateAIQuickSummary, analyzeSOPMatch } from '@/lib/ai';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const user = await getCurrentUser();
  const roleId = user ? user.role_id : 3;

  const results = performHybridSearch(q, roleId);
  const topSOPs = results.slice(0, 3).map((r) => r.sop);

  // Generate AI analysis: which SOP to use and why
  const analysis = analyzeSOPMatch(q, results);

  // Generate quick summary (bullet points from best SOP content)
  const summary = await generateAIQuickSummary(q, topSOPs);

  return NextResponse.json({
    query: q,
    results,
    summary,
    analysis, // NEW: structured analysis with recommendation
    totalMatches: results.length,
  });
}
