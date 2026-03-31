import pg from 'pg'

const { Pool } = pg

let pool

export function getPool() {
  if (!pool) {
    // Read at call time so tests can override DATABASE_URL before first use
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    pool = new Pool({ connectionString: url })
  }
  return pool
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
