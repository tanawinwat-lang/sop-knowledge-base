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
      admin_exists: !!admin,
      admin_hash_matches_seed: admin ? admin.password_hash === SEED_HASH : false,
      admin_login_works: admin ? bcrypt.compareSync('password123', admin.password_hash) : false,
      all_users: db.users.map(u => ({ id: u.id, email: u.email, role_id: u.role_id })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
