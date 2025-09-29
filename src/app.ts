import type { AppBindings } from '@/lib/types.js'
import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import pinoLogger from '@/middleware/pino-logger.js'

const app = new Hono<AppBindings>()

app.use(requestId())
app.use(pinoLogger)
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
