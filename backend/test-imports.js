// Test if modules load correctly
import logger from './src/config/logger.js';
import { pool } from './src/config/database.js';

console.log('✅ Logger loaded');
console.log('✅ Database pool loaded');

try {
  const leaguepediaService = await import('./src/services/leaguepedia.service.js');
  console.log('✅ Leaguepedia service loaded');
} catch (error) {
  console.error('❌ Leaguepedia service failed:', error.message);
  console.error(error.stack);
}

try {
  const dataPipelineService = await import('./src/services/data-pipeline.service.js');
  console.log('✅ Data pipeline service loaded');
} catch (error) {
  console.error('❌ Data pipeline service failed:', error.message);
  console.error(error.stack);
}

try {
  const poller = await import('./src/jobs/continuous-game-poller.job.js');
  console.log('✅ Continuous game poller loaded');
} catch (error) {
  console.error('❌ Continuous game poller failed:', error.message);
  console.error(error.stack);
}

console.log('\n✅ All modules loaded successfully!');
process.exit(0);
