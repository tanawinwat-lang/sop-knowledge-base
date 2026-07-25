import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sop-knowledge-base-super-secret-key-2026';

// Role 1 = ADMIN, Role 2 = SUPERVISOR, Role 3 = AGENT
// Middleware only enforces AUTHENTICATION at network level.
// Actual page-level access control is handled by:
//   - Sidebar: reads page_permissions from DB for menu visibility
//   - API routes: check role_name for data operations
// This allows the RBAC page (จัดการสิทธิ์การใช้งานระบบ) to dynamically control access.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static files, auth endpoints, public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname === '/403' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Only verify the token is valid; don't check route permissions here.
  // Page-level access is controlled via DB page_permissions (Sidebar) and API role checks.
  try {
    const payload = jwt.decode(token) as { role_id: number } | null;
    if (!payload || !payload.role_id) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
