import leaguepediaService from './leaguepedia.service.js'
import scoringService from './scoring.service.js'
import { pool } from '../config/database.js'
import logger from '../config/logger.js'

/**
 * Data Pipeline Service
 * Processes game data from Leaguepedia and inserts into database
 *
 * Workflow:
 * 1. Accept pre-fetched game data from poller
 * 2. Calculate fantasy points
 * 3. Insert/update database
 * 4. Mark as pending validation
 */

class DataPipelineService {
  /**
   * Process a single game with pre-fetched data
   * @param {Object} gameData - Pre-fetched game data from Leaguepedia
   * @returns {Promise<Object>} Processing result
   */
  async processGame(gameData) {
    try {
      if (!gameData || !gameData.externalId) {
        logger.warn('Invalid game data provided', { gameData })
        return { success: false, reason: 'invalid_data' }
      }

      const externalId = gameData.externalId
      const videoGameId = 1 // League of Legends

      logger.info('Processing game', { 
        externalId, 
        blueTeam: gameData.blueTeam,
        redTeam: gameData.redTeam
      })

      // Check if game already processed
      const existing = await pool.query(
        'SELECT id FROM matches WHERE external_id = $1',
        [externalId]
      )

      let matchId
      if (existing.rows.length > 0) {
        matchId = existing.rows[0].id
        logger.debug('Game already exists, updating', { externalId, matchId })
      } else {
        // Insert new match
        const matchResult = await pool.query(
          `INSERT INTO matches
           (video_game_id, tournament, region, match_date, tab, duration_seconds, patch_version,
            status, external_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           RETURNING id`,
          [
            videoGameId,
            gameData.tournament,
            gameData.region,
            gameData.matchDate,
            gameData.tab, // $5
            gameData.durationSeconds, // $6
            gameData.patchVersion, // $7
            'pending_validation', // $8
            externalId // $9
          ]
        )
        matchId = matchResult.rows[0].id
        
        // Update week using the database function
        if (gameData.tab) {
          await pool.query(
            `UPDATE matches SET week = extract_week_from_tab($1) WHERE id = $2`,
            [gameData.tab, matchId]
          )
        }
        
        logger.info('Match inserted', { externalId, matchId })
      }

      // Fetch player stats from Leaguepedia
      const playerStats = await leaguepediaService.getPlayerStats(externalId)

      // Wait 3 seconds before fetching team stats to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Fetch team stats from Leaguepedia
      const teamStats = await leaguepediaService.getTeamStats(externalId)

      // Extract region code (e.g., "LPL" from "LPL/2026 Season/Split 1")
      const regionCode = gameData.region ? gameData.region.split('/')[0] : 'Unknown'

      // Process player stats
      await this.processPlayerStats(matchId, playerStats, gameData.durationSeconds / 60, regionCode)

      // Determine winner team name based on Winner field (1 or 2)
      const winnerTeamName = gameData.winner === '1' ? gameData.blueTeam : gameData.redTeam

      // Process team stats
      await this.processTeamStats(matchId, teamStats, winnerTeamName, gameData.durationSeconds / 60, regionCode)

      logger.info('Game processed successfully', {
        externalId,
        matchId,
        players: playerStats.length,
        teams: teamStats.length
      })

      return { 
        success: true, 
        matchId, 
        playersProcessed: playerStats.length, 
        teamsProcessed: teamStats.length 
      }

    } catch (error) {
      logger.error('Error processing game', {
        externalId: gameData?.externalId,
        error: error.message,
        stack: error.stack
      })
      return { success: false, reason: 'error', error: error.message }
    }
  }

  /**
   * Process player stats for a match
   * @param {number} matchId - Match ID
   * @param {Array} playerStats - Array of player stat objects
   * @param {number} gameDurationMinutes - Game duration in minutes
   * @param {string} region - Game region (LPL, LCS, LEC, LCK)
   */
  async processPlayerStats(matchId, playerStats, gameDurationMinutes, region) {
    try {
      if (!playerStats || playerStats.length === 0) {
        logger.warn('No player stats to process', { matchId })
        return
      }

      // Build team kills map for kill participation
      const teamKillsMap = {}
      playerStats.forEach(stat => {
        if (!teamKillsMap[stat.team]) {
          teamKillsMap[stat.team] = 0
        }
        teamKillsMap[stat.team] += stat.kills
      })

      for (const stat of playerStats) {
        // Find or create player (now with region for team creation!)
        const playerId = await this.findOrCreatePlayer(stat.playerName, stat.team, stat.role, region)

        // Calculate fantasy points
        const teamKills = teamKillsMap[stat.team] || 0
        const fantasyPoints = scoringService.calculatePlayerPoints(
          {
            kills: stat.kills,
            deaths: stat.deaths,
            assists: stat.assists,
            cs: stat.cs,
            visionScore: stat.visionScore
          },
          teamKills,
          gameDurationMinutes
        )

        // Insert or update player stats
        await pool.query(
          `INSERT INTO player_stats
           (match_id, player_id, kills, deaths, assists, cs, gold, damage, vision_score,
            fantasy_points, source, validated, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
           ON CONFLICT (match_id, player_id)
           DO UPDATE SET
             kills = EXCLUDED.kills,
             deaths = EXCLUDED.deaths,
             assists = EXCLUDED.assists,
             cs = EXCLUDED.cs,
             gold = EXCLUDED.gold,
             damage = EXCLUDED.damage,
             vision_score = EXCLUDED.vision_score,
             fantasy_points = EXCLUDED.fantasy_points,
             updated_at = NOW()`,
          [
            matchId,
            playerId,
            stat.kills,
            stat.deaths,
            stat.assists,
            stat.cs,
            stat.gold,
            stat.damage,
            stat.visionScore,
            fantasyPoints,
            'leaguepedia',
            false // Not validated yet
          ]
        )
      }

      logger.debug('Player stats processed', {
        matchId,
        count: playerStats.length
      })

    } catch (error) {
      logger.error('Error processing player stats', {
        matchId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Process team stats for a match
   * @param {number} matchId - Match ID
   * @param {Array} teamStats - Array of team stat objects
   * @param {string} winnerTeamName - Name of the winning team
   * @param {number} gameDurationMinutes - Game duration in minutes
   * @param {string} region - Game region (LPL, LCS, LEC, LCK)
   */
  async processTeamStats(matchId, teamStats, winnerTeamName, gameDurationMinutes, region) {
    try {
      if (!teamStats || teamStats.length === 0) {
        logger.warn('No team stats to process', { matchId })
        return
      }

      for (const stat of teamStats) {
        // Find or create team (now with region!)
        const teamId = await this.findOrCreateTeam(stat.team, region)

        // Determine if this team won
        const won = stat.team === winnerTeamName

        // Calculate fantasy points
        const fantasyPoints = scoringService.calculateTeamPoints(
          {
            dragons: stat.dragons,
            riftHeralds: stat.riftHeralds,
            barons: stat.barons,
            voidGrubs: 0, // TODO: Add when Leaguepedia tracks this
            atakhan: 0, // TODO: Add when Leaguepedia tracks this
            turrets: stat.turrets,
            inhibitors: stat.inhibitors,
            totalKills: stat.totalKills,
            won: won
          },
          gameDurationMinutes
        )

        // Insert or update team stats
        await pool.query(
          `INSERT INTO team_stats
           (match_id, team_id, dragons, rift_heralds, barons, turrets, inhibitors, total_kills, won,
            fantasy_points, source, validated, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
           ON CONFLICT (match_id, team_id)
           DO UPDATE SET
             dragons = EXCLUDED.dragons,
             rift_heralds = EXCLUDED.rift_heralds,
             barons = EXCLUDED.barons,
             turrets = EXCLUDED.turrets,
             inhibitors = EXCLUDED.inhibitors,
             total_kills = EXCLUDED.total_kills,
             won = EXCLUDED.won,
             fantasy_points = EXCLUDED.fantasy_points,
             updated_at = NOW()`,
          [
            matchId,
            teamId,
            stat.dragons,
            stat.riftHeralds,
            stat.barons,
            stat.turrets,
            stat.inhibitors,
            stat.totalKills,
            won,
            fantasyPoints,
            'leaguepedia',
            false // Not validated yet
          ]
        )
      }

      logger.debug('Team stats processed', {
        matchId,
        count: teamStats.length
      })

    } catch (error) {
      logger.error('Error processing team stats', {
        matchId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Find or create a player in the database
   * @param {string} playerName - Player IGN
   * @param {string} teamName - Team name
   * @param {string} role - Player role
   * @returns {Promise<number>} Player ID
   */
  async findOrCreatePlayer(playerName, teamName, role, region) {
    try {
      // Try to find existing player
      const existing = await pool.query(
        'SELECT id FROM players WHERE ign = $1',
        [playerName]
      )

      if (existing.rows.length > 0) {
        return existing.rows[0].id
      }

      // Find or CREATE team (don't just set to null!)
      const teamId = await this.findOrCreateTeam(teamName, region)

      // Find role ID
      const roleResult = await pool.query(
        'SELECT id FROM roles WHERE short_name = $1 OR name LIKE $2',
        [role, `%${role}%`]
      )
      const roleId = roleResult.rows.length > 0 ? roleResult.rows[0].id : 1 // Default to first role

      // Create new player
      const newPlayer = await pool.query(
        `INSERT INTO players (video_game_id, team_id, role_id, ign, active, created_at, updated_at)
         VALUES (1, $1, $2, $3, true, NOW(), NOW())
         RETURNING id`,
        [teamId, roleId, playerName]
      )

      logger.info('Created new player', { playerName, teamName, role, teamId })
      return newPlayer.rows[0].id

    } catch (error) {
      logger.error('Error finding/creating player', {
        playerName,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Find or create a team in the database
   * @param {string} teamName - Team name
   * @param {string} region - Region (LPL, LCS, LEC, LCK)
   * @returns {Promise<number>} Team ID
   */
  async findOrCreateTeam(teamName, region = 'Unknown') {
    try {
      // Try to find existing team
      const existing = await pool.query(
        'SELECT id FROM teams WHERE name = $1 OR short_name = $1',
        [teamName]
      )

      if (existing.rows.length > 0) {
        return existing.rows[0].id
      }

      // Create new team with proper region
      const newTeam = await pool.query(
        `INSERT INTO teams (video_game_id, name, short_name, region, active, created_at, updated_at)
         VALUES (1, $1, $1, $2, true, NOW(), NOW())
         RETURNING id`,
        [teamName, region]
      )

      logger.info('Created new team', { teamName, region, teamId: newTeam.rows[0].id })
      return newTeam.rows[0].id

    } catch (error) {
      logger.error('Error finding/creating team', {
        teamName,
        error: error.message
      })
      throw error
    }
  }
}

export default new DataPipelineService()
