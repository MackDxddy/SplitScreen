import scoringService from '../services/scoring.service.js'

/**
 * Test script for Fantasy Scoring Service
 * Run with: node src/services/test-scoring.js
 */

console.log('🧪 Testing Fantasy Scoring Service\n')
console.log('=' .repeat(70))

// Display current scoring weights
console.log('\n⚙️  Current Scoring Weights')
console.log('-'.repeat(70))
const weights = scoringService.getScoringWeights()
console.log('\nPlayer Scoring:')
console.log(JSON.stringify(weights.player, null, 2))
console.log('\nTeam Scoring:')
console.log(JSON.stringify(weights.team, null, 2))

// ============================================================================
// PLAYER SCORING TESTS
// ============================================================================

console.log('\n\n👤 Player Scoring Tests')
console.log('='.repeat(70))

// Test 1: Standard performance
console.log('\n📊 Test 1: Standard Performance')
console.log('-'.repeat(70))
const player1 = {
  kills: 5,
  deaths: 2,
  assists: 8,
  cs: 250,
  visionScore: 45
}
const teamKills1 = 20
const points1 = scoringService.calculatePlayerPoints(player1, teamKills1)

console.log('Input:')
console.log(`  Kills: ${player1.kills}`)
console.log(`  Deaths: ${player1.deaths}`)
console.log(`  Assists: ${player1.assists}`)
console.log(`  CS: ${player1.cs}`)
console.log(`  Vision Score: ${player1.visionScore}`)
console.log(`  Team Total Kills: ${teamKills1}`)
console.log(`\nBreakdown:`)
console.log(`  Kills: ${player1.kills} × 3 = ${player1.kills * 3}`)
console.log(`  Deaths: ${player1.deaths} × -0.5 = ${player1.deaths * -0.5}`)
console.log(`  Assists: ${player1.assists} × 2 = ${player1.assists * 2}`)
console.log(`  CS: ${player1.cs} × 0.02 = ${player1.cs * 0.02}`)
console.log(`  Vision: ${player1.visionScore} × 0.02 = ${player1.visionScore * 0.02}`)
console.log(`  Kill Part: ((${player1.kills}+${player1.assists})/${teamKills1}×100) × 0.25 = ${(((player1.kills + player1.assists) / teamKills1) * 100 * 0.25).toFixed(2)}`)
console.log(`\n✅ Final Points: ${points1}`)

// Test 2: Flawless bonus (0 deaths)
console.log('\n\n🏆 Test 2: Flawless Performance (0 Deaths)')
console.log('-'.repeat(70))
const player2 = {
  kills: 10,
  deaths: 0,
  assists: 15,
  cs: 300,
  visionScore: 50
}
const teamKills2 = 30
const points2 = scoringService.calculatePlayerPoints(player2, teamKills2)

console.log('Input:')
console.log(`  Kills: ${player2.kills}`)
console.log(`  Deaths: ${player2.deaths} ⭐ FLAWLESS`)
console.log(`  Assists: ${player2.assists}`)
console.log(`  CS: ${player2.cs}`)
console.log(`  Vision Score: ${player2.visionScore}`)
console.log(`  Team Total Kills: ${teamKills2}`)

const basePoints = (player2.kills * 3) + (player2.assists * 2) + 
                   (player2.cs * 0.02) + (player2.visionScore * 0.02) +
                   (((player2.kills + player2.assists) / teamKills2) * 100 * 0.25)
console.log(`\nBase Points (before bonus): ${basePoints.toFixed(2)}`)
console.log(`Flawless Bonus: ${basePoints.toFixed(2)} × 1.2 = ${(basePoints * 1.2).toFixed(2)}`)
console.log(`\n✅ Final Points: ${points2}`)

// Test 3: Poor performance
console.log('\n\n💀 Test 3: Poor Performance (More Deaths)')
console.log('-'.repeat(70))
const player3 = {
  kills: 1,
  deaths: 8,
  assists: 3,
  cs: 150,
  visionScore: 20
}
const teamKills3 = 10
const points3 = scoringService.calculatePlayerPoints(player3, teamKills3)

console.log('Input:')
console.log(`  Kills: ${player3.kills}`)
console.log(`  Deaths: ${player3.deaths}`)
console.log(`  Assists: ${player3.assists}`)
console.log(`  CS: ${player3.cs}`)
console.log(`  Vision Score: ${player3.visionScore}`)
console.log(`  Team Total Kills: ${teamKills3}`)
console.log(`\n✅ Final Points: ${points3}`)

// ============================================================================
// TEAM SCORING TESTS
// ============================================================================

console.log('\n\n🏆 Team Scoring Tests')
console.log('='.repeat(70))

// Test 4: Winning team with all objectives
console.log('\n📊 Test 4: Winning Team (Dominant Performance)')
console.log('-'.repeat(70))
const team1 = {
  dragons: 4,
  riftHeralds: 1,
  barons: 1,
  voidGrubs: 3,
  atakhan: 1,
  turrets: 9,
  inhibitors: 2,
  totalKills: 25,
  won: true
}
const teamPoints1 = scoringService.calculateTeamPoints(team1)

console.log('Input:')
console.log(`  Dragons: ${team1.dragons}`)
console.log(`  Rift Heralds: ${team1.riftHeralds}`)
console.log(`  Barons: ${team1.barons}`)
console.log(`  Void Grubs: ${team1.voidGrubs} ⭐ NEW`)
console.log(`  Atakhan: ${team1.atakhan} ⭐ NEW`)
console.log(`  Turrets: ${team1.turrets}`)
console.log(`  Inhibitors: ${team1.inhibitors}`)
console.log(`  Total Kills: ${team1.totalKills}`)
console.log(`  Result: WIN`)

console.log(`\nBreakdown:`)
console.log(`  Dragons: ${team1.dragons} × 2 = ${team1.dragons * 2}`)
console.log(`  Heralds: ${team1.riftHeralds} × 4 = ${team1.riftHeralds * 4}`)
console.log(`  Barons: ${team1.barons} × 10 = ${team1.barons * 10}`)
console.log(`  Void Grubs: ${team1.voidGrubs} × 1.5 = ${team1.voidGrubs * 1.5}`)
console.log(`  Atakhan: ${team1.atakhan} × 7 = ${team1.atakhan * 7}`)
console.log(`  Turrets: ${team1.turrets} × 2 = ${team1.turrets * 2}`)
console.log(`  Inhibitors: ${team1.inhibitors} × 4 = ${team1.inhibitors * 4}`)
console.log(`  Kills: ${team1.totalKills} × 1 = ${team1.totalKills * 1}`)
console.log(`  Win Bonus: +15`)

console.log(`\n✅ Final Points: ${teamPoints1}`)

// Test 5: Losing team
console.log('\n\n📊 Test 5: Losing Team')
console.log('-'.repeat(70))
const team2 = {
  dragons: 1,
  riftHeralds: 0,
  barons: 0,
  voidGrubs: 0,
  atakhan: 0,
  turrets: 3,
  inhibitors: 0,
  totalKills: 8,
  won: false
}
const teamPoints2 = scoringService.calculateTeamPoints(team2)

console.log('Input:')
console.log(`  Dragons: ${team2.dragons}`)
console.log(`  Rift Heralds: ${team2.riftHeralds}`)
console.log(`  Barons: ${team2.barons}`)
console.log(`  Void Grubs: ${team2.voidGrubs}`)
console.log(`  Atakhan: ${team2.atakhan}`)
console.log(`  Turrets: ${team2.turrets}`)
console.log(`  Inhibitors: ${team2.inhibitors}`)
console.log(`  Total Kills: ${team2.totalKills}`)
console.log(`  Result: LOSS`)
console.log(`\n✅ Final Points: ${teamPoints2}`)

// ============================================================================
// GAME DURATION MULTIPLIER TESTS
// ============================================================================

console.log('\n\n⏱️  Game Duration Multiplier Tests')
console.log('='.repeat(70))

console.log('\n📊 Test 6: Same Performance, Different Game Durations')
console.log('-'.repeat(70))

const samePlayer = {
  kills: 5,
  deaths: 2,
  assists: 8,
  cs: 250,
  visionScore: 45
}
const teamKills = 20

const duration18 = 18  // Quick stomp
const duration30 = 30  // Normal game
const duration42 = 42  // Long game

const points18 = scoringService.calculatePlayerPoints(samePlayer, teamKills, duration18)
const points30 = scoringService.calculatePlayerPoints(samePlayer, teamKills, duration30)
const points42 = scoringService.calculatePlayerPoints(samePlayer, teamKills, duration42)

console.log(`Same player performance (5/2/8, 250 CS, 45 Vision):`)
console.log(`\n  18-minute game: ${points18} points (+5% bonus)`)
console.log(`  30-minute game: ${points30} points (baseline)`)
console.log(`  42-minute game: ${points42} points (-5% penalty)`)

const diff18to30 = ((points18 - points30) / points30 * 100).toFixed(1)
const diff42to30 = ((points42 - points30) / points30 * 100).toFixed(1)

console.log(`\n  Impact of 18min vs 30min: ${diff18to30}%`)
console.log(`  Impact of 42min vs 30min: ${diff42to30}%`)

// Test with team as well
console.log('\n📊 Test 7: Team Duration Impact')
console.log('-'.repeat(70))

const sameTeam = {
  dragons: 3,
  riftHeralds: 1,
  barons: 1,
  voidGrubs: 3,
  atakhan: 0,
  turrets: 7,
  inhibitors: 2,
  totalKills: 20,
  won: true
}

const teamPoints18 = scoringService.calculateTeamPoints(sameTeam, 18)
const teamPoints30 = scoringService.calculateTeamPoints(sameTeam, 30)
const teamPoints42 = scoringService.calculateTeamPoints(sameTeam, 42)

console.log(`Same team performance:`)
console.log(`\n  18-minute win: ${teamPoints18} points (+5% bonus)`)
console.log(`  30-minute win: ${teamPoints30} points (baseline)`)
console.log(`  42-minute win: ${teamPoints42} points (-5% penalty)`)

// ============================================================================
// BATCH OPERATIONS TEST
// ============================================================================

console.log('\n\n📦 Batch Operations Test')
console.log('='.repeat(70))

const players = [
  { name: 'Player1', team: 'TeamA', kills: 5, deaths: 2, assists: 8, cs: 250, visionScore: 45 },
  { name: 'Player2', team: 'TeamA', kills: 3, deaths: 1, assists: 10, cs: 200, visionScore: 50 },
  { name: 'Player3', team: 'TeamB', kills: 2, deaths: 5, assists: 3, cs: 180, visionScore: 30 }
]

const teamKillsMap = {
  'TeamA': 20,
  'TeamB': 10
}

const playersWithPoints = scoringService.calculatePlayerPointsBatch(players, teamKillsMap)

console.log('\nCalculated points for 3 players:')
playersWithPoints.forEach(p => {
  console.log(`  ${p.name}: ${p.fantasyPoints} points`)
})

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n\n' + '='.repeat(70))
console.log('✅ All scoring tests completed successfully!')
console.log('\n📝 To modify scoring weights, edit:')
console.log('   backend/src/config/scoring-weights.js')
console.log('\n💡 Changes take effect after server restart')
console.log('='.repeat(70) + '\n')
