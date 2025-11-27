import { Hono } from "hono";
import { cors } from "hono/cors";

import { auth } from "@/lib/auth.ts";

export const authRoutes = new Hono();

authRoutes.use(
  "/*",
  cors({
    origin: "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    credentials: true,
    maxAge: 600,
  }),
);

authRoutes.on(["POST", "GET"], "/*", c => auth.handler(c.req.raw));
