import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, notes, articles, type User, type Note, type Article, type InsertUser, type InsertNote, type InsertArticle } from "@shared/schema";
import { eq, desc, and, count } from "drizzle-orm";
import crypto from "crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString);
const db = drizzle(client);

export interface IStorage {
  // User operations
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  generatePersonalToken(userId: string): Promise<string>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  
  // Note operations (unified concept)
  getNotesByUserId(userId: string, tag?: string, state?: string): Promise<Note[]>;
  getNoteById(id: string): Promise<Note | undefined>;
  createNote(note: InsertNote & { userId: string }): Promise<Note>;
  deleteNote(id: string, userId: string): Promise<boolean>;
  updateNoteTag(id: string, userId: string, tag: string): Promise<Note | undefined>;
  updateNoteState(id: string, userId: string, state: string): Promise<Note | undefined>;
  updateNoteAnnotation(id: string, userId: string, annotation: string): Promise<Note | undefined>;
  
  // Article operations (backward compatibility - DEPRECATED, use Note operations)
  getArticlesByUserId(userId: string, tag?: string): Promise<Article[]>;
  getArticleById(id: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle & { userId: string }): Promise<Article>;
  deleteArticle(id: string, userId: string): Promise<boolean>;
  updateArticleTag(id: string, userId: string, tag: string): Promise<Article | undefined>;
  
  // Tag operations
  getTagsByUserId(userId: string): Promise<string[]>;
  createCustomTag(userId: string, tagName: string): Promise<boolean>;
  renameTag(userId: string, oldTag: string, newTag: string): Promise<boolean>;
  deleteTag(userId: string, tagName: string): Promise<boolean>;
  getTagUsageStats(userId: string): Promise<{ tag: string; count: number }[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByToken(token: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.personalToken, token)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async generatePersonalToken(userId: string): Promise<string> {
    // Generate a secure random token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => 
      byte.toString(16).padStart(2, '0')
    ).join('');
    
    await db.update(users)
      .set({ personalToken: token })
      .where(eq(users.id, userId));
    
    return token;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async getArticlesByUserId(userId: string, tag?: string): Promise<Article[]> {
    // Use the notes table but return Article format for backward compatibility
    const conditions = [eq(notes.userId, userId)];
    
    if (tag && tag !== "all") {
      conditions.push(eq(notes.tag, tag));
    }
    
    const result = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.createdAt)); // Use createdAt instead of savedAt
    
    // Map Note fields to Article format for compatibility
    return result.map(note => ({
      ...note,
      savedAt: note.createdAt // Map createdAt to savedAt for backward compatibility
    })) as Article[];
  }

  async getArticleById(id: string): Promise<Article | undefined> {
    const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    // Map Note to Article format for backward compatibility
    return {
      ...result[0],
      savedAt: result[0].createdAt
    } as Article;
  }

  async createArticle(article: InsertArticle & { userId: string }): Promise<Article> {
    // Create via notes table but return Article format
    const result = await db.insert(notes).values({
      ...article,
      title: article.title || 'Untitled Article', // Ensure title is provided
      state: 'saved' // Articles created via old API go to saved state
    }).returning();
    
    return {
      ...result[0],
      savedAt: result[0].createdAt
    } as Article;
  }

  async deleteArticle(id: string, userId: string): Promise<boolean> {
    // Route to notes table for unified storage
    return this.deleteNote(id, userId);
  }

  async updateArticleTag(id: string, userId: string, tag: string): Promise<Article | undefined> {
    // Route to notes table and return Article format
    const note = await this.updateNoteTag(id, userId, tag);
    if (!note) return undefined;
    
    return {
      ...note,
      savedAt: note.createdAt
    } as Article;
  }

  // New Note operations (unified concept)
  async getNotesByUserId(userId: string, tag?: string, state?: string): Promise<Note[]> {
    let query = db.select().from(notes).where(eq(notes.userId, userId));
    
    const conditions = [eq(notes.userId, userId)];
    
    if (tag && tag !== "all") {
      conditions.push(eq(notes.tag, tag));
    }
    
    if (state && state !== "all") {
      conditions.push(eq(notes.state, state));
    }
    
    const result = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.createdAt));
    
    return result;
  }

  async getNoteById(id: string): Promise<Note | undefined> {
    const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    return result[0];
  }

  async createNote(note: InsertNote & { userId: string }): Promise<Note> {
    const result = await db.insert(notes).values({
      ...note,
      title: note.title || 'Untitled Note' // Ensure title is provided
    }).returning();
    return result[0];
  }

  async deleteNote(id: string, userId: string): Promise<boolean> {
    const existingNote = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);
    
    if (existingNote.length === 0) {
      return false;
    }
    
    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
    return true;
  }

  async updateNoteTag(id: string, userId: string, tag: string): Promise<Note | undefined> {
    const result = await db
      .update(notes)
      .set({ tag, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    return result[0];
  }

  async updateNoteState(id: string, userId: string, state: string): Promise<Note | undefined> {
    const result = await db
      .update(notes)
      .set({ state, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    return result[0];
  }

  async updateNoteAnnotation(id: string, userId: string, annotation: string): Promise<Note | undefined> {
    const result = await db
      .update(notes)
      .set({ annotation, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    return result[0];
  }

  async getTagsByUserId(userId: string): Promise<string[]> {
    const result = await db
      .selectDistinct({ tag: notes.tag })
      .from(notes)
      .where(eq(notes.userId, userId));
    return result.map(r => r.tag);
  }

  async createCustomTag(userId: string, tagName: string): Promise<boolean> {
    // Tags are created implicitly when used, so we don't need to store them separately
    // This is a no-op since tags are created when articles use them
    return true;
  }

  async renameTag(userId: string, oldTag: string, newTag: string): Promise<boolean> {
    try {
      await db
        .update(notes)
        .set({ tag: newTag, updatedAt: new Date() })
        .where(and(eq(notes.userId, userId), eq(notes.tag, oldTag)));
      return true;
    } catch {
      return false;
    }
  }

  async deleteTag(userId: string, tagName: string): Promise<boolean> {
    try {
      // Set articles with this tag to "untagged"
      await db
        .update(notes)
        .set({ tag: "untagged", updatedAt: new Date() })
        .where(and(eq(notes.userId, userId), eq(notes.tag, tagName)));
      return true;
    } catch {
      return false;
    }
  }

  async getTagUsageStats(userId: string): Promise<{ tag: string; count: number }[]> {
    const result = await db
      .select({ 
        tag: notes.tag, 
        count: count(notes.id)
      })
      .from(notes)
      .where(eq(notes.userId, userId))
      .groupBy(notes.tag);
    
    return result.map(r => ({ tag: r.tag, count: Number(r.count) }));
  }
}

export const storage = new DatabaseStorage();
