import { authenticateUser } from '../services/auth.service.js'
import { getPool } from '../db/connection.js'
import { errorResponse } from '../utils/errors.js'

export async function authRoutes(app) {
  app.post('/auth/login', async (request, reply) => {
    const { username, password } = request.body ?? {}

    if (!username || !password) {
      return reply.status(400).send(errorResponse('INVALID_REQUEST', 'Usuário e senha são obrigatórios.'))
    }

    const user = await authenticateUser(username, password)

    if (!user) {
      return reply.status(401).send(errorResponse('INVALID_CREDENTIALS', 'Usuário ou senha inválidos.'))
    }

    const token = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: '12h' })

    return reply.status(200).send({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        display_name: user.display_name,
      },
      token,
      expires_in_hours: 12,
    })
  })

  app.get(
    '/auth/me',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const pool = getPool()
      const result = await pool.query(
        'SELECT id, username, role, display_name FROM users WHERE id = $1',
        [request.user.id],
      )

      const user = result.rows[0]
      if (!user) {
        return reply.status(401).send(errorResponse('UNAUTHORIZED', 'Não autorizado.'))
      }

      return reply.status(200).send({
        id: user.id,
        username: user.username,
        role: user.role,
        display_name: user.display_name,
      })
    },
  )
}
