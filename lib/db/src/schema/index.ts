import { jsonb, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userSyncDataTable = pgTable("user_sync_data", {
  userId: text("user_id").primaryKey(),
  revision: integer("revision").notNull().default(0),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserSyncData = typeof userSyncDataTable.$inferSelect;