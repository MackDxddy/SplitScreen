import { PLAYER_SCORING, TEAM_SCORING, GAME_DURATION_MULTIPLIER } from '../config/scoring-weights.js'
import logger from '../config/logger.js'

/**
 * Fantasy Scoring Service
 * Calculates fantasy points for players and teams based on match performance
 * 
 * Based on Technical Specification Section 8
 */

class ScoringService {
  /**
   * Apply game duration multiplier to points
   * @param {number} points - Raw fantasy points
   * @param {number} gameDurationMinutes - Game duration in minutes
   * @returns {number} Adjusted points
   */
  applyDurationMultiplier(points, gameDurationMinutes) {
    if (!gameDurationMinutes || gameDurationMinutes <= 0) {
      return points
    }

    let multiplier = GAME_DURATION_MULTIPLIER.NORMAL // Default

    if (gameDurationMinutes < 20) {
      multiplier = GAME_DURATION_MULTIPLIER.UNDER_20_MIN
    } else if (gameDurationMinutes > 40) {
      multiplier = GAME_DURATION_MULTIPLIER.OVER_40_MIN
    }

    const adjustedPoints = points * multiplier

    if (multiplier !== 1.0) {
      logger.debug('Duration multiplier applied', {
        originalPoints: points,
        duration: gameDurationMinutes,
        multiplier,
        adjustedPoints
      })
    }

    return adjustedPoints
  }

  /**
   * Calculate fantasy points for a player's performance
   * 
   * @param {Object} playerStats - Player statistics
   * @param {number} playerStats.kills - Number of kills
   * @param {number} playerStats.deaths - Number of deaths
   * @param {number} playerStats.assists - Number of assists
   * @param {number} playerStats.cs - Creep score (minions killed)
   * @param {number} playerStats.visionScore - Vision score
   * @param {number} teamTotalKills - Total kills by player's team (for kill participation)
   * @param {number} gameDurationMinutes - Game duration in minutes (optional)
   * @returns {number} Fantasy points (rounded to 2 decimals)
   */
  calculatePlayerPoints(playerStats, teamTotalKills = 0, gameDurationMinutes = null) {
    try {
      const { kills, deaths, assists, cs, visionScore } = playerStats

      // Validate inputs
      if (kills < 0 || deaths < 0 || assists < 0 || cs < 0 || visionScore < 0) {
        logger.warn('Invalid player stats (negative values)', playerStats)
        return 0.00
      }

      // Base scoring
      let points = 0

      // Kills
      points += kills * PLAYER_SCORING.KILLS

      // Deaths (typically negative)
      points += deaths * PLAYER_SCORING.DEATHS

      // Assists
      points += assists * PLAYER_SCORING.ASSISTS

      // CS (Creep Score)
      points += cs * PLAYER_SCORING.CS

      // Vision Score
      points += visionScore * PLAYER_SCORING.VISION_SCORE

      // Kill Participation
      // Formula: ((Kills + Assists) / Team Kills × 100) × 0.25
      if (teamTotalKills > 0) {
        const killParticipation = ((kills + assists) / teamTotalKills) * 100
        points += killParticipation * PLAYER_SCORING.KILL_PARTICIPATION
      } else if (kills + assists > 0) {
        // Edge case: player has kills/assists but team total is 0 (shouldn't happen)
        logger.warn('Player has kills/assists but teamTotalKills is 0', {
          kills,
          assists,
          teamTotalKills
        })
        // Award full participation points
        points += 100 * PLAYER_SCORING.KILL_PARTICIPATION
      }

      // Flawless Bonus
      // If player has 0 deaths, multiply total by bonus multiplier
      if (deaths === 0 && points > 0) {
        points *= PLAYER_SCORING.FLAWLESS_BONUS
        logger.debug('Flawless bonus applied', {
          originalPoints: points / PLAYER_SCORING.FLAWLESS_BONUS,
          bonusPoints: points
        })
      }

      // Round to 2 decimal places
      const finalPoints = Math.round(points * 100) / 100

      logger.debug('Player points calculated', {
        stats: playerStats,
        points: finalPoints
      })

      // Apply game duration multiplier if provided
      if (gameDurationMinutes !== null) {
        return Math.round(this.applyDurationMultiplier(finalPoints, gameDurationMinutes) * 100) / 100
      }

      return finalPoints

    } catch (error) {
      logger.error('Error calculating player points', {
        playerStats,
        error: error.message
      })
      return 0.00
    }
  }

  /**
   * Calculate fantasy points for a team's performance
   * 
   * @param {Object} teamStats - Team statistics
   * @param {number} teamStats.dragons - Dragons taken
   * @param {number} teamStats.riftHeralds - Rift Heralds taken
   * @param {number} teamStats.barons - Baron Nashors taken
   * @param {number} teamStats.voidGrubs - Void Grubs taken
   * @param {number} teamStats.atakhan - Atakhan taken (0 or 1)
   * @param {number} teamStats.turrets - Turrets destroyed
   * @param {number} teamStats.inhibitors - Inhibitors destroyed
   * @param {number} teamStats.totalKills - Total team kills
   * @param {boolean} teamStats.won - Did team win the match
   * @param {number} gameDurationMinutes - Game duration in minutes (optional)
   * @returns {number} Fantasy points (rounded to 2 decimals)
   */
  calculateTeamPoints(teamStats, gameDurationMinutes = null) {
    try {
      const {
        dragons = 0,
        riftHeralds = 0,
        barons = 0,
        voidGrubs = 0,
        atakhan = 0,
        turrets = 0,
        inhibitors = 0,
        totalKills = 0,
        won = false
      } = teamStats

      // Validate inputs
      if (dragons < 0 || riftHeralds < 0 || barons < 0 || voidGrubs < 0 || 
          atakhan < 0 || turrets < 0 || inhibitors < 0 || totalKills < 0) {
        logger.warn('Invalid team stats (negative values)', teamStats)
        return 0.00
      }

      let points = 0

      // Epic monsters
      points += dragons * TEAM_SCORING.DRAGONS
      points += riftHeralds * TEAM_SCORING.RIFT_HERALDS
      points += barons * TEAM_SCORING.BARONS
      points += voidGrubs * TEAM_SCORING.VOID_GRUBS
      points += atakhan * TEAM_SCORING.ATAKHAN

      // Structures
      points += turrets * TEAM_SCORING.TURRETS
      points += inhibitors * TEAM_SCORING.INHIBITORS

      // Combat
      points += totalKills * TEAM_SCORING.TOTAL_KILLS

      // Win/Loss
      points += won ? TEAM_SCORING.WIN : TEAM_SCORING.LOSS

      // Round to 2 decimal places
      const finalPoints = Math.round(points * 100) / 100

      logger.debug('Team points calculated', {
        stats: teamStats,
        points: finalPoints
      })

      // Apply game duration multiplier if provided
      if (gameDurationMinutes !== null) {
        return Math.round(this.applyDurationMultiplier(finalPoints, gameDurationMinutes) * 100) / 100
      }

      return finalPoints

    } catch (error) {
      logger.error('Error calculating team points', {
        teamStats,
        error: error.message
      })
      return 0.00
    }
  }

  /**
   * Get current scoring weights (for display/debugging)
   * @returns {Object} Current scoring configuration
   */
  getScoringWeights() {
    return {
      player: PLAYER_SCORING,
      team: TEAM_SCORING
    }
  }

  /**
   * Calculate points for multiple players (batch operation)
   * @param {Array} playersStats - Array of player stat objects
   * @param {Object} teamKillsMap - Map of team name to total kills
   * @returns {Array} Array of { ...playerStats, fantasyPoints }
   */
  calculatePlayerPointsBatch(playersStats, teamKillsMap = {}) {
    return playersStats.map(playerStats => {
      const teamKills = teamKillsMap[playerStats.team] || 0
      const fantasyPoints = this.calculatePlayerPoints(playerStats, teamKills)
      
      return {
        ...playerStats,
        fantasyPoints
      }
    })
  }

  /**
   * Calculate points for multiple teams (batch operation)
   * @param {Array} teamsStats - Array of team stat objects
   * @returns {Array} Array of { ...teamStats, fantasyPoints }
   */
  calculateTeamPointsBatch(teamsStats) {
    return teamsStats.map(teamStats => {
      const fantasyPoints = this.calculateTeamPoints(teamStats)
      
      return {
        ...teamStats,
        fantasyPoints
      }
    })
  }
}

// Export singleton instance
export default new ScoringService()
