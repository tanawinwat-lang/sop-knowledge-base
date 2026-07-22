import { SOP, generateSimpleEmbedding } from './db';
import { filterSOPsForRole } from './rbac';

export interface SearchResult {
  sop: SOP;
  score: number;
  matchType: 'KEYWORD' | 'SEMANTIC' | 'HYBRID';
  snippet: string;
}

function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Thai & English Semantic dictionary mapping for intelligent matching
const semanticDictionary: Record<string, string[]> = {
  'หยุดงาน': ['ลาป่วย', 'ใบลา', 'ลาพักร้อน', 'ป่วย', 'ไม่สบาย', 'หยุด'],
  'ไม่สบาย': ['ลาป่วย', 'ใบลาป่วย', 'ใบรับรองแพทย์', 'รักษา'],
  'ขอเงินคืน': ['คืนเงิน', 'เปลี่ยนสินค้า', 'RMA', 'โอนเงิน', 'ชดเชย'],
  'เปลี่ยนของ': ['เปลี่ยนสินค้า', 'คืนเงิน', 'สภาพสมบูรณ์'],
  'งบประมาณ': ['จ่ายเงิน', 'การเงิน', 'อนุมัติงบ', 'ลับ'],
  'ทำงานที่บ้าน': ['WFH', 'นโยบาย', 'Check-in', 'VPN'],
};

export function performHybridSearch(query: string, userRoleId: number): SearchResult[] {
  const sops = filterSOPsForRole(userRoleId).filter((s) => s.status === 'PUBLISHED');
  if (!query || !query.trim()) {
    return sops.map((sop) => ({
      sop,
      score: 1.0,
      matchType: 'KEYWORD',
      snippet: sop.content.substring(0, 150) + '...',
    }));
  }

  const queryLower = query.toLowerCase().trim();
  const queryVec = generateSimpleEmbedding(query);

  // Expand semantic query words
  const expandedTerms = [queryLower];
  for (const [key, synonyms] of Object.entries(semanticDictionary)) {
    if (queryLower.includes(key)) {
      expandedTerms.push(...synonyms);
    }
  }

  const results: SearchResult[] = [];

  for (const sop of sops) {
    const titleLower = sop.title.toLowerCase();
    const contentLower = sop.content.toLowerCase();
    const tagsLower = sop.tags.map((t) => t.toLowerCase()).join(' ');

    let keywordScore = 0;
    // Direct match check
    if (titleLower.includes(queryLower)) keywordScore += 3.0;
    if (tagsLower.includes(queryLower)) keywordScore += 2.0;
    if (contentLower.includes(queryLower)) keywordScore += 1.5;

    // Synonyms match check
    for (const term of expandedTerms) {
      if (titleLower.includes(term)) keywordScore += 1.5;
      if (contentLower.includes(term)) keywordScore += 1.0;
    }

    // Semantic Vector similarity
    const sopEmbedding = sop.embedding || generateSimpleEmbedding(sop.content);
    const vectorSim = calculateCosineSimilarity(queryVec, sopEmbedding);

    // Hybrid score combined
    const finalScore = keywordScore * 0.6 + vectorSim * 0.4 + (expandedTerms.length > 1 ? 0.5 : 0);

    let matchType: 'KEYWORD' | 'SEMANTIC' | 'HYBRID' = 'HYBRID';
    if (keywordScore > 2.0 && vectorSim < 0.3) matchType = 'KEYWORD';
    else if (keywordScore === 0 && (vectorSim > 0.4 || expandedTerms.length > 1)) matchType = 'SEMANTIC';

    if (finalScore > 0.2 || keywordScore > 0) {
      // Find snippet around match
      let snippetIndex = contentLower.indexOf(queryLower);
      if (snippetIndex === -1) {
        for (const term of expandedTerms) {
          snippetIndex = contentLower.indexOf(term);
          if (snippetIndex !== -1) break;
        }
      }
      const start = Math.max(0, snippetIndex - 40);
      const end = Math.min(sop.content.length, snippetIndex + 120);
      const snippet = (start > 0 ? '...' : '') + sop.content.substring(start, end).replace(/[\r\n]+/g, ' ') + '...';

      results.push({
        sop,
        score: finalScore,
        matchType,
        snippet: snippetIndex !== -1 ? snippet : sop.content.substring(0, 150) + '...',
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
