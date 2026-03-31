const { query } = require('./backend/src/db');

async function checkOrdersTable() {
  try {
    console.log('--- Orders Table Structure ---');
    const columns = await query('DESCRIBE orders');
    console.table(columns);

    console.log('\n--- Orders Table Indices ---');
    const indices = await query('SHOW INDEX FROM orders');
    console.table(indices);

    console.log('\n--- Recent Orders (Last 5) ---');
    const rows = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5');
    console.table(rows);
  } catch (err) {
    console.error('Error checking orders table:', err);
  } finally {
    process.exit();
  }
}

checkOrdersTable();
