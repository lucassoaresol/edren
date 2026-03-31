import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { JWT_SECRET } from '../config/env.js'
import { getPool } from '../db/connection.js'
import { errorResponse } from '../utils/errors.js'

async function authPluginFn(app) {
  await app.register(fastifyJwt, {
    secret: JWT_SECRET,
  })

  app.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send(errorResponse('UNAUTHORIZED', 'Não autorizado.'))
    }

    const pool = getPool()
    const result = await pool.query(
      'SELECT id, role, is_active FROM users WHERE id = $1',
      [request.user.sub],
    )
    const user = result.rows[0]

    if (!user || !user.is_active) {
      return reply.status(401).send(errorResponse('UNAUTHORIZED', 'Não autorizado.'))
    }

    request.user = { id: user.id, role: user.role }
  })
}

export const authPlugin = fp(authPluginFn)
