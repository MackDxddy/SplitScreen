import { pool } from './src/config/database.js';

const result = await pool.query(`
  SELECT id, external_id, tab, week 
  FROM matches 
  WHERE id >= 25 
  ORDER BY id DESC 
  LIMIT 10
`);

console.log('\n📊 Recent Matches with Week Data:\n');
result.rows.forEach(row => {
  console.log(`Match ${row.id}: ${row.external_id}`);
  console.log(`  Tab: ${row.tab || 'NULL'}`);
  console.log(`  Week: ${row.week || 'NULL'}\n`);
});

await pool.end();
