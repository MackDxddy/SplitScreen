import { pool } from '../config/database.js'
import bcrypt from 'bcrypt'

/**
 * Seed database with sample data for testing
 */
async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n')
  
  try {
    // Create test users
    console.log('👤 Creating test users...')
    const hashedPassword = await bcrypt.hash('password123', 10)
    
    const testUsers = await pool.query(`
      INSERT INTO users (email, password_hash, username, membership_tier, email_verified)
      VALUES 
        ('admin@splitscreen.gg', $1, 'Admin', 'pro', true),
        ('test@example.com', $1, 'TestUser', 'free', true),
        ('host@example.com', $1, 'LeagueHost', 'pro', true),
        ('player1@example.com', $1, 'Player1', 'free', true),
        ('player2@example.com', $1, 'Player2', 'free', true)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, username
    `, [hashedPassword])
    
    console.log(`   Created ${testUsers.rowCount} users`)
    
    // Get video game ID for League of Legends
    const lolGame = await pool.query(`
      SELECT id FROM video_games WHERE short_code = 'lol'
    `)
    const lolGameId = lolGame.rows[0].id
    
    // Get role IDs
    const roles = await pool.query(`
      SELECT id, name FROM roles WHERE video_game_id = $1
    `, [lolGameId])
    
    const roleMap = {}
    roles.rows.forEach(role => {
      roleMap[role.name] = role.id
    })
    
    // Create sample teams
    console.log('\n🏆 Creating sample teams...')
    const teams = await pool.query(`
      INSERT INTO teams (video_game_id, name, short_name, region, active)
      VALUES 
        ($1, 'Cloud9', 'C9', 'LCS', true),
        ($1, 'Team Liquid', 'TL', 'LCS', true),
        ($1, 'FlyQuest', 'FLY', 'LCS', true),
        ($1, 'G2 Esports', 'G2', 'LEC', true),
        ($1, 'Fnatic', 'FNC', 'LEC', true),
        ($1, 'T1', 'T1', 'LCK', true),
        ($1, 'Gen.G', 'GEN', 'LCK', true),
        ($1, 'JD Gaming', 'JDG', 'LPL', true),
        ($1, 'Bilibili Gaming', 'BLG', 'LPL', true)
      ON CONFLICT (video_game_id, name, region) DO NOTHING
      RETURNING id, name
    `, [lolGameId])
    
    console.log(`   Created ${teams.rowCount} teams`)
    
    // Get team IDs for player creation
    const c9 = await pool.query(`SELECT id FROM teams WHERE short_name = 'C9' AND video_game_id = $1`, [lolGameId])
    const tl = await pool.query(`SELECT id FROM teams WHERE short_name = 'TL' AND video_game_id = $1`, [lolGameId])
    const g2 = await pool.query(`SELECT id FROM teams WHERE short_name = 'G2' AND video_game_id = $1`, [lolGameId])
    
    const c9Id = c9.rows[0]?.id
    const tlId = tl.rows[0]?.id
    const g2Id = g2.rows[0]?.id
    
    // Create sample players
    console.log('\n⚔️  Creating sample players...')
    const players = await pool.query(`
      INSERT INTO players (video_game_id, team_id, role_id, ign, real_name, active)
      VALUES 
        -- Cloud9 roster
        ($1, $2, $3, 'Thanatos', 'Thanatos Top', true),
        ($1, $2, $4, 'Blaber', 'Robert Huang', true),
        ($1, $2, $5, 'Jojopyun', 'Joseph Pyun', true),
        ($1, $2, $6, 'Berserker', 'Kim Min-cheol', true),
        ($1, $2, $7, 'Vulcan', 'Philippe Laflamme', true),
        
        -- Team Liquid roster
        ($1, $8, $3, 'Impact', 'Jeong Eon-yeong', true),
        ($1, $8, $4, 'UmTi', 'Um Seong-hyeon', true),
        ($1, $8, $5, 'APA', 'Sami Abloudaye', true),
        ($1, $8, $6, 'Yeon', 'Yeon Ki-seok', true),
        ($1, $8, $7, 'CoreJJ', 'Jo Yong-in', true),
        
        -- G2 Esports roster
        ($1, $9, $3, 'BrokenBlade', 'Sergen Çelik', true),
        ($1, $9, $4, 'Yike', 'Martin Sundelin', true),
        ($1, $9, $5, 'Caps', 'Rasmus Winther', true),
        ($1, $9, $6, 'Hans sama', 'Steven Liv', true),
        ($1, $9, $7, 'Mikyx', 'Mihael Mehle', true)
      ON CONFLICT (video_game_id, ign) DO NOTHING
      RETURNING id, ign
    `, [
      lolGameId, c9Id, roleMap['Top Lane'], roleMap['Jungle'], roleMap['Mid Lane'], roleMap['Attack Damage Carry'], roleMap['Support'],
      tlId,
      g2Id
    ])
    
    console.log(`   Created ${players.rowCount} players`)
    
    // Create sample league
    console.log('\n🎮 Creating sample league...')
    const hostUser = await pool.query(`SELECT id FROM users WHERE username = 'LeagueHost'`)
    
    if (hostUser.rows.length > 0) {
      const league = await pool.query(`
        INSERT INTO leagues (
          video_game_id, 
          host_user_id, 
          name, 
          description, 
          invite_code, 
          privacy, 
          regions, 
          salary_cap_enabled,
          max_participants,
          draft_timer_seconds,
          status
        )
        VALUES (
          $1, 
          $2, 
          'Test League 2025', 
          'Sample league for testing', 
          'TEST2025', 
          'public', 
          ARRAY['LCS', 'LEC'], 
          false,
          10,
          180,
          'pending'
        )
        ON CONFLICT (invite_code) DO NOTHING
        RETURNING id, name
      `, [lolGameId, hostUser.rows[0].id])
      
      if (league.rowCount > 0) {
        console.log(`   Created league: ${league.rows[0].name}`)
        
        // Add host as participant
        await pool.query(`
          INSERT INTO league_participants (league_id, user_id, draft_order)
          VALUES ($1, $2, 1)
          ON CONFLICT (league_id, user_id) DO NOTHING
        `, [league.rows[0].id, hostUser.rows[0].id])
        
        console.log('   Added host as participant')
      }
    }
    
    console.log('\n✅ Database seeding completed successfully!')
    console.log('\n📊 Summary:')
    
    // Show counts
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM teams) as teams,
        (SELECT COUNT(*) FROM players) as players,
        (SELECT COUNT(*) FROM leagues) as leagues
    `)
    
    console.log(`   Users: ${counts.rows[0].users}`)
    console.log(`   Teams: ${counts.rows[0].teams}`)
    console.log(`   Players: ${counts.rows[0].players}`)
    console.log(`   Leagues: ${counts.rows[0].leagues}`)
    
    console.log('\n🔐 Test Login Credentials:')
    console.log('   Email: test@example.com')
    console.log('   Password: password123')
    
  } catch (error) {
    console.error('❌ Seeding error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run seeding
seedDatabase()
