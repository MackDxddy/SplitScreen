import dotenv from 'dotenv'
dotenv.config()

import leaguepediaService from './src/services/leaguepedia.service.js'

async function testAuthentication() {
  console.log('🔍 Testing Leaguepedia authentication...\n')
  
  try {
    // This will automatically authenticate if credentials are present
    const games = await leaguepediaService.fetchRecentGames('LPL/2026 Season/Split 1', 5)
    
    console.log('\n✅ SUCCESS!')
    console.log(`   Fetched: ${games.length} games`)
    console.log(`   Authenticated: ${leaguepediaService.isAuthenticated ? 'YES (60 req/min)' : 'NO (5 req/min)'}`)
    
    if (!leaguepediaService.isAuthenticated) {
      console.log('\n⚠️  Running in anonymous mode')
      console.log('   To enable authentication:')
      console.log('   1. Create bot password at https://lol.fandom.com/wiki/Special:BotPasswords')
      console.log('   2. Add to .env:')
      console.log('      LEAGUEPEDIA_BOT_USERNAME=MackDxddy@BotName')
      console.log('      LEAGUEPEDIA_BOT_PASSWORD=your_password')
    }
    
  } catch (error) {
    console.error('\n❌ FAILED!')
    console.error('   Error:', error.message)
  }
}

testAuthentication()
