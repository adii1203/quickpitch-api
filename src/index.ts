import { serve } from "@hono/node-server";

import env from "@/env.js";

import app from "./app.js";

serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  console.warn(`Server is running on http://localhost:${info.port}`);
});
