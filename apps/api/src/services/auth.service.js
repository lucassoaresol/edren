import bcrypt from 'bcrypt'
import { getPool } from '../db/connection.js'

export async function authenticateUser(username, password) {
  const pool = getPool()

  const result = await pool.query(
    `SELECT id, username, password_hash, display_name, role, is_active
     FROM users
     WHERE UPPER(BTRIM(username)) = UPPER(BTRIM($1))`,
    [username],
  )

  const user = result.rows[0]

  if (!user || !user.is_active) {
    // Run bcrypt compare anyway to prevent timing attacks
    await bcrypt.compare(password, '$2b$10$invalidhashpadding000000000000000000000000000000000000')
    return null
  }

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) return null

  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
  }
}
