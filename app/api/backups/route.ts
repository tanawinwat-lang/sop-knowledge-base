import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { canAccessPage } from '@/lib/rbac';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backup');

// GET /api/backups — list all backup files with metadata
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canAccessPage(user.role_id, '/settings/audit-logs')) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    return NextResponse.json({ backups: [], total_size: 0 });
  }

  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((filename) => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stat = fs.statSync(filePath);
        return {
          filename,
          size: stat.size,
          size_label: formatSize(stat.size),
          created_at: stat.mtime.toISOString(),
          created_at_label: stat.mtime.toLocaleString('th-TH'),
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    return NextResponse.json({
      backups: files,
      total: files.length,
      total_size: totalSize,
      total_size_label: formatSize(totalSize),
    });
  } catch {
    return NextResponse.json({ backups: [], total: 0, total_size: 0 });
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
