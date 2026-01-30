import cron from 'node-cron';
import leaguepediaService from '../services/leaguepedia.service.js';
import dataPipelineService from '../services/data-pipeline.service.js';
import logger from '../config/logger.js';
import { pool } from '../config/database.js';

/**
 * Continuous Game Poller
 *
 * Runs every 10 minutes to check for new completed games
 * No schedule required - just polls for games completed since last check
 */

let lastCheckTime = null;
let isProcessing = false;

/**
 * Process new completed games
 */
async function pollForNewGames() {
  if (isProcessing) {
    logger.info('Previous poll still in progress, skipping...');
    return;
  }

  isProcessing = true;

  try {
    logger.info('Starting continuous game poll...');

    // Get last check time from database or default to 24 hours ago
    if (!lastCheckTime) {
      const result = await pool.query(
        `SELECT MAX(created_at) as last_check FROM matches WHERE status = 'pending_validation'`
      );
      lastCheckTime = result.rows[0]?.last_check || new Date(Date.now() - 24 * 60 * 60 * 1000);
      logger.info(`Initialized last check time: ${lastCheckTime}`);
    }

    // Fetch games completed since last check
    const regions = ['LPL', 'LCS', 'LEC', 'LCK'];
    let totalGamesFound = 0;
    let totalGamesProcessed = 0;

    for (const region of regions) {
      try {
        logger.info(`Checking ${region} for new games since ${lastCheckTime}...`);

        const newGames = await leaguepediaService.fetchRecentGames(region, lastCheckTime);

        if (newGames && newGames.length > 0) {
          logger.info(`Found ${newGames.length} new ${region} games`);
          totalGamesFound += newGames.length;

          // Process each game
          for (let i = 0; i < newGames.length; i++) {
            const gameData = newGames[i];
            try {
              await dataPipelineService.processGame(gameData);
              totalGamesProcessed++;
              logger.info(`Processed ${region} game: ${gameData.blueTeam} vs ${gameData.redTeam}`);
              
              // Wait 3 seconds before next game (except after last game)
              if (i < newGames.length - 1) {
                logger.debug('Waiting 3 seconds before processing next game...');
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            } catch (error) {
              logger.error(`Failed to process ${region} game:`, {
                error: error.message,
                game: `${gameData.blueTeam} vs ${gameData.redTeam}`
              });
            }
          }
        } else {
          logger.debug(`No new ${region} games found`);
        }
        
        // Add delay between regions to avoid rate limiting (except after last region)
        if (region !== regions[regions.length - 1]) {
          logger.debug('Waiting 3 seconds before next region to avoid rate limiting...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        logger.error(`Error polling ${region}:`, { error: error.message });
      }
    }

    // Update last check time
    lastCheckTime = new Date();
    logger.info(`Poll complete: ${totalGamesProcessed}/${totalGamesFound} games processed successfully`);

  } catch (error) {
    logger.error('Error in continuous game poll:', { error: error.message, stack: error.stack });
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the continuous polling cron job
 * Runs every 10 minutes
 */
function startContinuousPoller() {
  // Run immediately on startup
  pollForNewGames();

  // Schedule to run every 10 minutes
  const job = cron.schedule('*/10 * * * *', pollForNewGames, {
    scheduled: true,
    timezone: 'UTC'
  });

  logger.info('Continuous game poller started (runs every 10 minutes)');
  return job;
}

/**
 * Stop the poller (for graceful shutdown)
 */
function stopContinuousPoller(job) {
  if (job) {
    job.stop();
    logger.info('Continuous game poller stopped');
  }
}

export default {
  startContinuousPoller,
  stopContinuousPoller,
  pollForNewGames // Export for manual testing
};
