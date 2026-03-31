const { query, init } = require('./src/db');
async function runTest() {
  try {
    await init();
    console.log('Tables:');
    const tables = await query('SHOW TABLES');
    console.log(tables);
    console.log('\nColumns in order_items:');
    const cols = await query('DESCRIBE order_items');
    console.log(cols);
    console.log('\nFirst 5 rows in order_items:');
    const rows = await query('SELECT * FROM order_items LIMIT 5');
    console.log(rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
runTest();
