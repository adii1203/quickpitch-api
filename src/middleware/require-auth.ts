/* eslint-disable no-console */
import type { MiddlewareHandler } from "hono";

import { auth } from "@/lib/auth.ts";

export const requireAuth: MiddlewareHandler = async (c, next) => {
  try {
    const session = await auth.api.getSession(c.req.raw);

    if (!session) {
      return c.json({
        error: "Unauthorized",
      }, 401);
    }

    c.set("user", session.user);
    c.set("session", session.session);

    await next();
  }
  catch (err) {
    console.log(err);

    return c.json({ error: "Unauthorized" }, 401);
  }
};
