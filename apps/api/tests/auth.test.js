import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { createTestApp, createUser, truncateUsers } from './helpers.js'
import { getPool } from '../src/db/connection.js'

let app

beforeAll(async () => {
  app = await createTestApp()
})

afterAll(async () => {
  await app?.close()
})

beforeEach(async () => {
  await truncateUsers()
})

describe('POST /api/auth/login', () => {
  it('returns token and user for valid ADMIN credentials', async () => {
    await createUser({ username: 'admin', password: 'secret123', display_name: 'Admin', role: 'ADMIN' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'secret123' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.token).toBeTruthy()
    expect(body.expires_in_hours).toBe(12)
    expect(body.user.username).toBe('admin')
    expect(body.user.role).toBe('ADMIN')
    expect(body.user).not.toHaveProperty('password_hash')
  })

  it('returns token and user for valid OPERATOR credentials', async () => {
    await createUser({ username: 'operator1', password: 'pass456', display_name: 'Operador', role: 'OPERATOR' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'operator1', password: 'pass456' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user.role).toBe('OPERATOR')
  })

  it('returns 401 for wrong password', async () => {
    await createUser({ username: 'admin', password: 'secret123', display_name: 'Admin', role: 'ADMIN' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'wrong' },
    })

    expect(res.statusCode).toBe(401)
    const body = res.json()
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 401 for nonexistent username (same shape as wrong password)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'nobody', password: 'whatever' },
    })

    expect(res.statusCode).toBe(401)
    const body = res.json()
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 401 for inactive user', async () => {
    await createUser({ username: 'inactive', password: 'pass123', display_name: 'Inativo', role: 'OPERATOR', is_active: false })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'inactive', password: 'pass123' },
    })

    expect(res.statusCode).toBe(401)
    const body = res.json()
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('is case-insensitive for username (normalized lookup)', async () => {
    await createUser({ username: 'Admin', password: 'secret123', display_name: 'Admin', role: 'ADMIN' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'ADMIN', password: 'secret123' },
    })

    expect(res.statusCode).toBe(200)
  })
})

describe('GET /api/auth/me', () => {
  it('returns user data for valid token', async () => {
    const user = await createUser({ username: 'admin', password: 'secret', display_name: 'Admin', role: 'ADMIN' })

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'secret' },
    })
    const { token } = loginRes.json()

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(user.id)
    expect(body.username).toBe('admin')
    expect(body.role).toBe('ADMIN')
    expect(body.display_name).toBe('Admin')
  })

  it('does not leak password_hash in /me response', async () => {
    await createUser({ username: 'admin', password: 'secret', display_name: 'Admin', role: 'ADMIN' })

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'secret' },
    })
    const { token } = loginRes.json()

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })

    const body = res.json()
    expect(body).not.toHaveProperty('password_hash')
    expect(Object.keys(body).sort()).toEqual(['display_name', 'id', 'role', 'username'])
  })

  it('returns 401 with no token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: 'Bearer not-a-real-token' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when user is deactivated after token was issued', async () => {
    await createUser({ username: 'willbedeactivated', password: 'pass', display_name: 'Test', role: 'OPERATOR' })

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'willbedeactivated', password: 'pass' },
    })
    const { token } = loginRes.json()

    // Deactivate user directly in DB
    const pool = getPool()
    await pool.query("UPDATE users SET is_active = false WHERE UPPER(BTRIM(username)) = UPPER(BTRIM($1))", ['willbedeactivated'])

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(401)
  })
})
