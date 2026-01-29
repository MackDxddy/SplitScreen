import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

// PostgreSQL connection configuration
// Railway automatically provides DATABASE_URL in production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Required for Railway and most cloud providers
  } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
})

// Test database connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully')
})

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err)
  process.exit(-1)
})

// Helper function to execute queries
export const query = async (text, params) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Executed query', { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

// Helper function for transactions
export const transaction = async (callback) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export { pool }
