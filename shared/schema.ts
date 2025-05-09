import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase UID
  username: text("username").default(''),
  email: text("email").notNull(),
  photoURL: text("photo_url").default(''),
  displayName: text("display_name").default(''),
  referralId: text("referral_id").notNull().unique(),
  referredBy: text("referred_by").default(''),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Mining History table
export const miningHistory = pgTable("mining_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: doublePrecision("amount").notNull(),
  type: text("type").notNull(), // 'mining', 'referral'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Notification Settings table
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  enabled: boolean("enabled").notNull().default(true),
  token: text("token").default(''),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI Chat Messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  conversationId: text("conversation_id").notNull(), // Group messages by conversation
});

// AI Chat Conversations table
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas with better handling of optional and nullable fields
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
  displayName: z.string().nullable(),
  referredBy: z.string().nullable(),
}).omit({ id: true, createdAt: true });

export const insertMiningStatsSchema = createInsertSchema(miningStats, {
  lastMined: z.date().nullable(),
  miningUntil: z.date().nullable(),
  adBoostUntil: z.date().nullable(),
}).omit({ id: true, updatedAt: true });

export const insertMiningHistorySchema = createInsertSchema(miningHistory).omit({ id: true, timestamp: true });

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings, {
  token: z.string().nullable(),
}).omit({ id: true, updatedAt: true });

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, timestamp: true });
export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMiningStats = z.infer<typeof insertMiningStatsSchema>;
export type InsertMiningHistory = z.infer<typeof insertMiningHistorySchema>;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;

export type User = typeof users.$inferSelect;
export type MiningStats = typeof miningStats.$inferSelect;
export type MiningHistory = typeof miningHistory.$inferSelect;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatConversation = typeof chatConversations.$inferSelect;
