import pino from "pino";
import { pinoHttp } from "pino-http";

import type { AppMiddleware } from "@/lib/types.js";

import env from "@/env.js";

const pinoLogger: AppMiddleware = async (c, next) => {
  c.env.incoming.id = c.var.requestId;

  await new Promise<void>(resolve => pinoHttp({
    logger: pino({
      level: env.LOG_LEVEL,
      transport: {
        target: "pino-pretty",
      },
    }),
  })(c.env.incoming, c.env.outgoing, () => resolve()));

  c.set("logger", c.env.incoming.log);

  await next();
};

export default pinoLogger;
