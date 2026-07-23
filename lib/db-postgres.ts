/**
 * PostgreSQL/Neon adapter for persistent data storage on Vercel
 * Uses pg Pool with direct DATABASE_URL connection (not @vercel/postgres)
 * Falls back to JSON file on local development
 *
 * IMPORTANT: Pool is initialized EAGERLY at module load time when DATABASE_URL is available.
 * This ensures the Neon cold-start connection is established BEFORE the first saveDB() call,
 * preventing silent sync failures on the first write.
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

// ===== EAGER POOL INITIALIZATION =====
// Create pool at module load time so Neon cold-start is handled BEFORE any saveDB() call.
// If getDBUrl() returns null (no DATABASE_URL), pool stays null and PG features are disabled.
let pool: Pool | null = null;

function initPool(): void {
  const url = getDBUrl();
  if (!url) return;
  if (pool) return; // Already initialized

  pool = new Pool({
    connectionString: url,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    allowExitOnIdle: true,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Pool error:', err.message);
  });

  // Eager connect to handle Neon cold-start BEFORE first query
  // This prevents the first saveDB() call from timing out
  pool.connect().then(client => {
    client.release();
    console.log('[PostgreSQL] Pool connected successfully (eager init)');
    // Eagerly create the db_snapshots table so first saveDBToPostgres() doesn't fail
    pool!.query(`CREATE TABLE IF NOT EXISTS db_snapshots (
      id SERIAL PRIMARY KEY,
      snapshot_data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`).then(() => {
      console.log('[PostgreSQL] Table db_snapshots ready (eager init)');
    }).catch(err => {
      console.error('[PostgreSQL] Eager table init failed:', err.message);
    });
  }).catch(err => {
    console.error('[PostgreSQL] Eager connect failed (will retry on first query):', err.message);
  });
}

function getPool(): Pool {
  if (pool) return pool;
  // Retry init in case DB URL was set after module load
  initPool();
  if (!pool) throw new Error('No database URL configured');
  return pool;
}

// ===== EAGER INIT ON MODULE LOAD =====
// This ensures the connection is warming up before any API request arrives
initPool();

/**
 * Execute a SQL query with parameterized values
 */
async function query(text: string, params?: any[]): Promise<any[]> {
  const p = getPool();
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
      maxBuffer: 50 * 1024 * 1024,
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
