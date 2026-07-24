import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDB, User } from './db';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'sop-knowledge-base-super-secret-key-2026';

export interface UserSession {
  id: number;
  username: string;
  email: string;
  role_id: number;
  role_name: 'ADMIN' | 'SUPERVISOR' | 'AGENT';
}

export function signUserToken(user: UserSession): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyUserToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
  } catch {
    return null;
  }
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return verifyUserToken(token);
  } catch {
    return null;
  }
}
