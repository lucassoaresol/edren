/**
 * Vitest globalSetup — runs once in the main process before any workers start.
 *
 * Expects DATABASE_URL to already point at the test database (e.g. edren_test).
 * Creates that database if it does not exist, then runs migrations.
 * Teardown drops the database after all tests complete.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@localhost:5432/edren_test \
 *   JWT_SECRET=any-test-secret \
 *   npm test
 */

import pg from 'pg'

const { Client } = pg

function getDatabaseName(url) {
  return new URL(url).pathname.replace(/^\//, '')
}

function getAdminConnectionString(url) {
  const u = new URL(url)
  u.pathname = '/postgres'
  return u.toString()
}

export async function setup() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set before running tests.')
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set before running tests.')
  }

  const dbName = getDatabaseName(databaseUrl)

  if (dbName === 'edren' || dbName === 'postgres' || dbName === 'template1') {
    throw new Error(
      `Refusing to run tests against database "${dbName}". ` +
        'Set DATABASE_URL to a dedicated test database (e.g. edren_test).',
    )
  }

  // Create the test database if it does not exist
  const adminClient = new Client({ connectionString: getAdminConnectionString(databaseUrl) })
  await adminClient.connect()

  const existing = await adminClient.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  )

  if (existing.rowCount === 0) {
    // Identifiers cannot be parameterized — dbName is validated above
    await adminClient.query(`CREATE DATABASE "${dbName}"`)
  }

  await adminClient.end()

  // Run migrations against the test database
  const { runMigrations } = await import('../src/db/migrate.js')
  await runMigrations()
}

export async function teardown() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    // setup() already threw — nothing was created, nothing to tear down
    return
  }

  const dbName = getDatabaseName(databaseUrl)

  const { closePool } = await import('../src/db/connection.js')
  await closePool()

  const adminClient = new Client({ connectionString: getAdminConnectionString(databaseUrl) })
  await adminClient.connect()
  await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`)
  await adminClient.end()
}
