/**
 * Auto-persist middleware wrapper
 * Wraps NextResponse.json() to ensure pending writes are flushed
 */

import { flushPendingWrites } from './db-context';

// Store the original NextResponse.json
const originalJsonResponse = (globalThis as any).__nextResponseJson;

/**
 * Enhanced NextResponse.json that auto-flushes pending writes
 * Wraps the built-in NextResponse.json for API routes
 */
export async function autoPersistJson(data: any, init?: ResponseInit) {
  // Flush any pending database writes before sending response
  await flushPendingWrites();
  
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}
