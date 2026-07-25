import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDB, saveDBWait } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET: Check if an export key is configured (returns boolean, never the key itself)
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role_name !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDB();
    const hasEnvKey = !!process.env.DB_EXPORT_KEY;
    const hasConfigKey = !!db.db_config?.export_key;

    return NextResponse.json({
      hasExportKey: hasEnvKey || hasConfigKey,
      source: hasEnvKey ? 'environment' : hasConfigKey ? 'config' : 'none',
      // We NEVER return the actual key value for security
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH: Set or update the DB export key (stored in db_config.export_key)
 * Body: { key: string }
 */
export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role_name !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { key } = await req.json();

    if (!key || typeof key !== 'string' || key.length < 16) {
      return NextResponse.json(
        { error: 'คีย์ต้องมีความยาวอย่างน้อย 16 ตัวอักษร' },
        { status: 400 }
      );
    }

    const db = getDB();
    if (!db.db_config) db.db_config = {};
    db.db_config.export_key = key;
    await saveDBWait(db);

    return NextResponse.json({
      success: true,
      message: '✅ ตั้งค่า DB Export Key เรียบร้อย — คีย์นี้ใช้สำหรับ GitHub Actions Auto-Sync',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Remove the stored export key (does NOT touch env var)
 */
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role_name !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDB();
    if (db.db_config?.export_key) {
      delete db.db_config.export_key;
      await saveDBWait(db);
    }

    return NextResponse.json({
      success: true,
      message: '✅ ลบ DB Export Key ที่ตั้งค่าผ่านระบบเรียบร้อย',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
