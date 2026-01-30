import axios from 'axios';

const LEAGUEPEDIA_API = 'https://lol.fandom.com/api.php';

/**
 * Test different OverviewPage formats to find what actually exists
 */

const TEST_FORMATS = [
  // LCS variations
  { region: 'LCS', format: 'LCS/2026 Season/Spring Season' },
  { region: 'LCS', format: 'LCS/2026 Season/Split 1' },
  { region: 'LCS', format: 'LCS/2026 Season/Spring' },
  { region: 'LCS', format: 'LCS/2026/Spring Season' },
  
  // LEC variations
  { region: 'LEC', format: 'LEC/2026 Season/Winter Season' },
  { region: 'LEC', format: 'LEC/2026 Season/Split 1' },
  { region: 'LEC', format: 'LEC/2026 Season/Spring' },
  { region: 'LEC', format: 'LEC/2026/Winter Season' },
  
  // LPL (we know this works)
  { region: 'LPL', format: 'LPL/2026 Season/Split 1' },
  
  // LCK variations
  { region: 'LCK', format: 'LCK/2026 Season/Spring' },
  { region: 'LCK', format: 'LCK/2026 Season/Split 1' },
  { region: 'LCK', format: 'LCK/2026/Spring' },
];

async function testOverviewPage(region, overviewPage) {
  try {
    const params = {
      action: 'cargoquery',
      format: 'json',
      tables: 'ScoreboardPlayers',
      fields: 'Link, Team',
      where: `OverviewPage="${overviewPage}"`,
      limit: 5
    };

    const response = await axios.get(LEAGUEPEDIA_API, { params });
    
    if (response.data?.cargoquery && response.data.cargoquery.length > 0) {
      console.log(`✅ ${region}: "${overviewPage}" - Found ${response.data.cargoquery.length} players`);
      return true;
    } else {
      console.log(`❌ ${region}: "${overviewPage}" - No results`);
      return false;
    }
  } catch (error) {
    console.log(`⚠️  ${region}: "${overviewPage}" - Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Testing OverviewPage formats...\n');
  console.log('='.repeat(70));

  const working = [];

  for (const test of TEST_FORMATS) {
    const works = await testOverviewPage(test.region, test.format);
    if (works) {
      working.push(test);
    }
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ WORKING FORMATS:\n');
  
  if (working.length === 0) {
    console.log('❌ No working formats found! You might be rate limited.');
  } else {
    working.forEach(w => {
      console.log(`${w.region}: "${w.format}"`);
    });
    
    console.log('\n📋 Copy this for your script:\n');
    console.log('const REGIONS = [');
    working.forEach(w => {
      console.log(`  { code: '${w.region}', overviewPage: '${w.format}' },`);
    });
    console.log('];');
  }

  console.log('\n' + '='.repeat(70));
  process.exit(0);
}

main().catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});
