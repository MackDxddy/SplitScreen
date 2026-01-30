import axios from 'axios';

const url = 'https://lol.fandom.com/api.php';

async function checkRateLimit() {
  const params = {
    action: 'cargoquery',
    format: 'json',
    tables: 'ScoreboardGames',
    fields: 'GameId',
    where: 'OverviewPage="LPL/2026 Season/Split 1"',
    limit: 1
  };

  try {
    console.log('Testing Leaguepedia API...');
    const response = await axios.get(url, { params, timeout: 30000 });
    
    if (response.data.error && response.data.error.code === 'ratelimited') {
      console.log('❌ Still rate limited. Wait longer.');
      return false;
    }
    
    if (response.data.cargoquery) {
      console.log('✅ Rate limit cleared! Safe to run backfill.');
      return true;
    }
    
    console.log('⚠️  Unexpected response:', response.data);
    return false;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

checkRateLimit();
