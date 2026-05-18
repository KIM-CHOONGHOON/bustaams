const db = require('./db');
console.log('db type:', typeof db);
console.log('db keys:', Object.keys(db));
console.log('db.pool is defined:', db.pool !== undefined);
if (db.pool) {
    console.log('db.pool type:', typeof db.pool);
    console.log('db.pool constructor name:', db.pool.constructor.name);
}
console.log('db constructor name:', db.constructor.name);
process.exit(0);
