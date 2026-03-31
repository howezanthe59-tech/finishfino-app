const { query } = require('../backend/src/db');

async function checkTables() {
  try {
    const tables = await query('SHOW TABLES');
    console.log('Tables in database:', JSON.stringify(tables, null, 2));
    
    for (const tableObj of tables) {
      const tableName = Object.values(tableObj)[0];
      const columns = await query(`DESCRIBE ${tableName}`);
      console.log(`Columns in ${tableName}:`, JSON.stringify(columns, null, 2));
    }
  } catch (err) {
    console.error('Error checking tables:', err);
  } finally {
    process.exit();
  }
}

checkTables();
