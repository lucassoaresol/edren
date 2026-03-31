import bcrypt from 'bcrypt'
import { getPool } from '../src/db/connection.js'
import { buildApp } from '../src/app.js'

export async function createTestApp() {
  const app = await buildApp()
  return app
}

export async function createUser({ username, password, display_name, role, is_active = true }) {
  const pool = getPool()
  const password_hash = await bcrypt.hash(password, 10)
  const result = await pool.query(
    `INSERT INTO users (username, password_hash, display_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, display_name, role, is_active`,
    [username, password_hash, display_name, role, is_active],
  )
  return result.rows[0]
}

export async function truncateUsers() {
  const pool = getPool()
  await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE')
}
