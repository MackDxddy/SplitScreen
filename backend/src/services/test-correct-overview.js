import axios from 'axios';

async function testCorrectOverview() {
  const baseUrl = 'https://lol.fandom.com/api.php';
  
  // The correct OverviewPage format
  const overviewPage = 'LPL/2026 Season/Split 1';
  
  console.log(`\n=== Testing OverviewPage: "${overviewPage}" ===\n`);
  
  // Test 1: Get recent completed games
  console.log('Test 1: Recent completed games from ScoreboardGames');
  try {
    const response = await axios.get(baseUrl, {
      params: {
        action: 'cargoquery',
        format: 'json',
        tables: 'ScoreboardGames',
        fields: 'Team1,Team2,DateTime_UTC,Winner,OverviewPage',
        where: `OverviewPage="${overviewPage}"`,
        limit: 5,
        order_by: 'DateTime_UTC DESC'
      }
    });

    const results = response.data?.cargoquery;
    if (results && results.length > 0) {
      console.log(`✅ Found ${results.length} completed games!`);
      results.forEach((result, i) => {
        const game = result.title;
        console.log(`\nGame ${i + 1}:`);
        console.log(`  ${game.Team1} vs ${game.Team2}`);
        console.log(`  Winner: ${game.Winner}`);
        console.log(`  Date: ${game['DateTime UTC']}`);
      });
    } else {
      console.log('❌ No results found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 2: Try to get scheduled games from MatchSchedule
  console.log('\n\nTest 2: Scheduled games from MatchSchedule');
  try {
    const response = await axios.get(baseUrl, {
      params: {
        action: 'cargoquery',
        format: 'json',
        tables: 'MatchSchedule',
        fields: 'Team1,Team2,DateTime_UTC,OverviewPage,Winner',
        where: `OverviewPage="${overviewPage}"`,
        limit: 10,
        order_by: 'DateTime_UTC ASC'
      }
    });

    const results = response.data?.cargoquery;
    if (results && results.length > 0) {
      console.log(`✅ Found ${results.length} scheduled matches!`);
      results.forEach((result, i) => {
        const match = result.title;
        console.log(`\nMatch ${i + 1}:`);
        console.log(`  ${match.Team1} vs ${match.Team2}`);
        console.log(`  Date: ${match['DateTime UTC']}`);
        console.log(`  Winner: ${match.Winner || 'TBD'}`);
      });
    } else {
      console.log('❌ No scheduled matches found in MatchSchedule');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 3: Get ALL matches (completed + scheduled) ordered by date
  console.log('\n\nTest 3: All matches (to see if schedule exists anywhere)');
  try {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const response = await axios.get(baseUrl, {
      params: {
        action: 'cargoquery',
        format: 'json',
        tables: 'MatchSchedule',
        fields: 'Team1,Team2,DateTime_UTC,Winner',
        where: `OverviewPage="${overviewPage}" AND DateTime_UTC >= "${now}"`,
        limit: 10,
        order_by: 'DateTime_UTC ASC'
      }
    });

    const results = response.data?.cargoquery;
    if (results && results.length > 0) {
      console.log(`✅ Found ${results.length} future matches!`);
      results.forEach((result, i) => {
        const match = result.title;
        console.log(`\nFuture Match ${i + 1}:`);
        console.log(`  ${match.Team1} vs ${match.Team2}`);
        console.log(`  Scheduled: ${match['DateTime UTC']}`);
        console.log(`  Winner: ${match.Winner || 'TBD (not played yet)'}`);
      });
    } else {
      console.log('❌ No future matches found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCorrectOverview();
