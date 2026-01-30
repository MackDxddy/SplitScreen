import leaguepediaService from './src/services/leaguepedia.service.js';
import dataPipelineService from './src/services/data-pipeline.service.js';
import logger from './src/config/logger.js';

// Rate limiter: max 3 calls per second
class RateLimiter {
  constructor(maxCallsPerSecond = 3) {
    this.maxCalls = maxCallsPerSecond;
    this.calls = [];
  }

  async waitForSlot() {
    const now = Date.now();
    // Remove calls older than 1 second
    this.calls = this.calls.filter(time => now - time < 1000);
    
    if (this.calls.length >= this.maxCalls) {
      // Wait until oldest call is >1 second old
      const oldestCall = this.calls[0];
      const waitTime = 1000 - (now - oldestCall) + 50; // +50ms buffer
      console.log(`  ⏸️  Rate limit: waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForSlot(); // Recursive check
    }
    
    this.calls.push(now);
  }
}

const rateLimiter = new RateLimiter(3); // 3 calls per second max

// Wrap API calls with rate limiting
const originalGetPlayerStats = leaguepediaService.getPlayerStats.bind(leaguepediaService);
const originalGetTeamStats = leaguepediaService.getTeamStats.bind(leaguepediaService);

leaguepediaService.getPlayerStats = async function(gameId) {
  await rateLimiter.waitForSlot();
  return originalGetPlayerStats(gameId);
};

leaguepediaService.getTeamStats = async function(gameId) {
  await rateLimiter.waitForSlot();
  return originalGetTeamStats(gameId);
};

async function backfillLPLMatches() {
  try {
    console.log('🔄 Starting LPL backfill with rate limiting (max 3 API calls/sec)...\n');
    
    // Fetch ALL games
    await rateLimiter.waitForSlot();
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
        
        // Wait 10 seconds between games to avoid rate limiting
        if (i < allGames.length - 1) {
          console.log(`  ⏳ Waiting 10 seconds before next game...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
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
