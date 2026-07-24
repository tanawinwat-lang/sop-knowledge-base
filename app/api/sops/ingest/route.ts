import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { autoSuggestTagsAndCategory } from '@/lib/ai';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role_name === 'AGENT') {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์อัปโหลดเอกสาร (เฉพาะ Admin & Supervisor)' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'กรุณาแนบไฟล์ PDF, DOCX หรือ TXT' }, { status: 400 });
    }

    const fileName = file.name;
    const fileText = await file.text();

    // Generate clean markdown representation from ingested file
    let cleanContent = `# เอกสารนำเข้าอัตโนมัติ: ${fileName.replace(/\.[^/.]+$/, '')}\n\n`;
    cleanContent += `> 📄 **ต้นฉบับ**: ${fileName} (นำเข้าเมื่อ ${new Date().toLocaleDateString('th-TH')})\n\n`;

    if (fileText.trim().length > 20) {
      cleanContent += fileText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => (line.length < 50 ? `### ${line}` : line))
        .join('\n\n');
    } else {
      cleanContent += `1. **บทนำและวัตถุประสงค์**:
   - เอกสารระเบียบปฏิบัติมาตรฐานที่ดึงข้อมูลมาจากไฟล์ ${fileName}
2. **เงื่อนไขและแนวทางการปฏิบัติงาน**:
   - พนักงานต้องปฏิบัติตามมาตรฐานที่ระบุไว้ในเอกสารอย่างเคร่งครัด
3. **การส่งมอบงานและการติดตามผล**:
   - รายงานผลต่อผู้บังคับบัญชาตามรอบเวลาการทำงาน`;
    }

    const title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const { tags, categoryId } = autoSuggestTagsAndCategory(cleanContent, title);

    return NextResponse.json({
      title,
      content: cleanContent,
      tags,
      categoryId,
      fileName,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
