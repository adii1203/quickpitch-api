import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";

import db from "@/db/index.ts";
import * as schema from "@/db/schema/index.ts";
import env from "@/env.ts";

export const auth = betterAuth({
  trustedOrigins: ["http://localhost:5173"],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  socialProviders: {
    github: {
      clientSecret: env.GITHUB_CLIENT_SECRET,
      clientId: env.GITHUB_CLIENT_ID,
    },
  },
  plugins: [openAPI()],
});
