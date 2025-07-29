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

// Renamed from articles to notes for unified concept
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  url: text("url"), // Optional - allows manual notes without URLs
  title: text("title").notNull(),
  domain: text("domain"), // Optional - only for URL-based notes
  content: text("content"),
  annotation: text("annotation"), // User-added notes/comments
  tag: text("tag").notNull().default("untagged"),
  state: text("state").notNull().default("inbox"), // inbox | saved | archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Keep articles table reference for backward compatibility during migration  
// This allows existing code to work while using the unified notes table
export const articles = notes;

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  url: true,
  title: true,
  domain: true,
  content: true,
  annotation: true,
  tag: true,
  state: true,
}).extend({
  title: z.string().optional(), // Make title optional for URL-based notes (will be extracted)
});

// Backward compatibility
export const insertArticleSchema = insertNoteSchema;

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
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type InsertArticle = InsertNote; // Backward compatibility
export type User = typeof users.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Article = Note; // Backward compatibility
export type LoginData = z.infer<typeof loginSchema>;
export type MagicLinkData = z.infer<typeof magicLinkSchema>;
export type SaveArticleData = z.infer<typeof saveArticleSchema>;
