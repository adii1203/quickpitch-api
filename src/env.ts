/* eslint-disable node/no-process-env */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "node:path";
import { z } from "zod";

expand(config({
  path: path.resolve(
    process.cwd(),
    process.env.NODE_ENV === "test" ? ".env.test" : ".env",
  ),
}));

const EvnSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(9999),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
  DATABASE_URL: z.url(),
});

type env = z.infer<typeof EvnSchema>;

// eslint-disable-next-line ts/no-redeclare
const { data: env, error } = EvnSchema.safeParse(process.env);

if (error) {
  console.warn("Invalid env:");

  console.warn(z.treeifyError(error).properties);

  process.exit(1);
}
export default env!;
