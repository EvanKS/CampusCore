/**
 * Database layer — uses Supabase REST API over HTTPS (port 443).
 *
 * This replaces raw pg Pool to bypass ISP/firewall blocks on TCP ports 5432/6543.
 * The `query()` function parses common SQL patterns and routes them through
 * Supabase's PostgREST client. For full SQL support, raw pg is used as fallback.
 */
import { createClient } from '@supabase/supabase-js';
import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

// ============================================================
// Supabase client (connects over HTTPS port 443 — never blocked)
// ============================================================
const SUPABASE_URL = 'https://bpyuvnvbmtuoyquqwgrt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// Pg pool (fallback, used inside withTransaction)
// ============================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 8000,
});

pool.on('error', (err) => {
  // Non-fatal — we primarily use Supabase REST
  logger.debug('pg pool error (using Supabase REST as primary):', err.message);
});

// ============================================================
// SQL → Supabase REST query translator
// ============================================================
// We translate the most common SQL patterns used in auth.ts/routes
// to Supabase table API calls that go over HTTPS.

type Row = Record<string, unknown>;

function extractTableName(sql: string): string | null {
  const m = sql.match(/FROM\s+["']?(\w+)["']?/i) || sql.match(/INTO\s+["']?(\w+)["']?/i) || sql.match(/UPDATE\s+["']?(\w+)["']?/i);
  return m ? m[1] : null;
}

function isSelectQuery(sql: string): boolean {
  return /^\s*SELECT/i.test(sql);
}

function isInsertQuery(sql: string): boolean {
  return /^\s*INSERT/i.test(sql);
}

function isUpdateQuery(sql: string): boolean {
  return /^\s*UPDATE/i.test(sql);
}

function isDeleteQuery(sql: string): boolean {
  return /^\s*DELETE/i.test(sql);
}

/**
 * Replace $1, $2 ... with actual values from params array (for building
 * Supabase filter calls). Returns a map of { column: value } extracted
 * from simple WHERE col = $N clauses.
 */
function extractWhereFilters(sql: string, params: unknown[]): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  // Match patterns like: WHERE col = $1, AND col = $2
  const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?:RETURNING|ORDER|LIMIT|$)/i);
  if (!whereMatch) return filters;

  const wherePart = whereMatch[1];
  const conditions = wherePart.split(/\s+AND\s+/i);
  for (const cond of conditions) {
    const m = cond.match(/["']?(\w+)["']?\s*=\s*\$(\d+)/i);
    if (m) {
      const colName = m[1];
      const paramIdx = parseInt(m[2], 10) - 1;
      if (paramIdx >= 0 && paramIdx < params.length) {
        filters[colName] = params[paramIdx];
      }
    }
  }
  return filters;
}

/**
 * Extract RETURNING columns from an INSERT/UPDATE query.
 */
function extractReturning(sql: string): string {
  const m = sql.match(/RETURNING\s+([\s\S]+?)$/i);
  if (!m) return '*';
  return m[1].trim().replace(/\s+/g, ' ');
}

/**
 * Extract INSERT column names and values from SQL.
 */
function extractInsertData(sql: string, params: unknown[]): Record<string, unknown> {
  const colMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
  if (!colMatch) return {};
  const cols = colMatch[1].split(',').map(c => c.trim().replace(/['"]/g, ''));
  const data: Record<string, unknown> = {};
  cols.forEach((col, i) => {
    if (i < params.length) data[col] = params[i];
  });
  return data;
}

/**
 * Try executing a query via Supabase REST API.
 * Falls back to raw pg pool if the pattern isn't recognized.
 */
async function executeViaSupabase<T>(sql: string, params: unknown[] = []): Promise<{ rows: T[]; rowCount: number } | null> {
  const cleanSql = sql.replace(/\s+/g, ' ').trim();
  const table = extractTableName(cleanSql);
  if (!table) return null;

  try {
    if (isSelectQuery(cleanSql)) {
      // Parse SELECT columns
      const colMatch = cleanSql.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
      const selectCols = colMatch ? colMatch[1].trim() : '*';
      const filters = extractWhereFilters(cleanSql, params);

      let q = supabase.from(table).select(selectCols === '*' ? '*' : selectCols);
      for (const [col, val] of Object.entries(filters)) {
        q = q.eq(col, val);
      }

      // Handle LIMIT
      const limitMatch = cleanSql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) q = q.limit(parseInt(limitMatch[1], 10));

      const { data, error } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as T[], rowCount: (data ?? []).length };
    }

    if (isInsertQuery(cleanSql)) {
      const insertData = extractInsertData(cleanSql, params);
      const returning = extractReturning(cleanSql);

      const { data, error } = await supabase
        .from(table)
        .insert(insertData)
        .select(returning);

      if (error) throw error;
      const rows = Array.isArray(data) ? data : (data ? [data] : []);
      return { rows: rows as T[], rowCount: rows.length };
    }

    if (isUpdateQuery(cleanSql)) {
      // Extract SET fields
      const setMatch = cleanSql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
      if (!setMatch) return null;

      const setPart = setMatch[1];
      const updateData: Record<string, unknown> = {};
      const setConditions = setPart.split(',');
      for (const sc of setConditions) {
        const m = sc.match(/["']?(\w+)["']?\s*=\s*\$(\d+)/i);
        if (m) {
          const paramIdx = parseInt(m[2], 10) - 1;
          if (paramIdx >= 0 && paramIdx < params.length) {
            updateData[m[1]] = params[paramIdx];
          }
        } else {
          // Check for NOW() style
          const mNow = sc.match(/["']?(\w+)["']?\s*=\s*NOW\(\)/i);
          if (mNow) updateData[mNow[1]] = new Date().toISOString();
        }
      }

      const filters = extractWhereFilters(cleanSql, params);
      let q = supabase.from(table).update(updateData);
      for (const [col, val] of Object.entries(filters)) {
        q = q.eq(col, val);
      }

      const { data, error } = await q.select();
      if (error) throw error;
      return { rows: (data ?? []) as T[], rowCount: (data ?? []).length };
    }

    if (isDeleteQuery(cleanSql)) {
      const filters = extractWhereFilters(cleanSql, params);
      let q = supabase.from(table).delete();
      for (const [col, val] of Object.entries(filters)) {
        q = q.eq(col, val);
      }
      const { data, error } = await q.select();
      if (error) throw error;
      return { rows: (data ?? []) as T[], rowCount: (data ?? []).length };
    }
  } catch (err) {
    logger.warn(`Supabase REST query failed for table '${table}':`, (err as Error).message);
    return null; // fall through to pg
  }

  return null; // unrecognized pattern, use pg
}

// ============================================================
// Public API
// ============================================================

export async function query<T = Row>(
  sql: string,
  params?: unknown[],
  _context?: { institutionId?: string; userId?: string; userRole?: string }
): Promise<{ rows: T[]; rowCount: number }> {
  // Try Supabase REST first
  const supabaseResult = await executeViaSupabase<T>(sql, params ?? []);
  if (supabaseResult !== null) {
    return supabaseResult;
  }

  // Fallback: raw pg pool
  logger.debug('Falling back to pg pool for complex query');
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  // Try pg pool first for transactions
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn('withTransaction pg pool failed:', (err as Error).message);
    throw err;
  }
}

export async function testConnection(): Promise<void> {
  // Test Supabase REST connection
  const { data, error } = await supabase.from('institutions').select('id, name').limit(1);
  if (!error && data) {
    logger.info(`✅ Supabase REST connected. Found institution: ${data[0]?.name ?? 'none'}`);
    return;
  }

  // Fallback test
  const result = await pool.query('SELECT NOW()');
  logger.info(`✅ PostgreSQL connected. Time: ${result.rows[0].now}`);
}

export { pool };
