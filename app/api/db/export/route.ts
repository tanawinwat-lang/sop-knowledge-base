import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Support both cookie-based auth (for browser access) and
    // API-key auth (for GitHub Actions without exposing admin password)
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('key');

    // Accept a DB_EXPORT_KEY from env var OR from db_config.export_key
    // (db_config.export_key can be set via Settings → ตั้งค่าฐานข้อมูล)
    const dbForAuth = getDB();
    const envKey = process.env.DB_EXPORT_KEY;
    const configKey = dbForAuth.db_config?.export_key;
    const expectedKey = envKey || configKey;

    if (apiKey && expectedKey && apiKey === expectedKey) {
      // API key matched — skip user auth
      return NextResponse.json({
        exported_at: new Date().toISOString(),
        exported_by: 'api-key',
        stats: {
          users: dbForAuth.users.length,
          sops: dbForAuth.sops.length,
          announcements: dbForAuth.announcements.length,
          announcement_reads: dbForAuth.announcement_reads.length,
          categories: dbForAuth.categories.length,
          page_permissions: dbForAuth.page_permissions.length,
        },
        data: sanitizeDB(dbForAuth),
      });
    }

    // Cookie-based auth: admin only
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role_name !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const db = getDB();

    return NextResponse.json({
      exported_at: new Date().toISOString(),
      exported_by: user.username,
      stats: {
        users: db.users.length,
        sops: db.sops.length,
        announcements: db.announcements.length,
        announcement_reads: db.announcement_reads.length,
        categories: db.categories.length,
        page_permissions: db.page_permissions.length,
      },
      data: sanitizeDB(db),
    });
  } catch (err: any) {
    console.error('[DB Export] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Strip volatile / ephemeral fields that would cause infinite git diffs
 * (e.g., last_sync_at, pg_connected, etc.)
 */
function sanitizeDB(db: any) {
  // Deep clone to avoid mutating the cached DB
  const clone = JSON.parse(JSON.stringify(db));

  // Remove ALL db_config fields (runtime metadata only, not operational data)
  // This also prevents leaking the Neon DB connection string to the public repo
  delete clone.db_config;

  return clone;
}
