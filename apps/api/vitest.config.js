import { defineConfig } from 'vitest/config'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadDotEnv() {
  try {
    const lines = readFileSync(resolve(__dirname, '.env'), 'utf8').split('\n')
    const env = {}
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
    return env
  } catch {
    return {}
  }
}

function toTestDbUrl(url) {
  if (!url) return undefined
  const u = new URL(url)
  const dbName = u.pathname.replace(/^\//, '')
  u.pathname = `/${dbName}_test`
  return u.toString()
}

const fileEnv = loadDotEnv()

const testDbUrl = process.env.DATABASE_URL ?? toTestDbUrl(fileEnv.DATABASE_URL)
const jwtSecret = process.env.JWT_SECRET ?? fileEnv.JWT_SECRET ?? 'test-secret'

// Set for globalSetup (runs in main process, not affected by test.env)
process.env.DATABASE_URL = testDbUrl
process.env.JWT_SECRET = jwtSecret
process.env.NODE_ENV = 'test'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    globalSetup: './tests/setup.js',
    pool: 'forks',
    environment: 'node',
    testTimeout: 15000,
    env: {
      DATABASE_URL: testDbUrl,
      JWT_SECRET: jwtSecret,
      NODE_ENV: 'test',
    },
  },
})
