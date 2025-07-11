import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, articles, type User, type Article, type InsertUser, type InsertArticle } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

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
  createUser(user: InsertUser): Promise<User>;
  
  // Article operations
  getArticlesByUserId(userId: string, tag?: string): Promise<Article[]>;
  getArticleById(id: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle & { userId: string }): Promise<Article>;
  deleteArticle(id: string, userId: string): Promise<boolean>;
  updateArticleTag(id: string, userId: string, tag: string): Promise<Article | undefined>;
  
  // Tag operations
  getTagsByUserId(userId: string): Promise<string[]>;
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

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getArticlesByUserId(userId: string, tag?: string): Promise<Article[]> {
    let query = db.select().from(articles).where(eq(articles.userId, userId));
    
    if (tag && tag !== "all") {
      query = query.where(and(eq(articles.userId, userId), eq(articles.tag, tag)));
    }
    
    const result = await query.orderBy(desc(articles.savedAt));
    return result;
  }

  async getArticleById(id: string): Promise<Article | undefined> {
    const result = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    return result[0];
  }

  async createArticle(article: InsertArticle & { userId: string }): Promise<Article> {
    const result = await db.insert(articles).values(article).returning();
    return result[0];
  }

  async deleteArticle(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(articles).where(and(eq(articles.id, id), eq(articles.userId, userId)));
    return result.rowCount > 0;
  }

  async updateArticleTag(id: string, userId: string, tag: string): Promise<Article | undefined> {
    const result = await db
      .update(articles)
      .set({ tag })
      .where(and(eq(articles.id, id), eq(articles.userId, userId)))
      .returning();
    return result[0];
  }

  async getTagsByUserId(userId: string): Promise<string[]> {
    const result = await db
      .selectDistinct({ tag: articles.tag })
      .from(articles)
      .where(eq(articles.userId, userId));
    return result.map(r => r.tag);
  }
}

export const storage = new DatabaseStorage();
