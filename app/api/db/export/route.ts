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

    // Accept a DB_EXPORT_KEY if set as env var — used by GitHub Actions
    const expectedKey = process.env.DB_EXPORT_KEY;
    if (apiKey && expectedKey && apiKey === expectedKey) {
      // API key matched — skip user auth
      const db = getDB();
      return NextResponse.json({
        exported_at: new Date().toISOString(),
        exported_by: 'api-key',
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

  // Remove volatile db_config fields
  if (clone.db_config) {
    delete clone.db_config.last_sync_at;
    delete clone.db_config.pg_connected;
  }

  return clone;
}
