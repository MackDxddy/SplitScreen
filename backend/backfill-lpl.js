import leaguepediaService from './src/services/leaguepedia.service.js';
import dataPipelineService from './src/services/data-pipeline.service.js';
import logger from './src/config/logger.js';

async function backfillLPLMatches() {
  try {
    console.log('🔄 Starting LPL backfill from beginning of 2026 Split 1...\n');
    
    // Fetch ALL games without a timestamp filter (will get all from current split)
    const allGames = await leaguepediaService.fetchRecentGames('LPL', null);
    
    console.log(`✅ Found ${allGames.length} total LPL games\n`);
    
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    
    for (let i = 0; i < allGames.length; i++) {
      const game = allGames[i];
      console.log(`\n[${i + 1}/${allGames.length}] Processing: ${game.blueTeam} vs ${game.redTeam}`);
      
      try {
        const result = await dataPipelineService.processGame(game);
        
        if (result.success) {
          processed++;
          console.log(`  ✅ Processed (Players: ${result.playersProcessed}, Teams: ${result.teamsProcessed})`);
        } else {
          skipped++;
          console.log(`  ⏭️  Skipped: ${result.reason}`);
        }
        
        // Wait 5 seconds between games to avoid rate limiting
        if (i < allGames.length - 1) {
          console.log(`  ⏳ Waiting 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        failed++;
        console.error(`  ❌ Failed: ${error.message}`);
      }
    }
    
    console.log('\n\n📊 Backfill Complete!');
    console.log(`  ✅ Processed: ${processed}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📈 Total: ${allGames.length}`);
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  }
  
  process.exit(0);
}

backfillLPLMatches();
