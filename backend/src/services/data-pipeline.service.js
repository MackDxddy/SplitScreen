import leaguepediaService from './leaguepedia.service.js'
import scoringService from './scoring.service.js'
import scheduleFetcherService from './schedule-fetcher.service.js'
import { pool } from '../config/database.js'
import logger from '../config/logger.js'

/**
 * Data Pipeline Service
 * Processes game data from Leaguepedia and inserts into database
 * 
 * Workflow:
 * 1. Get matches to poll from schedule
 * 2. Fetch game data from Leaguepedia
 * 3. Calculate fantasy points
 * 4. Insert/update database
 * 5. Mark as pending validation
 */

class DataPipelineService {
  /**
   * Process a single game
   * @param {string} externalId - Leaguepedia game ID
   * @param {number} videoGameId - Video game ID
   * @param {number} scheduledMatchId - Scheduled match ID (optional)
   * @returns {Promise<Object>} Processing result
   */
  async processGame(externalId, videoGameId, scheduledMatchId = null) {
    try {
      logger.info('Processing game', { externalId, videoGameId })

      // Fetch game data from Leaguepedia
      const gameData = await leaguepediaService.cargoQuery({
        tables: 'ScoreboardGames',
        fields: 'GameId, Tournament, DateTime_UTC, Team1, Team2, Winner, Gamelength, OverviewPage, Patch',
        where: `GameId="${externalId}"`,
        limit: 1
      })

      if (!gameData || gameData.length === 0) {
        logger.warn('Game not found in Leaguepedia', { externalId })
        return { success: false, reason: 'not_found' }
      }

      const game = leaguepediaService.parseGameData(gameData[0].title)
      
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
           (video_game_id, tournament, region, match_date, duration_seconds, patch_version, 
            status, external_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING id`,
          [
            videoGameId,
            game.tournament,
            game.region,
            game.matchDate,
            game.durationSeconds,
            game.patchVersion,
            'pending_validation',
            externalId
          ]
        )
        matchId = matchResult.rows[0].id
        logger.info('Match inserted', { externalId, matchId })
      }

      // Fetch player stats
      const playerStats = await leaguepediaService.getPlayerStats(externalId)
      
      // Fetch team stats
      const teamStats = await leaguepediaService.getTeamStats(externalId)

      // Process player stats
      await this.processPlayerStats(matchId, playerStats, game.durationSeconds / 60)

      // Process team stats
      await this.processTeamStats(matchId, teamStats, game.winner, game.durationSeconds / 60)

      // Mark scheduled match as completed if provided
      if (scheduledMatchId) {
        await scheduleFetcherService.markMatchCompleted(scheduledMatchId, matchId, externalId)
      }

      logger.info('Game processed successfully', {
        externalId,
        matchId,
        players: playerStats.length,
        teams: teamStats.length
      })

      return { success: true, matchId, playersProcessed: playerStats.length, teamsProcessed: teamStats.length }

    } catch (error) {
      logger.error('Error processing game', {
        externalId,
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
   */
  async processPlayerStats(matchId, playerStats, gameDurationMinutes) {
    try {
      // Build team kills map for kill participation
      const teamKillsMap = {}
      playerStats.forEach(stat => {
        if (!teamKillsMap[stat.team]) {
          teamKillsMap[stat.team] = 0
        }
        teamKillsMap[stat.team] += stat.kills
      })

      for (const stat of playerStats) {
        // Find or create player
        const playerId = await this.findOrCreatePlayer(stat.playerName, stat.team, stat.role)

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
   * @param {string} winner - Winning team name
   * @param {number} gameDurationMinutes - Game duration in minutes
   */
  async processTeamStats(matchId, teamStats, winner, gameDurationMinutes) {
    try {
      for (const stat of teamStats) {
        // Find or create team
        const teamId = await this.findOrCreateTeam(stat.team)

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
            won: stat.team === winner
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
            stat.team === winner,
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
  async findOrCreatePlayer(playerName, teamName, role) {
    try {
      // Try to find existing player
      const existing = await pool.query(
        'SELECT id FROM players WHERE ign = $1',
        [playerName]
      )

      if (existing.rows.length > 0) {
        return existing.rows[0].id
      }

      // Find team and role IDs
      const teamResult = await pool.query(
        'SELECT id FROM teams WHERE name = $1 OR short_name = $1',
        [teamName]
      )
      const teamId = teamResult.rows.length > 0 ? teamResult.rows[0].id : null

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

      logger.info('Created new player', { playerName, teamName, role })
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
   * @returns {Promise<number>} Team ID
   */
  async findOrCreateTeam(teamName) {
    try {
      // Try to find existing team
      const existing = await pool.query(
        'SELECT id FROM teams WHERE name = $1 OR short_name = $1',
        [teamName]
      )

      if (existing.rows.length > 0) {
        return existing.rows[0].id
      }

      // Create new team
      const newTeam = await pool.query(
        `INSERT INTO teams (video_game_id, name, short_name, region, active, created_at, updated_at)
         VALUES (1, $1, $1, 'Unknown', true, NOW(), NOW())
         RETURNING id`,
        [teamName]
      )

      logger.info('Created new team', { teamName })
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
