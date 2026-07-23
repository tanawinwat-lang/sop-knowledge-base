/**
 * API Response wrapper that ensures data persistence
 * Wraps all responses to flush pending writes before returning
 */

import { ensurePersisted } from './db-context';

export async function jsonResponse(data: any, init?: ResponseInit) {
  // Flush any pending database writes before sending response
  await ensurePersisted();
  
  const response = new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  return response;
}

export async function jsonError(error: string | { error: string }, status: number = 500) {
  // Flush any pending database writes before sending error response
  await ensurePersisted();
  
  const data = typeof error === 'string' ? { error } : error;
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
