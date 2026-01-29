import leaguepediaService from '../services/leaguepedia.service.js'

async function testLPLSchedule() {
  console.log('Testing LPL MatchSchedule data...\n')

  try {
    // Test 1: Try MatchScheduleGame table
    console.log('Test 1: Get matches from MatchScheduleGame table')
    console.log('='.repeat(70))
    
    const scheduleGame = await leaguepediaService.cargoQuery({
      tables: 'MatchScheduleGame',
      fields: 'Team1, Team2, DateTime_UTC, OverviewPage, GameId',
      where: 'OverviewPage="LPL"',
      order_by: 'DateTime_UTC DESC',
      limit: 5
    })

    console.log(`Found ${scheduleGame.length} matches in MatchScheduleGame`)
    if (scheduleGame.length > 0) {
      console.log('\nMatches:')
      scheduleGame.forEach((match, idx) => {
        console.log(`${idx + 1}. ${match.title.Team1} vs ${match.title.Team2}`)
        console.log(`   Date: ${match.title.DateTime_UTC}`)
      })
    }

    // Test 2: Check ScoreboardGames for future games
    console.log('\n' + '='.repeat(70))
    console.log('Test 2: Check ScoreboardGames for games without winners (scheduled)')
    console.log('='.repeat(70))

    const scoreboard = await leaguepediaService.cargoQuery({
      tables: 'ScoreboardGames',
      fields: 'GameId, Team1, Team2, DateTime_UTC, Winner, OverviewPage',
      where: 'OverviewPage="LPL" AND Winner=""',
      order_by: 'DateTime_UTC DESC',
      limit: 10
    })

    console.log(`\nFound ${scoreboard.length} games without winners`)
    if (scoreboard.length > 0) {
      scoreboard.forEach((game, idx) => {
        console.log(`${idx + 1}. ${game.title.Team1} vs ${game.title.Team2}`)
        console.log(`   Date: ${game.title.DateTime_UTC}`)
      })
    }

    // Test 3: Get any recent completed games to verify LPL data exists
    console.log('\n' + '='.repeat(70))
    console.log('Test 3: Get recent COMPLETED LPL games (to verify data exists)')
    console.log('='.repeat(70))

    const completed = await leaguepediaService.cargoQuery({
      tables: 'ScoreboardGames',
      fields: 'GameId, Team1, Team2, DateTime_UTC, Winner',
      where: 'OverviewPage="LPL"',
      order_by: 'DateTime_UTC DESC',
      limit: 5
    })

    console.log(`\nFound ${completed.length} recent completed games`)
    if (completed.length > 0) {
      completed.forEach((game, idx) => {
        console.log(`${idx + 1}. ${game.title.Team1} vs ${game.title.Team2}`)
        console.log(`   Date: ${game.title.DateTime_UTC}`)
        console.log(`   Winner: ${game.title.Winner}`)
      })
    }

  } catch (error) {
    console.error('Error:', error.message)
  }
}

testLPLSchedule()
