import { buildApp } from './app.js'
import { PORT } from './config/env.js'

const app = await buildApp()

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`EDREN API listening on port ${PORT}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}
