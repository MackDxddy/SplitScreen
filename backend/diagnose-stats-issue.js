import leaguepediaService from './src/services/leaguepedia.service.js';

console.log('🔍 DIAGNOSING LEAGUEPEDIA STATS ISSUE\n');

async function diagnose() {
  // Test 1: Can we fetch a game that HAS stats in our DB?
  console.log('TEST 1: Fetching stats for a game that worked (Week 3)');
  console.log('========================================');
  
  const gameId1 = 'LPL/2026 Season/Split 1_Week 3_10_3';
  
  console.log(`\nFetching player stats for: ${gameId1}`);
  const players1 = await leaguepediaService.getPlayerStats(gameId1);
  console.log(`Result: ${players1.length} players`);
  
  console.log(`\nFetching team stats for: ${gameId1}`);
  const teams1 = await leaguepediaService.getTeamStats(gameId1);
  console.log(`Result: ${teams1.length} teams`);
  
  // Wait 5 seconds
  console.log('\n⏳ Waiting 5 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test 2: Can we fetch a game that has NO stats in our DB?
  console.log('TEST 2: Fetching stats for a game that failed (Week 1)');
  console.log('========================================');
  
  const gameId2 = 'LPL/2026 Season/Split 1_Week 1_1_1';
  
  console.log(`\nFetching player stats for: ${gameId2}`);
  const players2 = await leaguepediaService.getPlayerStats(gameId2);
  console.log(`Result: ${players2.length} players`);
  if (players2.length > 0) {
    console.log('Sample player:', players2[0]);
  }
  
  console.log(`\nFetching team stats for: ${gameId2}`);
  const teams2 = await leaguepediaService.getTeamStats(gameId2);
  console.log(`Result: ${teams2.length} teams`);
  if (teams2.length > 0) {
    console.log('Sample team:', teams2[0]);
  }
  
  // Wait 5 seconds
  console.log('\n⏳ Waiting 5 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test 3: Try 3 rapid calls to see rate limiting
  console.log('TEST 3: Rapid fire 3 calls (testing rate limit)');
  console.log('========================================');
  
  const gameId3 = 'LPL/2026 Season/Split 1_Week 2_10_1';
  
  console.log('\nCall 1...');
  const test1 = await leaguepediaService.getPlayerStats(gameId3);
  console.log(`Result: ${test1.length} players`);
  
  console.log('\nCall 2 (immediate)...');
  const test2 = await leaguepediaService.getPlayerStats(gameId3);
  console.log(`Result: ${test2.length} players`);
  
  console.log('\nCall 3 (immediate)...');
  const test3 = await leaguepediaService.getPlayerStats(gameId3);
  console.log(`Result: ${test3.length} players`);
  
  console.log('\n========================================');
  console.log('DIAGNOSIS COMPLETE');
  console.log('========================================\n');
  
  if (players2.length === 0 && teams2.length === 0) {
    console.log('❌ ISSUE: Week 1 games return 0 stats');
    console.log('   Possible causes:');
    console.log('   1. Stats not entered in Leaguepedia yet');
    console.log('   2. Different GameId format for Week 1');
    console.log('   3. Data quality issue in Leaguepedia');
  } else {
    console.log('✅ Stats ARE available for Week 1 games');
  }
  
  if (test1.length > 0 && test2.length === 0) {
    console.log('\n❌ CONFIRMED: Rate limiting after first call');
  } else if (test1.length > 0 && test2.length > 0 && test3.length > 0) {
    console.log('\n✅ NO rate limiting on rapid calls');
    console.log('   Issue is likely elsewhere (backfill logic, timing, etc)');
  }
  
  process.exit(0);
}

diagnose();
