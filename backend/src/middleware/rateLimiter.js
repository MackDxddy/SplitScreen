import rateLimit from 'express-rate-limit'
import logger from '../config/logger.js'

// General API rate limiter (100 requests per minute per spec)
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: 60
    }
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`)
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    })
  }
})

// Authentication rate limiter (5 attempts per 15 minutes to prevent brute force)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: 900 // 15 minutes in seconds
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`)
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        timestamp: new Date().toISOString(),
        path: req.path
      }
    })
  }
})

// Draft action rate limiter (60 requests per minute during draft)
export const draftRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 60,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many draft actions, please slow down.',
      retryAfter: 60
    }
  },
  standardHeaders: true,
  legacyHeaders: false
})
