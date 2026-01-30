import { pool } from '../config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration(filename) {
  try {
    console.log(`Running migration: ${filename}`);
    
    const migrationPath = join(__dirname, 'migrations', filename);
    const sql = readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

const filename = process.argv[2];
if (!filename) {
  console.error('Usage: node run-migration.js <filename>');
  process.exit(1);
}

runMigration(filename);
