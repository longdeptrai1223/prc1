import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase UID
  username: text("username"),
  email: text("email").notNull(),
  photoURL: text("photo_url"),
  displayName: text("display_name"),
  referralId: text("referral_id").notNull().unique(),
  referredBy: text("referred_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mining Stats table
export const miningStats = pgTable("mining_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  totalMined: doublePrecision("total_mined").notNull().default(0),
  currentRate: doublePrecision("current_rate").notNull().default(0.1),
  miningActive: boolean("mining_active").notNull().default(false),
  lastMined: timestamp("last_mined"),
  miningUntil: timestamp("mining_until"),
  adBoostActive: boolean("ad_boost_active").notNull().default(false),
  adBoostUntil: timestamp("ad_boost_until"),
  referralCount: integer("referral_count").notNull().default(0),
  referralMultiplier: doublePrecision("referral_multiplier").notNull().default(1.0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mining History table
export const miningHistory = pgTable("mining_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: doublePrecision("amount").notNull(),
  type: text("type").notNull(), // 'mining', 'referral'
  timestamp: timestamp("timestamp").defaultNow(),
});

// Notification Settings table
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  enabled: boolean("enabled").notNull().default(true),
  token: text("token"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMiningStatsSchema = createInsertSchema(miningStats).omit({ id: true, updatedAt: true });
export const insertMiningHistorySchema = createInsertSchema(miningHistory).omit({ id: true, timestamp: true });
export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({ id: true, updatedAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMiningStats = z.infer<typeof insertMiningStatsSchema>;
export type InsertMiningHistory = z.infer<typeof insertMiningHistorySchema>;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;

export type User = typeof users.$inferSelect;
export type MiningStats = typeof miningStats.$inferSelect;
export type MiningHistory = typeof miningHistory.$inferSelect;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
