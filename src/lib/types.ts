import type { Hono, MiddlewareHandler } from "hono";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Logger } from "pino";

interface Bindings {
  incoming: IncomingMessage;
  outgoing: ServerResponse<IncomingMessage>;
}

interface Variables {
  logger: Logger<never, boolean>;
}

export interface AppBindings {
  Variables: Variables;
  Bindings: Bindings;
}

export type AppHono = Hono<AppBindings>;

export type AppMiddleware = MiddlewareHandler<AppBindings>;
