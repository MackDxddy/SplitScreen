import { pool } from '../config/database.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Run database migrations
 * Executes all SQL files in the migrations directory
 */
async function runMigrations() {
  console.log('🔄 Starting database migrations...\n')
  
  const migrationsDir = path.join(__dirname, 'migrations')
  
  try {
    // Get all migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort() // Execute in order (001, 002, etc.)
    
    if (files.length === 0) {
      console.log('⚠️  No migration files found')
      return
    }
    
    console.log(`Found ${files.length} migration file(s):\n`)
    
    // Execute each migration file
    for (const file of files) {
      const filePath = path.join(migrationsDir, file)
      console.log(`📄 Running migration: ${file}`)
      
      const sql = fs.readFileSync(filePath, 'utf8')
      
      try {
        await pool.query(sql)
        console.log(`✅ ${file} completed successfully\n`)
      } catch (error) {
        console.error(`❌ Error in ${file}:`)
        console.error(error.message)
        console.error('\nMigration stopped. Please fix the error and try again.\n')
        process.exit(1)
      }
    }
    
    console.log('✅ All migrations completed successfully!')
    console.log('\n📊 Database structure:')
    
    // Show table count
    const result = await pool.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    console.log(`   Total tables: ${result.rows[0].table_count}`)
    
    // Show video games and roles
    const videoGames = await pool.query('SELECT * FROM video_games')
    console.log(`\n🎮 Video Games:`)
    videoGames.rows.forEach(game => {
      console.log(`   - ${game.name} (${game.short_code})`)
    })
    
    const roles = await pool.query(`
      SELECT r.name, vg.name as game
      FROM roles r
      JOIN video_games vg ON r.video_game_id = vg.id
      ORDER BY r.display_order
    `)
    console.log(`\n🎭 Roles:`)
    roles.rows.forEach(role => {
      console.log(`   - ${role.name} (${role.game})`)
    })
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run migrations
runMigrations()
