import axios from 'axios'

async function testLeaguepediaQuery() {
  console.log('Testing Leaguepedia Schedule Tables...\n')

  const url = 'https://lol.fandom.com/api.php'
  
  // Test 1: MatchSchedule with just _pageName to see if table exists
  console.log('='.repeat(70))
  console.log('Test 1: Query MatchSchedule table (minimal fields)')
  console.log('='.repeat(70))
  
  const params1 = {
    action: 'cargoquery',
    format: 'json',
    tables: 'MatchSchedule',
    fields: '_pageName, Team1, Team2, DateTime_UTC',
    where: 'OverviewPage = "LPL"',
    limit: 3
  }

  try {
    console.log('\nQuery:', JSON.stringify(params1, null, 2))
    const response1 = await axios.get(url, { params: params1, timeout: 30000 })
    
    if (response1.data.cargoquery) {
      console.log(`\n✅ MatchSchedule table exists! Found ${response1.data.cargoquery.length} results`)
      if (response1.data.cargoquery.length > 0) {
        console.log('\nSample result:')
        console.log(JSON.stringify(response1.data.cargoquery[0], null, 2))
      }
    } else if (response1.data.error) {
      console.log('\n❌ Error:', response1.data.error.info)
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message)
  }

  // Test 2: MatchScheduleGame table
  console.log('\n' + '='.repeat(70))
  console.log('Test 2: Query MatchScheduleGame table')
  console.log('='.repeat(70))
  
  const params2 = {
    action: 'cargoquery',
    format: 'json',
    tables: 'MatchScheduleGame',
    fields: '_pageName, Team1, Team2, DateTime_UTC',
    where: 'OverviewPage = "LPL"',
    limit: 3
  }

  try {
    console.log('\nQuery:', JSON.stringify(params2, null, 2))
    const response2 = await axios.get(url, { params: params2, timeout: 30000 })
    
    if (response2.data.cargoquery) {
      console.log(`\n✅ MatchScheduleGame table exists! Found ${response2.data.cargoquery.length} results`)
      if (response2.data.cargoquery.length > 0) {
        console.log('\nSample result:')
        console.log(JSON.stringify(response2.data.cargoquery[0], null, 2))
      }
    } else if (response2.data.error) {
      console.log('\n❌ Error:', response2.data.error.info)
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message)
  }

  // Test 3: Try with future dates
  console.log('\n' + '='.repeat(70))
  console.log('Test 3: Query future games from MatchSchedule')
  console.log('='.repeat(70))
  
  const params3 = {
    action: 'cargoquery',
    format: 'json',
    tables: 'MatchSchedule',
    fields: '_pageName, Team1, Team2, DateTime_UTC',
    where: 'OverviewPage = "LPL" AND DateTime_UTC >= "2026-01-28"',
    order_by: 'DateTime_UTC ASC',
    limit: 5
  }

  try {
    console.log('\nQuery:', JSON.stringify(params3, null, 2))
    const response3 = await axios.get(url, { params: params3, timeout: 30000 })
    
    if (response3.data.cargoquery) {
      console.log(`\n✅ Found ${response3.data.cargoquery.length} future games`)
      response3.data.cargoquery.forEach((game, idx) => {
        console.log(`\n${idx + 1}. ${game.title.Team1} vs ${game.title.Team2}`)
        console.log(`   Date: ${game.title.DateTime_UTC}`)
      })
    } else if (response3.data.error) {
      console.log('\n❌ Error:', response3.data.error.info)
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message)
  }
}

testLeaguepediaQuery()
