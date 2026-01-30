import axios from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'
import logger from '../config/logger.js'

/**
 * Leaguepedia API Service
 * Fetches League of Legends esports match data from Leaguepedia (via MediaWiki API)
 *
 * API Documentation: https://lol.fandom.com/wiki/Help:API_Documentation
 * Cargo Tables: https://lol.fandom.com/wiki/Special:CargoTables
 * 
 * AUTHENTICATION:
 * - Without auth: 5 requests/min
 * - With auth: 60 requests/min (12x faster!)
 * 
 * To enable auth, add to .env:
 *   LEAGUEPEDIA_BOT_USERNAME=YourUsername@BotName
 *   LEAGUEPEDIA_BOT_PASSWORD=your_bot_password
 * 
 * Create bot password at: https://lol.fandom.com/wiki/Special:BotPasswords
 */

const LEAGUEPEDIA_API_URL = process.env.LEAGUEPEDIA_API_URL || 'https://lol.fandom.com/api.php'

// Retry configuration
const MAX_RETRIES = 1 // Changed from 3 to 1 to avoid burning rate limit
const RETRY_DELAY = 1000 // 1 second, will use exponential backoff

class LeaguepediaService {
  constructor() {
    // Set up axios client with cookie jar for authentication
    const jar = new CookieJar()
    this.client = wrapper(axios.create({ jar }))
    this.isAuthenticated = false
    this.authAttempted = false
    this.lastCallTime = 0 // Track last API call timestamp
  }

  /**
   * Ensure minimum 1 second between API calls to avoid per-second rate limits
   * @private
   */
  async enforceRateLimit() {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastCallTime
    const minDelay = 1000 // 1 second minimum between calls
    
    if (timeSinceLastCall < minDelay) {
      const waitTime = minDelay - timeSinceLastCall
      logger.debug(`Rate limit: waiting ${waitTime}ms before next API call`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastCallTime = Date.now()
  }

  /**
   * Authenticate with Leaguepedia using bot password
   * @private
   */
  async authenticate() {
    if (this.authAttempted) {
      return this.isAuthenticated
    }

    this.authAttempted = true

    const botUsername = process.env.LEAGUEPEDIA_BOT_USERNAME
    const botPassword = process.env.LEAGUEPEDIA_BOT_PASSWORD

    if (!botUsername || !botPassword) {
      logger.info('No Leaguepedia credentials found. Using anonymous access (5 req/min)')
      return false
    }

    try {
      logger.info('Authenticating with Leaguepedia...')

      // Step 1: Get login token (with rate limit enforcement)
      await this.enforceRateLimit()
      const tokenResponse = await this.client.get(LEAGUEPEDIA_API_URL, {
        params: {
          action: 'query',
          meta: 'tokens',
          type: 'login',
          format: 'json'
        }
      })

      const loginToken = tokenResponse.data.query.tokens.logintoken

      // Step 2: Perform login (with rate limit enforcement)
      await this.enforceRateLimit()
      const loginResponse = await this.client.post(
        LEAGUEPEDIA_API_URL,
        new URLSearchParams({
          action: 'login',
          lgname: botUsername,
          lgpassword: botPassword,
          lgtoken: loginToken,
          format: 'json'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )

      if (loginResponse.data.login.result === 'Success') {
        this.isAuthenticated = true
        logger.info('✅ Leaguepedia authentication successful (60 req/min)')
        return true
      } else {
        logger.error('❌ Leaguepedia authentication failed:', loginResponse.data.login)
        return false
      }
    } catch (error) {
      logger.error('Error during Leaguepedia authentication:', error.message)
      return false
    }
  }

  /**
   * Make a Cargo query to Leaguepedia
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async cargoQuery(params) {
    // Attempt authentication on first request if credentials are available
    if (!this.authAttempted) {
      await this.authenticate()
    }
    
    // Enforce 1-second minimum between API calls
    await this.enforceRateLimit()
    
    const defaultParams = {
      action: 'cargoquery',
      format: 'json',
      ...params
    }

    let lastError
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const authStatus = this.isAuthenticated ? 'AUTH' : 'ANON'
        logger.debug(`Leaguepedia API request [${authStatus}] (attempt ${attempt}/${MAX_RETRIES})`, {
          tables: params.tables,
          fields: params.fields?.substring(0, 100) // Log first 100 chars
        })

        const response = await this.client.get(LEAGUEPEDIA_API_URL, {
          params: defaultParams,
          timeout: 30000 // 30 second timeout
        })

        // Log the actual response for debugging
        if (!response.data.cargoquery) {
          logger.warn('Unexpected API response format', {
            hasCargoquery: !!response.data.cargoquery,
            hasError: !!response.data.error,
            responseKeys: Object.keys(response.data),
            error: response.data.error
          })
        }

        if (response.data && response.data.cargoquery) {
          logger.info(`Leaguepedia API request successful [${authStatus}]`, {
            results: response.data.cargoquery.length
          })
          return response.data.cargoquery
        }

        // Check if it's an API error response
        if (response.data.error) {
          throw new Error(`Leaguepedia API error: ${response.data.error.code || response.data.error.info || 'Unknown error'}`)
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
      const games = gamesData.map(game => this.parseGameData(game.title)).filter(g => g !== null)

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
        fields: 'GameId, Team, Dragons, RiftHeralds, Barons, Towers, Inhibitors, Kills',
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
        riftHeralds: parseInt(team.title.RiftHeralds) || 0,
        barons: parseInt(team.title.Barons) || 0,
        turrets: parseInt(team.title.Towers) || 0,
        inhibitors: parseInt(team.title.Inhibitors) || 0,
        totalKills: parseInt(team.title.Kills) || 0
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
   * Extract week number from GameId
   * GameId format: "LPL/2026 Season/Split 1_Week 3_6_1"
   * Returns: "Week 3"
   * @param {string} gameId - Leaguepedia GameId
   * @returns {string|null} Week string (e.g., "Week 3") or null
   */
  extractTabFromGameId(gameId) {
    if (!gameId) return null

    // Match pattern: _Week X_ where X is a number
    const match = gameId.match(/_Week (\d+)_/)
    if (match) {
      return `Week ${match[1]}`
    }

    return null
  }

  /**
   * Parse raw game data from Leaguepedia into our format
   * @param {Object} rawGame - Raw game data from Leaguepedia
   * @returns {Object} Formatted game object
   */
  parseGameData(rawGame) {
    try {
      // Handle DateTime field - API returns "DateTime UTC" (with space)
      let matchDate = null
      const dateTimeField = rawGame.DateTime_UTC || rawGame['DateTime UTC']
      
      if (dateTimeField) {
        // If DateTime already has timezone info, use it directly
        if (dateTimeField.includes('Z') || dateTimeField.includes('+')) {
          matchDate = new Date(dateTimeField)
        } else {
          // Otherwise assume UTC and add Z
          matchDate = new Date(dateTimeField + 'Z')
        }
        // If date is invalid, set to null
        if (isNaN(matchDate.getTime())) {
          matchDate = null
        }
      }

      // Extract tab (week) from GameId
      const tab = this.extractTabFromGameId(rawGame.GameId)

      return {
        externalId: rawGame.GameId,
        tournament: rawGame.Tournament,
        matchDate: matchDate,
        region: rawGame.OverviewPage,
        tab: tab,
        blueTeam: rawGame.Team1,
        redTeam: rawGame.Team2,
        winner: rawGame.Winner,
        durationSeconds: this.parseGameLength(rawGame.Gamelength),
        patchVersion: rawGame.Patch,
        status: 'processing'
      }
    } catch (error) {
      logger.error('Error parsing game data', {
        gameId: rawGame?.GameId,
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
   * Extract region code from full OverviewPage string
   * Example: "LPL/2026 Season/Split 1" -> "LPL"
   * @param {string} overviewPage - Full OverviewPage string
   * @returns {string} Region code
   */
  extractRegionCode(overviewPage) {
    if (!overviewPage) return 'Unknown'
    const parts = overviewPage.split('/')
    return parts[0] || 'Unknown'
  }
}

export default new LeaguepediaService()
