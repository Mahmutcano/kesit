import pg from 'pg';

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: pg.Pool | undefined;
}

// Singleton pg.Pool instance to avoid leaking connections across hot-reloads
export const pool =
  globalThis.__pgPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/kesit_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pool;
}

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle PostgreSQL client:', err);
});

/**
 * Execute a parameterized query with ACID-safe parameters
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development' && duration > 500) {
    console.warn(`[DB Slow Query] ${duration}ms: ${text}`);
  }
  return res;
}

/**
 * ACID Transaction helper wrapper
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Ensure database tables and extensions exist
 */
export async function initDbSchema(): Promise<void> {
  await query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- Core Better Auth tables will be managed by Better Auth,
    -- but we ensure the constraints and the credit_transactions table are initialized:
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
      image TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      credit_balance INTEGER NOT NULL DEFAULT 5 CONSTRAINT positive_credit_balance CHECK (credit_balance >= 0)
    );

    -- Ensure credit_balance column exists if user table was pre-existing
    ALTER TABLE "user" 
    ADD COLUMN IF NOT EXISTS credit_balance INTEGER NOT NULL DEFAULT 5;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'positive_credit_balance'
      ) THEN
        ALTER TABLE "user" ADD CONSTRAINT positive_credit_balance CHECK (credit_balance >= 0);
      END IF;
    END $$;

    -- Immutable Append-Only Ledger
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      type VARCHAR(32) NOT NULL CHECK (type IN ('SIGNUP_BONUS', 'PURCHASE', 'USAGE', 'REFUND')),
      reference_id VARCHAR(255) UNIQUE NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_id ON credit_transactions(reference_id);
  `);
}
