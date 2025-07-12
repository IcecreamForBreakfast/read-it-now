import { pgTable, text, serial, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  personalToken: text("personal_token").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const articles = pgTable("articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title").notNull(),
  domain: text("domain").notNull(),
  content: text("content"),
  tag: text("tag").notNull().default("untagged"),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const insertArticleSchema = createInsertSchema(articles).pick({
  url: true,
  title: true,
  domain: true,
  content: true,
  tag: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const magicLinkSchema = z.object({
  email: z.string().email(),
});

export const saveArticleSchema = z.object({
  url: z.string().min(1).refine((val) => {
    try {
      new URL(val);
      return true;
    } catch {
      // If it doesn't have a protocol, try adding https://
      try {
        new URL(`https://${val}`);
        return true;
      } catch {
        return false;
      }
    }
  }, { message: "Invalid URL format" }),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type User = typeof users.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type MagicLinkData = z.infer<typeof magicLinkSchema>;
export type SaveArticleData = z.infer<typeof saveArticleSchema>;
