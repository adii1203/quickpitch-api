import type { User } from "better-auth";
import type { Hono, MiddlewareHandler } from "hono";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Logger } from "pino";

interface Bindings {
  incoming: IncomingMessage;
  outgoing: ServerResponse<IncomingMessage>;
}

interface Variables {
  logger: Logger<never, boolean>;
  user: User;
}

export interface AppBindings {
  Variables: Variables;
  Bindings: Bindings;
}

export interface SqsTask {
  objectKey: string;
  pitchId: string;
}

export type AppHono = Hono<AppBindings>;

export type AppMiddleware = MiddlewareHandler<AppBindings>;
