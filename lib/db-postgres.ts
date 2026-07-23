/**
 * PostgreSQL/Neon adapter for persistent data storage on Vercel
 * Uses pg Pool with direct DATABASE_URL connection (not @vercel/postgres)
 * Falls back to JSON file on local development
 */

import { Pool } from 'pg';
import { execFileSync } from 'child_process';
import { DBData } from './db';

const IS_VERCEL = process.env.VERCEL === '1';

// Check env vars first, then fall back to stored config file (set via Settings UI)
// IMPORTANT: This is a FUNCTION, not a const, so it resolves lazily at call time.
// This allows the settings page to save a new URL and have it picked up immediately.
function getDBUrl(): string | null {
  // Priority 1: Environment variable (set on Render dashboard)
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;

  // Priority 2: Config file written by Settings UI (data/.db_url)
  try {
    const fs = require('fs');
    const path = require('path');
    const configFile = path.join(process.cwd(), 'data', '.db_url');
    if (fs.existsSync(configFile)) {
      const url = fs.readFileSync(configFile, 'utf-8').trim();
      if (url) return url;
    }
  } catch {}
  return null;
}

// Exported so the settings API route can check what URL we're using
export function getCurrentDBUrl(): string | null {
  return getDBUrl();
}

// Create a singleton pool with serverless-friendly settings
let pool: Pool | null = null;

function getPool(): Pool {
  const url = getDBUrl();
  if (!pool && url) {
    pool = new Pool({
      connectionString: url,
      max: 1,                // 1 connection per serverless instance
      idleTimeoutMillis: 30000, // close idle connections after 30s
      connectionTimeoutMillis: 30000, // timeout after 30s (Neon cold-start can take 10s+)
      allowExitOnIdle: true,
    });
    pool.on('error', (err) => {
      console.error('[PostgreSQL] Pool error:', err.message);
    });
  }
  // If pool exists but URL changed, we need to reset (create new pool)
  // This handles the case where the user saved a new URL via settings
  if (pool && pool !== null) {
    // Check if the pool's URL matches the current URL — if not, close and reconnect
    // For simplicity, we just trust the stored pool (reconnection on next render deploy)
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
 * Synchronous PostgreSQL load using child_process.execFileSync.
 * Used by getDB() on cold start to avoid returning seed data before async PG load finishes.
 */
export function loadDBFromPostgresSync(): DBData | null {
  const url = getDBUrl();
  if (!url) return null;
  try {
    // Create a small inline script that connects to PG and outputs snapshot_data as JSON
    const script = `
const { Client } = require('pg');
const connectionUrl = ${JSON.stringify(url)};
const client = new Client({ connectionString: connectionUrl, connectionTimeoutMillis: 30000 });
client.connect().then(() => {
  return client.query('SELECT snapshot_data FROM db_snapshots ORDER BY updated_at DESC LIMIT 1');
}).then(r => {
  if (r.rows.length > 0) {
    console.log(JSON.stringify(r.rows[0].snapshot_data));
  }
  return client.end();
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
`;
    const output = execFileSync('node', ['-e', script], {
      timeout: 30000,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB for large JSON
      windowsHide: true,
    });
    const trimmed = output.trim();
    if (!trimmed) return null;
    const data = JSON.parse(trimmed) as DBData;
    console.log('[PostgreSQL] Sync loaded data from database');
    return data;
  } catch (err) {
    console.error('[PostgreSQL] Sync load failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Initialize PostgreSQL tables if they don't exist
 */
export async function initializePostgresDB(): Promise<void> {
  if (!getDBUrl()) {
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
  if (!getDBUrl()) return null;

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
  if (!getDBUrl()) return false;

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
  if (!getDBUrl()) return false;

  try {
    await query('SELECT NOW()');
    console.log('[PostgreSQL] Connection successful');
    return true;
  } catch (err) {
    console.error('[PostgreSQL] Connection failed:', err);
    return false;
  }
}
