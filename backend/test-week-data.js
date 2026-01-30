import axios from 'axios';

/**
 * Test script to check if Leaguepedia provides week information
 * in ScoreboardGames or MatchSchedule tables
 */

const LEAGUEPEDIA_API = 'https://lol.fandom.com/api.php';

async function queryLeaguepedia(tables, fields, where = '') {
  try {
    const params = {
      action: 'cargoquery',
      format: 'json',
      tables,
      fields,
      limit: 5,
    };

    if (where) {
      params.where = where;
    }

    console.log(`\n🔍 Querying: ${tables}`);
    console.log(`   Fields: ${fields}`);
    if (where) console.log(`   Where: ${where}`);

    const response = await axios.get(LEAGUEPEDIA_API, { params });

    if (response.data?.cargoquery) {
      return response.data.cargoquery;
    }

    return null;
  } catch (error) {
    console.error(`❌ Error querying ${tables}:`, error.message);
    return null;
  }
}

async function checkWeekInformation() {
  console.log('🔍 CHECKING LEAGUEPEDIA FOR WEEK INFORMATION\n');
  console.log('='.repeat(70));

  // Test 1: Check ScoreboardGames table
  console.log('\n📊 TEST 1: ScoreboardGames table');
  console.log('-'.repeat(70));
  
  const gamesResult = await queryLeaguepedia(
    'ScoreboardGames',
    'GameId, OverviewPage, Team1, Team2, Winner, DateTime_UTC, Week, Tab',
    "OverviewPage='LPL/2026 Season/Split 1'"
  );

  if (gamesResult && gamesResult.length > 0) {
    console.log(`✅ Found ${gamesResult.length} games`);
    console.log('\nSample game data:');
    gamesResult.forEach((item, index) => {
      const game = item.title;
      console.log(`\nGame ${index + 1}:`);
      console.log(`  GameId: ${game.GameId}`);
      console.log(`  Teams: ${game.Team1} vs ${game.Team2}`);
      console.log(`  DateTime_UTC: ${game.DateTime_UTC || 'NULL'}`);
      console.log(`  Week: ${game.Week || 'NULL'} ← CHECKING THIS`);
      console.log(`  Tab: ${game.Tab || 'NULL'}`);
      console.log(`  OverviewPage: ${game.OverviewPage}`);
    });
  } else {
    console.log('❌ No games found or error occurred');
  }

  // Test 2: Check MatchSchedule table
  console.log('\n\n📊 TEST 2: MatchSchedule table');
  console.log('-'.repeat(70));
  
  const scheduleResult = await queryLeaguepedia(
    'MatchSchedule',
    'OverviewPage, Team1, Team2, DateTime_UTC, Week, BestOf, Winner, Tab',
    "OverviewPage='LPL/2026 Season/Split 1'"
  );

  if (scheduleResult && scheduleResult.length > 0) {
    console.log(`✅ Found ${scheduleResult.length} matches`);
    console.log('\nSample match data:');
    scheduleResult.forEach((item, index) => {
      const match = item.title;
      console.log(`\nMatch ${index + 1}:`);
      console.log(`  Teams: ${match.Team1} vs ${match.Team2}`);
      console.log(`  DateTime_UTC: ${match.DateTime_UTC || 'NULL'}`);
      console.log(`  Week: ${match.Week || 'NULL'} ← CHECKING THIS`);
      console.log(`  Tab: ${match.Tab || 'NULL'}`);
      console.log(`  BestOf: ${match.BestOf || 'NULL'}`);
      console.log(`  Winner: ${match.Winner || 'NULL'}`);
    });
  } else {
    console.log('❌ No matches found or error occurred');
  }

  // Test 3: Check what other week-related fields exist
  console.log('\n\n📊 TEST 3: Checking ScoreboardGames schema');
  console.log('-'.repeat(70));
  
  const schemaResult = await queryLeaguepedia(
    'ScoreboardGames',
    '_pageName, GameId, Week, Tab, N_GameInMatch, N_MatchInTab, N_TabInPage',
    "OverviewPage='LPL/2026 Season/Split 1'"
  );

  if (schemaResult && schemaResult.length > 0) {
    console.log(`✅ Found ${schemaResult.length} games with extended fields`);
    console.log('\nExtended field analysis:');
    schemaResult.forEach((item, index) => {
      const game = item.title;
      console.log(`\nGame ${index + 1}:`);
      console.log(`  _pageName: ${game._pageName || 'NULL'}`);
      console.log(`  GameId: ${game.GameId}`);
      console.log(`  Week: ${game.Week || 'NULL'}`);
      console.log(`  Tab: ${game.Tab || 'NULL'}`);
      console.log(`  N_GameInMatch: ${game.N_GameInMatch || 'NULL'}`);
      console.log(`  N_MatchInTab: ${game.N_MatchInTab || 'NULL'}`);
      console.log(`  N_TabInPage: ${game.N_TabInPage || 'NULL'}`);
    });
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('📝 SUMMARY:');
  console.log('='.repeat(70));
  
  if (gamesResult && gamesResult.length > 0) {
    const hasWeek = gamesResult.some(item => item.title.Week);
    const hasTab = gamesResult.some(item => item.title.Tab);
    
    if (hasWeek) {
      console.log('✅ Week field IS populated in ScoreboardGames!');
      console.log('   → We can use this directly for week tracking');
    } else if (hasTab) {
      console.log('⚠️  Week field is NULL, but Tab field has data');
      console.log('   → Tab might contain week information (e.g., "Week 3")');
      console.log('   → We can parse Tab to extract week number');
    } else {
      console.log('❌ Neither Week nor Tab fields are populated');
      console.log('   → Need to calculate week from dates');
    }
  }

  console.log('\n✅ Test complete!\n');
}

checkWeekInformation();
