import logger from '../config/logger.js'

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true // Distinguish operational errors from programming errors
    Error.captureStackTrace(this, this.constructor)
  }
}

// Not found handler (404)
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route not found: ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  )
  next(error)
}

// Global error handler
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500
  let errorCode = err.code || 'INTERNAL_ERROR'
  let message = err.message || 'Internal server error'
  let details = []

  // Handle specific error types
  
  // Validation errors (from express-validator)
  if (err.errors && Array.isArray(err.errors)) {
    statusCode = 400
    errorCode = 'VALIDATION_ERROR'
    message = 'Invalid input data'
    details = err.errors.map(e => ({
      field: e.path || e.param,
      message: e.msg
    }))
  }

  // PostgreSQL errors
  if (err.code && err.code.startsWith('23')) {
    statusCode = 409
    errorCode = 'CONFLICT'
    
    if (err.code === '23505') {
      // Unique violation
      const field = err.constraint?.replace(/_/g, ' ') || 'field'
      message = `${field} already exists`
    } else if (err.code === '23503') {
      // Foreign key violation
      message = 'Referenced resource does not exist'
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    errorCode = 'UNAUTHORIZED'
    message = 'Invalid authentication token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    errorCode = 'UNAUTHORIZED'
    message = 'Authentication token has expired'
  }

  // Log error
  const errorLog = {
    code: errorCode,
    message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  }

  if (statusCode >= 500) {
    logger.error('Server error:', { ...errorLog, stack: err.stack })
  } else {
    logger.warn('Client error:', errorLog)
  }

  // Standard error response format per Technical Clarifications Section 3.2
  const errorResponse = {
    error: {
      code: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: req.path
    }
  }

  // Add details if present (validation errors)
  if (details.length > 0) {
    errorResponse.error.details = details
  }

  // Don't expose stack traces in production
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack
  }

  res.status(statusCode).json(errorResponse)
}

// Async handler wrapper (eliminates need for try-catch in every route)
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
