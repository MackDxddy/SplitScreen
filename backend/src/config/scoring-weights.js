/**
 * Fantasy Scoring Configuration
 * 
 * Edit these values to adjust fantasy point calculations.
 * Changes take effect after server restart.
 * 
 * Based on Technical Specification Section 8
 */

// ============================================================================
// PLAYER SCORING
// ============================================================================

export const PLAYER_SCORING = {
  // Basic stats
  KILLS: 3,                    // Points per kill
  DEATHS: -0.5,                // Points per death (negative)
  ASSISTS: 2,                  // Points per assist
  CS: 0.02,                    // Points per CS (creep score)
  VISION_SCORE: 0.02,          // Points per vision score
  
  // Advanced calculations
  KILL_PARTICIPATION: 0.25,    // Multiplier for kill participation percentage
                               // Formula: ((Kills + Assists) / Team Kills × 100) × 0.25
  
  FLAWLESS_BONUS: 1.2          // Multiply total score by this if deaths = 0
                               // Example: 50 points with 0 deaths = 50 × 1.2 = 60 points
}

// ============================================================================
// GAME DURATION MULTIPLIER
// ============================================================================

export const GAME_DURATION_MULTIPLIER = {
  UNDER_20_MIN: 1.05,          // +5% bonus for very quick wins (stomps)
  NORMAL: 1.0,                 // Normal games 20-40 minutes (no adjustment)
  OVER_40_MIN: 0.95            // -5% for very long games
}

// ============================================================================
// TEAM SCORING
// ============================================================================

export const TEAM_SCORING = {
  // Epic monsters (major objectives)
  DRAGONS: 2,                  // Points per dragon (any type)
  RIFT_HERALDS: 4,             // Points per Rift Herald
  BARONS: 10,                  // Points per Baron Nashor
  VOID_GRUBS: 1.5,             // Points per Void Grub (spawns at 5 min, up to 3 grubs per spawn)
  ATAKHAN: 7,                  // Points for Atakhan (mid-game epic monster, spawns at 20 min)
  
  // Structure objectives
  TURRETS: 2,                  // Points per turret destroyed
  INHIBITORS: 4,               // Points per inhibitor destroyed
  
  // Combat stats
  TOTAL_KILLS: 1,              // Points per team kill
  
  // Match result
  WIN: 15,                     // Bonus points for winning
  LOSS: -15                    // Penalty points for losing
}

// ============================================================================
// FORMULA NOTES
// ============================================================================

/**
 * PLAYER POINTS CALCULATION:
 * 
 * Base Points = 
 *   (Kills × KILLS) + 
 *   (Deaths × DEATHS) + 
 *   (Assists × ASSISTS) + 
 *   (CS × CS) + 
 *   (Vision Score × VISION_SCORE) +
 *   (Kill Participation % × KILL_PARTICIPATION)
 * 
 * Final Points = 
 *   If deaths = 0: Base Points × FLAWLESS_BONUS
 *   Else: Base Points
 * 
 * Kill Participation % = ((Kills + Assists) / Team Total Kills) × 100
 * 
 * Example:
 *   Player: 5 kills, 0 deaths, 8 assists, 250 CS, 45 vision
 *   Team Total Kills: 20
 *   
 *   Base = (5×3) + (0×-0.5) + (8×2) + (250×0.02) + (45×0.02) + (((5+8)/20×100)×0.25)
 *        = 15 + 0 + 16 + 5 + 0.9 + 16.25
 *        = 53.15
 *   
 *   Final = 53.15 × 1.2 (flawless bonus) = 63.78 points
 */

/**
 * TEAM POINTS CALCULATION:
 * 
 * Points = 
 *   (Dragons × DRAGONS) +
 *   (Rift Heralds × RIFT_HERALDS) +
 *   (Barons × BARONS) +
 *   (Void Grubs × VOID_GRUBS) +
 *   (Atakhan × ATAKHAN) +
 *   (Turrets × TURRETS) +
 *   (Inhibitors × INHIBITORS) +
 *   (Total Kills × TOTAL_KILLS) +
 *   (Won ? WIN : LOSS)
 * 
 * Example (Winning Team):
 *   4 dragons, 1 herald, 1 baron, 3 void grubs, 1 atakhan, 9 turrets, 2 inhibitors, 25 kills
 *   
 *   Points = (4×2) + (1×4) + (1×10) + (3×1.5) + (1×7) + (9×2) + (2×4) + (25×1) + 15
 *          = 8 + 4 + 10 + 4.5 + 7 + 18 + 8 + 25 + 15
 *          = 99.5 points
 */

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate scoring weights on load
 * This helps catch configuration errors early
 */
function validateScoringWeights() {
  const errors = []
  
  // Check for missing required fields
  const requiredPlayerFields = ['KILLS', 'DEATHS', 'ASSISTS', 'CS', 'VISION_SCORE', 'KILL_PARTICIPATION', 'FLAWLESS_BONUS']
  const requiredTeamFields = ['DRAGONS', 'RIFT_HERALDS', 'BARONS', 'VOID_GRUBS', 'ATAKHAN', 'TURRETS', 'INHIBITORS', 'TOTAL_KILLS', 'WIN', 'LOSS']
  
  requiredPlayerFields.forEach(field => {
    if (typeof PLAYER_SCORING[field] !== 'number') {
      errors.push(`PLAYER_SCORING.${field} is missing or not a number`)
    }
  })
  
  requiredTeamFields.forEach(field => {
    if (typeof TEAM_SCORING[field] !== 'number') {
      errors.push(`TEAM_SCORING.${field} is missing or not a number`)
    }
  })
  
  // Warn about unusual values
  if (PLAYER_SCORING.FLAWLESS_BONUS < 1) {
    console.warn('⚠️  Warning: FLAWLESS_BONUS is less than 1.0 (will reduce points instead of bonus)')
  }
  
  if (PLAYER_SCORING.DEATHS > 0) {
    console.warn('⚠️  Warning: DEATHS has positive value (deaths should typically be negative)')
  }
  
  if (errors.length > 0) {
    throw new Error(`Scoring configuration errors:\n${errors.join('\n')}`)
  }
  
  console.log('✅ Scoring weights validated successfully')
}

// Validate on module load
validateScoringWeights()

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  PLAYER_SCORING,
  TEAM_SCORING,
  GAME_DURATION_MULTIPLIER
}
