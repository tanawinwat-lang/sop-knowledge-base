/**
 * Request-scoped persistence coordinator
 * Ensures data changes are persisted before request ends
 */

import { saveDBToPostgres } from './db-postgres';
import { DBData } from './db';

interface RequestContext {
  pendingWrites: DBData | null;
  flushed: boolean;
}

// Use globalThis to store request context (works on Vercel serverless)
const contextKey = Symbol('dbContext');

function getContext(): RequestContext {
  const ctx = (globalThis as any)[contextKey] as RequestContext | undefined;
  if (!ctx) {
    const newCtx: RequestContext = {
      pendingWrites: null,
      flushed: false,
    };
    (globalThis as any)[contextKey] = newCtx;
    return newCtx;
  }
  return ctx;
}

export function setPendingWrite(data: DBData): void {
  const ctx = getContext();
  ctx.pendingWrites = data;
  ctx.flushed = false;
}

export async function flushPendingWrites(): Promise<void> {
  const ctx = getContext();
  if (!ctx.pendingWrites || ctx.flushed) return;

  try {
    const saved = await saveDBToPostgres(ctx.pendingWrites);
    if (saved) {
      ctx.flushed = true;
      console.log('[DB] Persisted pending writes to PostgreSQL');
    }
  } catch (err) {
    console.error('[DB] Failed to flush pending writes:', err);
  }
}

/**
 * Middleware wrapper for API routes
 * Call this in any POST/PUT/DELETE handler after saveDB()
 */
export async function ensurePersisted(): Promise<void> {
  await flushPendingWrites();
}
