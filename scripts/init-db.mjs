import { initDbSchema } from '../src/lib/db.ts';

console.log('[DB Migration] Initializing PostgreSQL schema...');
try {
  await initDbSchema();
  console.log('[DB Migration] Schema initialized successfully:');
  console.log('  - Extended "user" table with credit_balance (CHECK >= 0)');
  console.log('  - Created "credit_transactions" table (immutable ledger)');
  console.log('  - Created indexes on user_id and reference_id');
  process.exit(0);
} catch (err) {
  console.error('[DB Migration Error]:', err.message);
  process.exit(1);
}

