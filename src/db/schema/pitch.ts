import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.ts";

export const pitch = pgTable("pitch", {
  id: text("id").primaryKey(),

  user_id: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  name: text("name").notNull(),

  resume_url: text("resume_url"),
  video_url: text("video_url"),

  status: text("status"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
