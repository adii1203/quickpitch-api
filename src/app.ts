import type { WebhookRequiredHeaders } from "svix";

import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { Webhook } from "svix";

import type { AppBindings, SqsTask } from "@/lib/types.js";

import pinoLogger from "@/middleware/pino-logger.js";

import db from "./db/index.ts";
import { pitch } from "./db/schema/pitch.ts";
import { authRoutes } from "./routes/auth.ts";
import { pitchRoutes } from "./routes/pitch.ts";

const app = new Hono<AppBindings>();

app.use(requestId());

app.use(pinoLogger);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/webhook", async (c) => {
  const payload = await c.req.text();

  const headers: WebhookRequiredHeaders = {
    "svix-id": c.req.header("svix-id")!,
    "svix-signature": c.req.header("svix-signature")!,
    "svix-timestamp": c.req.header("svix-timestamp")!,
  };

  const wh = new Webhook("whsec_0xbBKpV/Oqseo3sZ6Wrm2exO1yIcFmO2");

  try {
    const evt = wh.verify(payload, headers) as SqsTask;
    if (!evt.pitchId || !evt.objectKey) {
      return c.status(402);
    }

    await db.update(pitch).set({ status: "success" }).where(eq(pitch.id, evt.pitchId));

    return c.json({ status: "ok" }, 200);
  }
  catch (error) {
    const _ = error;
    const loggger = c.get("logger");
    loggger.error("Failed to update status with webhook.");
    return c.status(500);
  }
});

app.route("/api/auth", authRoutes);
app.route("/api/pitch", pitchRoutes);

export default app;
