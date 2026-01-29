import axios from 'axios'
import logger from '../config/logger.js'

/**
 * Leaguepedia API Service
 * Fetches League of Legends esports match data from Leaguepedia (via MediaWiki API)
 * 
 * API Documentation: https://lol.fandom.com/wiki/Help:API_Documentation
 * Cargo Tables: https://lol.fandom.com/wiki/Special:CargoTables
 */

const LEAGUEPEDIA_API_URL = process.env.LEAGUEPEDIA_API_URL || 'https://lol.fandom.com/api.php'

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second, will use exponential backoff

class LeaguepediaService {
  /**
   * Make a Cargo query to Leaguepedia
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async cargoQuery(params) {
    const defaultParams = {
      action: 'cargoquery',
      format: 'json',
      ...params
    }

    let lastError
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.debug(`Leaguepedia API request (attempt ${attempt}/${MAX_RETRIES})`, {
          tables: params.tables,
          fields: params.fields?.substring(0, 100) // Log first 100 chars
        })

        const response = await axios.get(LEAGUEPEDIA_API_URL, {
          params: defaultParams,
          timeout: 30000 // 30 second timeout
        })

        if (response.data && response.data.cargoquery) {
          logger.info('Leaguepedia API request successful', {
            results: response.data.cargoquery.length
          })
          return response.data.cargoquery
        }

        throw new Error('Invalid response format from Leaguepedia')

      } catch (error) {
        lastError = error
        logger.warn(`Leaguepedia API attempt ${attempt} failed`, {
          error: error.message,
          attempt
        })

        // Don't retry on 4xx errors (client errors)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          throw error
        }

        // Exponential backoff: wait longer between retries
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, attempt - 1)
          logger.debug(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed
    logger.error('All Leaguepedia API retry attempts failed', {
      error: lastError.message
    })
    throw lastError
  }

  /**
   * Fetch recent games since a timestamp
   * @param {string} region - Region code (e.g., 'LPL', 'LCS', 'LEC', 'LCK')
   * @param {Date|string} sinceTimestamp - Fetch games after this time
   * @returns {Promise<Array>} Array of game objects
   */
  async fetchRecentGames(region, sinceTimestamp = null) {
    try {
      logger.info('Fetching recent games from Leaguepedia', {
        region,
        sinceTimestamp
      })

      // Map region to correct OverviewPage format
      // Format: "REGION/2026 Season/Split 1"
      const overviewPage = `${region}/2026 Season/Split 1`

      // Convert timestamp to Leaguepedia format (YYYY-MM-DD HH:MM:SS)
      let whereClause = `OverviewPage="${overviewPage}"`
      
      if (sinceTimestamp) {
        const date = new Date(sinceTimestamp)
        const formattedDate = date.toISOString().replace('T', ' ').substring(0, 19)
        whereClause += ` AND DateTime_UTC >= "${formattedDate}"`
      }

      // Query ScoreboardGames table
      const gamesData = await this.cargoQuery({
        tables: 'ScoreboardGames',
        fields: 'GameId, Tournament, DateTime_UTC, Team1, Team2, Winner, Gamelength, OverviewPage, Team1Score, Team2Score, Patch',
        where: whereClause,
        order_by: 'DateTime_UTC DESC',
        limit: 100 // Fetch up to 100 recent games
      })

      if (!gamesData || gamesData.length === 0) {
        logger.info('No recent games found')
        return []
      }

      // Parse and format game data
      const games = gamesData.map(game => this.parseGameData(game.title))
      
      logger.info(`Fetched ${games.length} games from Leaguepedia`)
      return games

    } catch (error) {
      logger.error('Error fetching recent games', {
        error: error.message,
        stack: error.stack
      })
      // Graceful degradation: return empty array instead of crashing
      return []
    }
  }

  /**
   * Get detailed player stats for a specific game
   * @param {string} gameId - Leaguepedia game ID
   * @returns {Promise<Array>} Array of player stat objects
   */
  async getPlayerStats(gameId) {
    try {
      logger.info('Fetching player stats', { gameId })

      const playerData = await this.cargoQuery({
        tables: 'ScoreboardPlayers',
        fields: 'GameId, Link, Team, Role, Champion, Kills, Deaths, Assists, Gold, CS, DamageToChampions, VisionScore',
        where: `GameId="${gameId}"`,
        limit: 10 // Maximum 10 players per game
      })

      if (!playerData || playerData.length === 0) {
        logger.warn('No player stats found', { gameId })
        return []
      }

      const stats = playerData.map(player => ({
        gameId: player.title.GameId,
        playerName: player.title.Link,
        team: player.title.Team,
        role: player.title.Role,
        champion: player.title.Champion,
        kills: parseInt(player.title.Kills) || 0,
        deaths: parseInt(player.title.Deaths) || 0,
        assists: parseInt(player.title.Assists) || 0,
        gold: parseInt(player.title.Gold) || 0,
        cs: parseInt(player.title.CS) || 0,
        damage: parseInt(player.title.DamageToChampions) || 0,
        visionScore: parseInt(player.title.VisionScore) || 0
      }))

      logger.info(`Fetched stats for ${stats.length} players`, { gameId })
      return stats

    } catch (error) {
      logger.error('Error fetching player stats', {
        gameId,
        error: error.message
      })
      return []
    }
  }

  /**
   * Get team stats for a specific game
   * @param {string} gameId - Leaguepedia game ID
   * @returns {Promise<Array>} Array of team stat objects (2 teams per game)
   */
  async getTeamStats(gameId) {
    try {
      logger.info('Fetching team stats', { gameId })

      const teamData = await this.cargoQuery({
        tables: 'ScoreboardTeams',
        fields: 'GameId, Team, Dragons, RiftHerald, Barons, Towers, Inhibitors, TeamKills',
        where: `GameId="${gameId}"`,
        limit: 2 // 2 teams per game
      })

      if (!teamData || teamData.length === 0) {
        logger.warn('No team stats found', { gameId })
        return []
      }

      const stats = teamData.map(team => ({
        gameId: team.title.GameId,
        team: team.title.Team,
        dragons: parseInt(team.title.Dragons) || 0,
        riftHeralds: parseInt(team.title.RiftHerald) || 0,
        barons: parseInt(team.title.Barons) || 0,
        turrets: parseInt(team.title.Towers) || 0,
        inhibitors: parseInt(team.title.Inhibitors) || 0,
        totalKills: parseInt(team.title.TeamKills) || 0
      }))

      logger.info(`Fetched stats for ${stats.length} teams`, { gameId })
      return stats

    } catch (error) {
      logger.error('Error fetching team stats', {
        gameId,
        error: error.message
      })
      return []
    }
  }

  /**
   * Parse raw game data from Leaguepedia into our format
   * @param {Object} rawGame - Raw game data from Leaguepedia
   * @returns {Object} Formatted game object
   */
  parseGameData(rawGame) {
    try {
      return {
        externalId: rawGame.GameId,
        tournament: rawGame.Tournament,
        matchDate: new Date(rawGame.DateTime_UTC + 'Z'), // Add Z for UTC
        region: rawGame.OverviewPage,
        blueTeam: rawGame.Team1,
        redTeam: rawGame.Team2,
        winner: rawGame.Winner,
        durationSeconds: this.parseGameLength(rawGame.Gamelength),
        patchVersion: rawGame.Patch,
        status: 'processing'
      }
    } catch (error) {
      logger.error('Error parsing game data', {
        gameId: rawGame.GameId,
        error: error.message
      })
      return null
    }
  }

  /**
   * Parse game length from Leaguepedia format (MM:SS) to seconds
   * @param {string} gamelength - Game length in MM:SS format
   * @returns {number} Duration in seconds
   */
  parseGameLength(gamelength) {
    if (!gamelength) return 0
    
    const parts = gamelength.split(':')
    if (parts.length !== 2) return 0
    
    const minutes = parseInt(parts[0]) || 0
    const seconds = parseInt(parts[1]) || 0
    
    return (minutes * 60) + seconds
  }

  /**
   * Test API connectivity
   * @returns {Promise<boolean>} True if API is accessible
   */
  async testConnection() {
    try {
      logger.info('Testing Leaguepedia API connection...')
      
      const result = await this.cargoQuery({
        tables: 'ScoreboardGames',
        fields: 'GameId',
        limit: 1
      })

      const isConnected = result && result.length > 0
      logger.info('Leaguepedia API connection test', { 
        success: isConnected 
      })
      
      return isConnected

    } catch (error) {
      logger.error('Leaguepedia API connection test failed', {
        error: error.message
      })
      return false
    }
  }
}

// Export singleton instance
export default new LeaguepediaService()
