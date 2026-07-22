import { SOP } from './db';
import { SearchResult } from './search';

// AI Analysis: Analyze user question vs matched SOPs
// Only recommends when there is a real match from content/tags.
// If no match found, simply says 'not found' — never fabricates.
export function analyzeSOPMatch(query: string, results: SearchResult[]): {
  recommendation: string;
  topMatch: { title: string; reason: string; howToUse: string } | null;
  allMatches: { title: string; relevanceScore: number; reason: string }[];
} {
  if (!results || results.length === 0) {
    return {
      recommendation: `🔍 **ไม่พบข้อมูล** ไม่มีเอกสาร SOP ที่เกี่ยวข้องกับ "${query}" ในระบบ`,
      topMatch: null,
      allMatches: [],
    };
  }

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 1);

  // Analyze all search results
  const allMatches = results.slice(0, 5).map((r) => {
    const sop = r.sop;
    const titleLower = sop.title.toLowerCase();
    const contentLower = sop.content.toLowerCase();
    const tagsLower = sop.tags.map((t) => t.toLowerCase());

    // Calculate keyword matches
    let matchedKeywords = 0;
    let matchedTags = 0;
    const matchedWords: string[] = [];

    for (const word of queryWords) {
      if (titleLower.includes(word)) {
        matchedKeywords++;
        if (!matchedWords.includes(word)) matchedWords.push(word);
      }
      if (tagsLower.some((t) => t.includes(word))) {
        matchedTags++;
        if (!matchedWords.includes(word)) matchedWords.push(word);
      }
      if (contentLower.includes(word)) {
        if (!matchedWords.includes(word)) matchedWords.push(word);
      }
    }

    // Build a human-readable reason (only from actual data)
    const reasonParts: string[] = [];
    if (matchedKeywords > 0) {
      reasonParts.push(`ชื่อเอกสารถูกค้น ${matchedKeywords} คำ`);
    }
    if (matchedTags > 0) {
      reasonParts.push(`ป้ายกำกับ (Tags) ตรงกับปัญหา`);
    }
    if (r.score > 2.0) {
      reasonParts.push(`คะแนนความเกี่ยวข้องสูง (${r.score.toFixed(1)})`);
    } else if (r.score > 1.0) {
      reasonParts.push(`เนื้อหาบางส่วนเกี่ยวข้องกับปัญหา`);
    }

    // Determine relevance score (0-10)
    const wordMatchRatio = matchedWords.length / Math.max(queryWords.length, 1);
    const relevanceScore = Math.min(10, Math.round(
      (wordMatchRatio * 5) + 
      (Math.min(r.score / 3, 1) * 3) + 
      (matchedTags > 0 ? 2 : 0)
    ));

    let reason = reasonParts.length > 0 
      ? reasonParts.join(' • ')
      : '';

    return {
      title: sop.title,
      relevanceScore,
      reason,
    };
  });

  // Sort by relevance score descending, only keep truly relevant matches
  allMatches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const relevantMatches = allMatches.filter((m) => m.relevanceScore >= 5);

  // Generate recommendation based on relevant matches only
  const top = relevantMatches[0];
  let recommendation = '';
  let howToUse = '';

  if (!top) {
    // No relevant match — simply say not found
    recommendation = `🔍 **ไม่พบข้อมูล** ไม่มีเอกสาร SOP ที่เกี่ยวข้องกับ "${query}" ในระบบ`;
  } else if (top.relevanceScore >= 7) {
    howToUse = `สามารถเปิดเอกสาร "${top.title}" และปฏิบัติตามขั้นตอนที่ระบุ`;
    const extraCount = relevantMatches.length - 1;
    recommendation = `✅ พบเอกสารที่ตรงกับปัญหาของคุณ: **"${top.title}"** (คะแนน ${top.relevanceScore}/10)\n\n**เหตุผล:** ${top.reason}\n\n**คำแนะนำ:** ${howToUse}` +
      (extraCount > 0 ? `\n\nนอกจากนี้ยังมีเอกสารที่เกี่ยวข้องอีก ${extraCount} เอกสาร` : '');
  } else {
    howToUse = `ลองเปิดเอกสาร "${top.title}" เพื่อตรวจสอบรายละเอียด`;
    recommendation = `📄 พบเอกสารที่อาจเกี่ยวข้อง: **"${top.title}"** (คะแนน ${top.relevanceScore}/10)\n\n**เหตุผล:** ${top.reason}\n\n**คำแนะนำ:** ${howToUse}`;
  }

  return {
    recommendation,
    topMatch: top ? {
      title: top.title,
      reason: top.reason,
      howToUse,
    } : null,
    allMatches,
  };
}

// AI Quick Summary Generator: Dynamically parses matched SOP content to generate accurate 1, 2, 3 bullet points
export async function generateAIQuickSummary(query: string, matchedSOPs: SOP[]): Promise<string> {
  if (!matchedSOPs || matchedSOPs.length === 0) {
    return `ไม่พบเอกสาร SOP ที่ตรงกับคำค้นหา "${query}" กรุณาลองปรับใช้คำค้นหาอื่น หรือสอบถามหัวหน้างาน`;
  }

  const topSOP = matchedSOPs[0];
  const title = topSOP.title;
  const rawContent = topSOP.content || '';

  // Clean markdown syntax for clean summary extraction
  const lines = rawContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const points: { title: string; detail: string }[] = [];

  // Strategy A: Extract numbered list items (e.g., 1. **Title**: Detail)
  for (const line of lines) {
    const matchNumbered = line.match(/^(\d+[\.\)]|\-|\*)\s*(\*\*(.*?)\*\*|\*(.*?)\*|([^:]+):)?\s*(.*)/);
    if (matchNumbered) {
      const stepHeader = matchNumbered[3] || matchNumbered[4] || matchNumbered[5] || '';
      const stepDetail = matchNumbered[6] || '';

      const cleanTitle = stepHeader.replace(/[\*\_\`]/g, '').trim();
      const cleanDetail = stepDetail.replace(/[\*\_\`>]/g, '').trim();

      if (cleanTitle || cleanDetail) {
        points.push({
          title: cleanTitle || `ขั้นตอนสำคัญ`,
          detail: cleanDetail || cleanTitle,
        });
      }
    }
  }

  // Strategy B: Extract Callout Warnings / Important notes if present
  const calloutMatches = rawContent.match(/>\s*\[!(WARNING|IMPORTANT|CAUTION)\]\s*(.*)/gi);
  if (calloutMatches && calloutMatches.length > 0) {
    const noteText = calloutMatches[0].replace(/>\s*\[!(WARNING|IMPORTANT|CAUTION)\]/gi, '').trim();
    if (noteText) {
      points.unshift({
        title: 'ข้อควรระวัง / จุดเน้นย้ำ',
        detail: noteText,
      });
    }
  }

  // Strategy C: Fallback to sentence/paragraph splitting if list formatting was not found
  if (points.length === 0) {
    const paragraphs = rawContent
      .replace(/[#\*\`>]/g, '')
      .split(/[\r\n]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 15);

    for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
      const p = paragraphs[i];
      const colonIdx = p.indexOf(':');
      if (colonIdx > 0 && colonIdx < 40) {
        points.push({
          title: p.substring(0, colonIdx).trim(),
          detail: p.substring(colonIdx + 1).trim(),
        });
      } else {
        points.push({
          title: `ข้อที่ ${i + 1}`,
          detail: p.length > 120 ? p.substring(0, 120) + '...' : p,
        });
      }
    }
  }

  // Select top 3 distinct points
  const selectedPoints = points.slice(0, 3);

  if (selectedPoints.length === 0) {
    // *** NEVER hallucinate — return honest "not found" instead of fake bullet points ***
    return `💡 **สรุปจากเอกสาร "${title}"** พบเอกสารที่เกี่ยวข้องแต่ไม่สามารถสรุปเนื้อหาแบบหัวข้อได้ กรุณาอ่านรายละเอียดเต็มจากเอกสารด้านล่าง`;
  }

  let summaryMarkdown = `💡 **สรุปคำตอบด่วนสำหรับ Agent (AI Quick Summary)** (อ้างอิงเอกสาร: ${title}):\n`;
  selectedPoints.forEach((pt, idx) => {
    summaryMarkdown += `${idx + 1}. **${pt.title}**: ${pt.detail}\n`;
  });

  return summaryMarkdown.trim();
}

// AI Copilot: Draft Outline
export function generateDraftOutline(topic: string): string {
  return `# ขั้นตอนการปฏิบัติงานมาตรฐาน: ${topic}

## 1. วัตถุประสงค์และขอบเขต (Purpose & Scope)
- เอกสารนี้จัดทำขึ้นเพื่อกำหนดมาตรฐานการทำงานสำหรับ ${topic}
- ครอบคลุมพนักงานและผู้เกี่ยวข้องทุกระดับ

## 2. ขั้นตอนการปฏิบัติงาน (Operating Procedures)
1. **เตรียมการและตรวจสอบข้อมูล**:
   - ตรวจสอบความถูกต้องของเอกสารและระบบก่อนเริ่มดำเนินการ
2. **ดำเนินการตามขั้นตอนหลัก**:
   - ปฏิบัติงานตามลำดับขั้นตอนมาตรฐาน
3. **การบันทึกและรายงานผล**:
   - บันทึกผลการดำเนินงานลงในระบบเพื่อการตรวจสอบ

> [!IMPORTANT]
> จุดเน้นย้ำ: โปรดตรวจสอบความถูกต้องของข้อมูลทุกครั้งก่อนกดยืนยัน

## 3. เอกสารอ้างอิงและผู้รับผิดชอบ
- ผู้รับผิดชอบหลัก: ทีมปฏิบัติงาน
- รอบการทบทวน: ทุก 6 เดือน`;
}

// AI Copilot: Polish Language
export function polishContent(text: string): string {
  if (!text || !text.trim()) return text;
  return text
    .replace(/กู|มึง|กิ๊ก|มั่ว/g, 'ผู้ใช้')
    .replace(/ส่งๆ ไป/g, 'จัดส่งตามขั้นตอนมาตรฐาน')
    .replace(/เดี่ยวค่อยดู/g, 'จะดำเนินการตรวจสอบในลำดับถัดไป')
    .replace(/แป๊บนะ/g, 'กรุณารอซักครู่ ระบบกำลังดำเนินการ')
    .trim();
}

// AI Auto-Tagging & Auto-Categorization
export function autoSuggestTagsAndCategory(content: string, title: string): { tags: string[]; categoryId: number } {
  const combined = (title + ' ' + content).toLowerCase();
  const tags: string[] = [];
  let categoryId = 1; // Default HR

  if (combined.includes('ป่วย') || combined.includes('ลา') || combined.includes('แพทย์') || combined.includes('สวัสดิการ')) {
    tags.push('HR', 'การยื่นใบลา', 'สวัสดิการ', 'พนักงาน');
    categoryId = 2; // HR subfolder
  } else if (combined.includes('คืนเงิน') || combined.includes('เปลี่ยน') || combined.includes('ลูกค้า') || combined.includes('rma')) {
    tags.push('Customer Service', 'คืนเงิน', 'เปลี่ยนสินค้า', 'RMA');
    categoryId = 4; // CS subfolder
  } else if (combined.includes('งบ') || combined.includes('อนุมัติ') || combined.includes('เงิน') || combined.includes('บัญชี')) {
    tags.push('Finance', 'การเงิน', 'อนุมัติงบ', 'ลับ');
    categoryId = 5; // Finance subfolder
  } else {
    tags.push('General', 'SOP Standard', 'ขั้นตอนการทำงาน');
    categoryId = 1;
  }

  return { tags, categoryId };
}
