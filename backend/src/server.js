import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import * as Sentry from '@sentry/node'

// Import configurations
import { pool } from './config/database.js'
import logger from './config/logger.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { rateLimiter, authRateLimiter } from './middleware/rateLimiter.js'

// Import cron jobs
import continuousGamePoller from './jobs/continuous-game-poller.job.js'

// Import routes (to be created in Phase 2)
// import authRoutes from './routes/auth.routes.js'
// import leagueRoutes from './routes/league.routes.js'
// import draftRoutes from './routes/draft.routes.js'
// import tradeRoutes from './routes/trade.routes.js'
// import playerRoutes from './routes/player.routes.js'

// Load environment variables
dotenv.config()

// Initialize Express
const app = express()
const httpServer = createServer(app)

// Initialize Socket.io for real-time features
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
})

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  })
  app.use(Sentry.Handlers.requestHandler())
  app.use(Sentry.Handlers.tracingHandler())
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }))
}

// Rate limiting
app.use('/api/v1/', rateLimiter)

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const result = await pool.query('SELECT NOW()')
    
    res.json({
      status: 'healthy',
      timestamp: result.rows[0].now,
      environment: process.env.NODE_ENV,
      version: '1.0.0'
    })
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed'
    })
  }
})

// API Routes (will be uncommented as we build them)
// app.use('/api/v1/auth', authRateLimiter, authRoutes)
// app.use('/api/v1/leagues', leagueRoutes)
// app.use('/api/v1/draft', draftRoutes)
// app.use('/api/v1/trades', tradeRoutes)
// app.use('/api/v1/players', playerRoutes)

// Welcome endpoint
app.get('/api/v1/', (req, res) => {
  res.json({
    message: 'SplitScreen Fantasy League API v1.0',
    documentation: '/api/v1/docs',
    status: 'operational'
  })
})

// Socket.io connection (draft and live scoring will use this)
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`)
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

// Make io accessible to routes
app.set('io', io)

// Error handling
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler())
}
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
const PORT = process.env.PORT || 5000

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`)
  logger.info(`📱 Environment: ${process.env.NODE_ENV}`)
  logger.info(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`)
  logger.info(`🔌 WebSocket: Ready for real-time connections`)
  
  // Start continuous game poller
  logger.info('⏰ Starting continuous game poller...')
  const pollerJob = continuousGamePoller.startContinuousPoller()
  logger.info('✅ Continuous game poller started: Every 10 minutes')
  
  // Store job reference for graceful shutdown
  app.set('pollerJob', pollerJob)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server')
  logger.info('Stopping continuous game poller...')
  const pollerJob = app.get('pollerJob')
  if (pollerJob) {
    continuousGamePoller.stopContinuousPoller(pollerJob)
  }
  httpServer.close(() => {
    logger.info('HTTP server closed')
    pool.end()
    process.exit(0)
  })
})

export { app, io }
