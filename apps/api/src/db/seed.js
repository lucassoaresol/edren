import bcrypt from 'bcrypt'
import { getPool, closePool } from './connection.js'

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
  display_name: 'Administrador',
  role: 'ADMIN',
}

async function seed() {
  const pool = getPool()

  const existing = await pool.query(
    "SELECT id FROM users WHERE UPPER(BTRIM(username)) = UPPER(BTRIM($1))",
    [DEFAULT_ADMIN.username],
  )

  if (existing.rows.length > 0) {
    console.log(`User "${DEFAULT_ADMIN.username}" already exists. Skipping seed.`)
    return
  }

  const password_hash = await bcrypt.hash(DEFAULT_ADMIN.password, 10)

  await pool.query(
    `INSERT INTO users (username, password_hash, display_name, role)
     VALUES ($1, $2, $3, $4)`,
    [DEFAULT_ADMIN.username, password_hash, DEFAULT_ADMIN.display_name, DEFAULT_ADMIN.role],
  )

  console.log(`Created admin user: ${DEFAULT_ADMIN.username} / ${DEFAULT_ADMIN.password}`)
  console.log('Change the password after first login.')
}

seed()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
