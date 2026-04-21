const db = require('../db');
console.log('--- DB Module Export Test ---');
console.log('Primary Export (db):', typeof db);
console.log('Property Export (db.pool):', typeof db.pool);
console.log('Property Export (db.getNextId):', typeof db.getNextId);

const { pool, getNextId } = require('./db');
console.log('--- Destructured Test ---');
console.log('pool:', typeof pool);
console.log('getNextId:', typeof getNextId);

if (!pool) {
  console.error('❌ CRITICAL: Pool is undefined!');
  process.exit(1);
} else {
  console.log('✅ SUCCESS: Pool is defined correctly.');
  process.exit(0);
}
