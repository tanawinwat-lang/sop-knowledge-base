/**
 * PostgreSQL/Neon adapter for persistent data storage on Vercel
 * Falls back to JSON file on local development
 */

import { sql } from '@vercel/postgres';
import { DBData } from './db';

const IS_VERCEL = process.env.VERCEL === '1';
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let initialized = false;

/**
 * Initialize PostgreSQL tables if they don't exist
 */
export async function initializePostgresDB(): Promise<void> {
  if (!DB_URL) {
    console.log('[PostgreSQL] Skipped: DATABASE_URL not configured');
    return;
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS db_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_db_updated ON db_snapshots(updated_at DESC);
    `;
    console.log('[PostgreSQL] Tables initialized');
    initialized = true;
  } catch (err) {
    console.error('[PostgreSQL] Initialization failed:', err);
  }
}

/**
 * Load database from PostgreSQL
 */
export async function loadDBFromPostgres(): Promise<DBData | null> {
  if (!DB_URL) return null;

  try {
    const result = await sql<{ snapshot_data: DBData }>`
      SELECT snapshot_data FROM db_snapshots 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    
    if (result.rows.length > 0) {
      console.log('[PostgreSQL] Data loaded from database');
      return result.rows[0].snapshot_data;
    }
    console.log('[PostgreSQL] No data found in database');
  } catch (err) {
    console.error('[PostgreSQL] Load failed:', err);
  }
  return null;
}

/**
 * Save database to PostgreSQL
 */
export async function saveDBToPostgres(data: DBData): Promise<boolean> {
  if (!DB_URL) return false;

  try {
    await sql`
      INSERT INTO db_snapshots (id, snapshot_data, created_at, updated_at) 
      VALUES (1, ${JSON.stringify(data)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET 
        snapshot_data = ${JSON.stringify(data)},
        updated_at = CURRENT_TIMESTAMP
    `;
    return true;
  } catch (err) {
    console.error('[PostgreSQL] Save failed:', err);
    return false;
  }
}

/**
 * Check if PostgreSQL is available and connected
 */
export async function isPostgresAvailable(): Promise<boolean> {
  if (!DB_URL) return false;

  try {
    await sql`SELECT NOW()`;
    console.log('[PostgreSQL] Connection successful');
    return true;
  } catch (err) {
    console.error('[PostgreSQL] Connection failed:', err);
    return false;
  }
}
