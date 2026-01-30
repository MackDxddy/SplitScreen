import axios from 'axios';

const LEAGUEPEDIA_API = 'https://lol.fandom.com/api.php';

async function testTabField() {
  try {
    console.log('🔍 Testing Leaguepedia API with Tab field...\n');

    const params = {
      action: 'cargoquery',
      format: 'json',
      tables: 'ScoreboardGames',
      fields: 'GameId, Tournament, DateTime_UTC, Team1, Team2, Winner, Gamelength, OverviewPage, Team1Score, Team2Score, Patch, Tab',
      where: 'OverviewPage="LPL/2026 Season/Split 1"',
      order_by: 'DateTime_UTC DESC',
      limit: 3
    };

    console.log('📤 Request params:');
    console.log(JSON.stringify(params, null, 2));

    const response = await axios.get(LEAGUEPEDIA_API, { params, timeout: 30000 });

    console.log('\n📥 Response status:', response.status);
    console.log('📥 Response data:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data && response.data.cargoquery) {
      console.log('\n✅ Success! Found', response.data.cargoquery.length, 'games');
      
      if (response.data.cargoquery.length > 0) {
        const game = response.data.cargoquery[0].title;
        console.log('\n📊 Sample game:');
        console.log('GameId:', game.GameId);
        console.log('Teams:', game.Team1, 'vs', game.Team2);
        console.log('Tab:', game.Tab || 'NULL');
        console.log('DateTime_UTC:', game.DateTime_UTC || 'NULL');
      }
    } else if (response.data && response.data.error) {
      console.log('\n❌ Leaguepedia returned an error:');
      console.log(response.data.error);
    } else {
      console.log('\n⚠️  Unexpected response format');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testTabField();
