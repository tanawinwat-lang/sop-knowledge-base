/**
 * PostgreSQL/Neon adapter for persistent data storage on Vercel
 * Uses pg Pool with direct DATABASE_URL connection (not @vercel/postgres)
 * Falls back to JSON file on local development
 */

import { Pool } from 'pg';
import { DBData } from './db';

const IS_VERCEL = process.env.VERCEL === '1';
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Create a singleton pool with serverless-friendly settings
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool && DB_URL) {
    pool = new Pool({
      connectionString: DB_URL,
      max: 1,                // 1 connection per serverless instance
      idleTimeoutMillis: 5000, // close idle connections after 5s
      connectionTimeoutMillis: 10000, // timeout after 10s
    });
    pool.on('error', (err) => {
      console.error('[PostgreSQL] Pool error:', err.message);
    });
  }
  return pool!;
}

/**
 * Execute a SQL query with parameterized values
 */
async function query(text: string, params?: any[]): Promise<any[]> {
  const p = getPool();
  if (!p) throw new Error('No database URL configured');
  const result = await p.query(text, params);
  return result.rows;
}

/**
 * Initialize PostgreSQL tables if they don't exist
 */
export async function initializePostgresDB(): Promise<void> {
  if (!DB_URL) {
    console.log('[PostgreSQL] Skipped: DATABASE_URL not configured');
    return;
  }

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS db_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_db_updated ON db_snapshots(updated_at DESC);
    `);
    console.log('[PostgreSQL] Tables initialized');
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
    const rows = await query(
      'SELECT snapshot_data FROM db_snapshots ORDER BY updated_at DESC LIMIT 1'
    );
    
    if (rows.length > 0) {
      console.log('[PostgreSQL] Data loaded from database');
      return rows[0].snapshot_data as DBData;
    }
    console.log('[PostgreSQL] No data found in database');
  } catch (err) {
    console.error('[PostgreSQL] Load failed:', err);
  }
  return null;
}

/**
 * Save database to PostgreSQL (upsert single row with id=1)
 */
export async function saveDBToPostgres(data: DBData): Promise<boolean> {
  if (!DB_URL) return false;

  try {
    await query(
      `INSERT INTO db_snapshots (id, snapshot_data, created_at, updated_at) 
       VALUES (1, $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET 
         snapshot_data = $1,
         updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(data)]
    );
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
    await query('SELECT NOW()');
    console.log('[PostgreSQL] Connection successful');
    return true;
  } catch (err) {
    console.error('[PostgreSQL] Connection failed:', err);
    return false;
  }
}
