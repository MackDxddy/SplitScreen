import leaguepediaService from '../services/leaguepedia.service.js'
import logger from '../config/logger.js'

/**
 * Test script for Leaguepedia API service
 * Run with: node src/services/test-leaguepedia.js
 */

async function testLeaguepediaAPI() {
  console.log('🧪 Testing Leaguepedia API Service\n')
  console.log('=' .repeat(60))

  try {
    // Test 1: Connection test
    console.log('\n📡 Test 1: API Connection')
    console.log('-'.repeat(60))
    const isConnected = await leaguepediaService.testConnection()
    
    if (isConnected) {
      console.log('✅ Successfully connected to Leaguepedia API')
    } else {
      console.log('❌ Failed to connect to Leaguepedia API')
      return
    }

    // Test 2: Fetch recent games
    console.log('\n🎮 Test 2: Fetch Recent Games')
    console.log('-'.repeat(60))
    
    // Get games from the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const games = await leaguepediaService.fetchRecentGames(
      sevenDaysAgo,
      ['LCS', 'LEC'] // Just test with LCS and LEC
    )

    if (games.length > 0) {
      console.log(`✅ Fetched ${games.length} recent games`)
      console.log('\nSample game:')
      console.log(JSON.stringify(games[0], null, 2))
      
      // Test 3: Fetch player stats for first game
      if (games[0] && games[0].externalId) {
        console.log('\n⚔️  Test 3: Fetch Player Stats')
        console.log('-'.repeat(60))
        
        const playerStats = await leaguepediaService.getPlayerStats(games[0].externalId)
        
        if (playerStats.length > 0) {
          console.log(`✅ Fetched stats for ${playerStats.length} players`)
          console.log('\nSample player stat:')
          console.log(JSON.stringify(playerStats[0], null, 2))
        } else {
          console.log('⚠️  No player stats found for this game')
        }

        // Test 4: Fetch team stats
        console.log('\n🏆 Test 4: Fetch Team Stats')
        console.log('-'.repeat(60))
        
        const teamStats = await leaguepediaService.getTeamStats(games[0].externalId)
        
        if (teamStats.length > 0) {
          console.log(`✅ Fetched stats for ${teamStats.length} teams`)
          console.log('\nSample team stat:')
          console.log(JSON.stringify(teamStats[0], null, 2))
        } else {
          console.log('⚠️  No team stats found for this game')
        }
      }
    } else {
      console.log('⚠️  No recent games found in the last 7 days')
      console.log('   This might be normal during off-season')
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ All tests completed successfully!\n')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run tests
testLeaguepediaAPI()
