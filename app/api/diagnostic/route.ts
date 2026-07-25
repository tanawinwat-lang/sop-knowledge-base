// TODO: REMOVE AFTER DEBUGGING — temporary diagnostic endpoint
import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const SEED_HASH = '$2b$10$oh/ORjSGuToBGg6dmpeP7Oda0cqXKw0WjOEfx4AGWqFSq4eTUMPdO';

export async function GET() {
  try {
    const db = getDB();
    const admin = db.users.find(u => u.email === 'admin@company.com');
    
    return NextResponse.json({
      ok: true,
      users_count: db.users.length,
      sops_count: db.sops.length,
      is_seed_data: db.users.length === 3 && !db.users.find(u => u.email !== 'admin@company.com' && u.email !== 'sup@company.com' && u.email !== 'agent@company.com'),
      admin_exists: !!admin,
      admin_hash_matches_seed: admin ? admin.password_hash === SEED_HASH : false,
      admin_login_works: admin ? bcrypt.compareSync('password123', admin.password_hash) : false,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
