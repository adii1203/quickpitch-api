import { Hono } from "hono";
import { requestId } from "hono/request-id";

import type { AppBindings } from "@/lib/types.js";

import pinoLogger from "@/middleware/pino-logger.js";

import { auth } from "./lib/auth.ts";

const app = new Hono<AppBindings>();

app.use(requestId());

app.use(pinoLogger);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

export default app;
