import { pool } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Salary Cap Service - Team Slot Edition
 * Handles pricing, validation, and team slot management
 */

const STARTING_BUDGET = 2400000;
const CURRENT_SEASON = '2026';

class SalaryCapService {
  
  /**
   * Set player rank and calculate price using linear distribution
   * Price = linear interpolation from $500k (rank 1) to $275k (rank N)
   */
  async setPlayerRank(playerId, rankInRole) {
    try {
      // Get player's region and role to determine total players
      const playerResult = await pool.query(
        `SELECT p.role_id, t.region 
         FROM players p 
         JOIN teams t ON t.id = p.team_id 
         WHERE p.id = $1`,
        [playerId]
      );

      if (playerResult.rows.length === 0) {
        throw new Error(`Player ${playerId} not found`);
      }

      const { region } = playerResult.rows[0];

      // Get pricing config for this region
      const configResult = await pool.query(
        'SELECT total_players_per_role, min_price, max_price FROM salary_cap_config WHERE season = $1 AND region = $2',
        [CURRENT_SEASON, region]
      );

      if (configResult.rows.length === 0) {
        throw new Error(`No pricing config found for ${region} ${CURRENT_SEASON}`);
      }

      const { total_players_per_role, min_price, max_price } = configResult.rows[0];

      // Calculate price using database function
      const priceResult = await pool.query(
        'SELECT calculate_linear_price($1, $2, $3, $4) as price',
        [rankInRole, total_players_per_role, min_price, max_price]
      );

      const price = priceResult.rows[0].price;

      // Update player
      await pool.query(
        'UPDATE players SET rank_in_role = $1, current_price = $2 WHERE id = $3',
        [rankInRole, price, playerId]
      );

      logger.info(`Set player ${playerId} to rank ${rankInRole} with price $${price}`);
      return { playerId, rankInRole, price };
    } catch (error) {
      logger.error('Error setting player rank:', error);
      throw error;
    }
  }

  /**
   * Set team rank and calculate price
   */
  async setTeamRank(teamId, rankInRegion) {
    try {
      // Get team's region
      const teamResult = await pool.query(
        'SELECT region FROM teams WHERE id = $1',
        [teamId]
      );

      if (teamResult.rows.length === 0) {
        throw new Error(`Team ${teamId} not found`);
      }

      const { region } = teamResult.rows[0];

      // Get pricing config
      const configResult = await pool.query(
        'SELECT total_teams, min_price, max_price FROM salary_cap_config WHERE season = $1 AND region = $2',
        [CURRENT_SEASON, region]
      );

      if (configResult.rows.length === 0) {
        throw new Error(`No pricing config for ${region} ${CURRENT_SEASON}`);
      }

      const { total_teams, min_price, max_price } = configResult.rows[0];

      // Calculate price
      const priceResult = await pool.query(
        'SELECT calculate_linear_price($1, $2, $3, $4) as price',
        [rankInRegion, total_teams, min_price, max_price]
      );

      const price = priceResult.rows[0].price;

      // Update team
      await pool.query(
        'UPDATE teams SET rank_in_region = $1, current_price = $2 WHERE id = $3',
        [rankInRegion, price, teamId]
      );

      logger.info(`Set team ${teamId} to rank ${rankInRegion} with price $${price}`);
      return { teamId, rankInRegion, price };
    } catch (error) {
      logger.error('Error setting team rank:', error);
      throw error;
    }
  }

  /**
   * Bulk set player ranks (for setting prices at season start)
   */
  async bulkSetPlayerRanks(playerRanks) {
    const results = [];
    for (const { playerId, rankInRole } of playerRanks) {
      try {
        const result = await this.setPlayerRank(playerId, rankInRole);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ success: false, playerId, error: error.message });
      }
    }
    return results;
  }

  /**
   * Bulk set team ranks
   */
  async bulkSetTeamRanks(teamRanks) {
    const results = [];
    for (const { teamId, rankInRegion } of teamRanks) {
      try {
        const result = await this.setTeamRank(teamId, rankInRegion);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ success: false, teamId, error: error.message });
      }
    }
    return results;
  }

  /**
   * Get available team slots for draft
   */
  async getAvailableTeamSlots(leagueId) {
    try {
      const result = await pool.query(
        `SELECT 
          t.id as team_id,
          t.name as team_name,
          t.region,
          r.id as role_id,
          r.name as role_name,
          r.short_name as role_short,
          p.id as primary_player_id,
          p.ign as primary_player_name,
          p.current_price
         FROM teams t
         CROSS JOIN roles r
         LEFT JOIN players p ON p.team_id = t.id AND p.role_id = r.id AND p.is_primary = true
         WHERE NOT EXISTS (
           SELECT 1 FROM roster_team_slots rts
           JOIN rosters ro ON ro.id = rts.roster_id
           WHERE rts.team_id = t.id AND rts.role_id = r.id AND ro.league_id = $1
         )
         AND p.id IS NOT NULL
         ORDER BY t.name, r.id`,
        [leagueId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting available team slots:', error);
      throw error;
    }
  }

  /**
   * Check if roster can afford a team slot
   */
  async canAffordSlot(rosterId, price, leagueId) {
    try {
      // Check if league has salary cap enabled
      const leagueResult = await pool.query(
        'SELECT salary_cap_enabled FROM leagues WHERE id = $1',
        [leagueId]
      );

      if (leagueResult.rows.length === 0) {
        throw new Error(`League ${leagueId} not found`);
      }

      if (!leagueResult.rows[0].salary_cap_enabled) {
        return { canAfford: true, reason: 'Salary cap disabled' };
      }

      // Get roster budget
      const rosterResult = await pool.query(
        'SELECT remaining_budget FROM rosters WHERE id = $1',
        [rosterId]
      );

      if (rosterResult.rows.length === 0) {
        throw new Error(`Roster ${rosterId} not found`);
      }

      const { remaining_budget } = rosterResult.rows[0];
      const canAfford = remaining_budget >= price;

      return {
        canAfford,
        remainingBudget: remaining_budget,
        priceRequired: price,
        budgetAfter: remaining_budget - price,
        reason: canAfford ? null : `Need $${price.toLocaleString()}, have $${remaining_budget.toLocaleString()}`
      };
    } catch (error) {
      logger.error('Error checking affordability:', error);
      throw error;
    }
  }

  /**
   * Get roster salary breakdown
   */
  async getRosterSalary(rosterId) {
    try {
      const rosterResult = await pool.query(
        'SELECT total_salary, remaining_budget FROM rosters WHERE id = $1',
        [rosterId]
      );

      if (rosterResult.rows.length === 0) {
        throw new Error(`Roster ${rosterId} not found`);
      }

      const { total_salary, remaining_budget } = rosterResult.rows[0];

      // Get team slots
      const slotsResult = await pool.query(
        `SELECT 
          rts.id,
          t.name as team_name,
          r.name as role_name,
          p.ign as primary_player_name,
          rts.acquisition_price
         FROM roster_team_slots rts
         JOIN teams t ON t.id = rts.team_id
         JOIN roles r ON r.id = rts.role_id
         LEFT JOIN players p ON p.id = rts.primary_player_id
         WHERE rts.roster_id = $1`,
        [rosterId]
      );

      // Get teams
      const teamsResult = await pool.query(
        `SELECT t.name, rt.acquisition_price
         FROM roster_teams rt
         JOIN teams t ON t.id = rt.team_id
         WHERE rt.roster_id = $1`,
        [rosterId]
      );

      return {
        rosterId,
        totalSalary: total_salary,
        remainingBudget: remaining_budget,
        startingBudget: STARTING_BUDGET,
        teamSlots: slotsResult.rows,
        teams: teamsResult.rows
      };
    } catch (error) {
      logger.error('Error getting roster salary:', error);
      throw error;
    }
  }

  /**
   * Get weekly points for a roster (shows which player scored for each slot)
   * @param {number} rosterId - Roster ID
   * @param {number} week - Week number (1, 2, 3, etc.)
   */
  async getWeeklyPoints(rosterId, week) {
    try {
      const result = await pool.query(
        `SELECT 
          rts.id as slot_id,
          t.name as team_name,
          r.name as role_name,
          p.ign as player_name,
          SUM(ps.fantasy_points) as points,
          COUNT(ps.id) as games_played
         FROM roster_team_slots rts
         JOIN teams t ON t.id = rts.team_id
         JOIN roles r ON r.id = rts.role_id
         JOIN players p ON p.team_id = rts.team_id AND p.role_id = rts.role_id
         LEFT JOIN player_stats ps ON ps.player_id = p.id
         LEFT JOIN matches m ON m.id = ps.match_id AND m.week = $2
         WHERE rts.roster_id = $1
         GROUP BY rts.id, t.name, r.name, p.ign
         ORDER BY r.id`,
        [rosterId, week]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting weekly points:', error);
      throw error;
    }
  }

  /**
   * Alternative: Get points for a roster for a date range 
   * (Use this if week numbers aren't populated yet)
   */
  async getPointsByDateRange(rosterId, startDate, endDate) {
    try {
      const result = await pool.query(
        `SELECT 
          rts.id as slot_id,
          t.name as team_name,
          r.name as role_name,
          p.ign as player_name,
          SUM(ps.fantasy_points) as points,
          COUNT(ps.id) as games_played
         FROM roster_team_slots rts
         JOIN teams t ON t.id = rts.team_id
         JOIN roles r ON r.id = rts.role_id
         JOIN players p ON p.team_id = rts.team_id AND p.role_id = rts.role_id
         LEFT JOIN player_stats ps ON ps.player_id = p.id
         LEFT JOIN matches m ON m.id = ps.match_id 
           AND m.match_date >= $2 
           AND m.match_date < $3
         WHERE rts.roster_id = $1
         GROUP BY rts.id, t.name, r.name, p.ign
         ORDER BY r.id`,
        [rosterId, startDate, endDate]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting points by date range:', error);
      throw error;
    }
  }
}

export default new SalaryCapService();
