import Fastify from 'fastify'
import { authPlugin } from './plugins/auth.js'
import { authRoutes } from './routes/auth.js'

export async function buildApp() {
  const app = Fastify({ logger: false })

  await app.register(authPlugin)
  await app.register(authRoutes, { prefix: '/api' })

  app.setErrorHandler((err, request, reply) => {
    if (err.appCode) {
      return reply.status(err.statusCode).send({ error: { code: err.appCode, message: err.message } })
    }
    // Fastify validation errors
    if (err.statusCode === 400) {
      return reply.status(400).send({ error: { code: 'INVALID_REQUEST', message: err.message } })
    }
    request.log.error(err)
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno.' } })
  })

  return app
}
