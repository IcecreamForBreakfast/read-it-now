import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, magicLinkSchema, saveArticleSchema, type User } from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { neon } from "@neondatabase/serverless";
import { extractArticleContent, extractDomain } from "./lib/article-parser";

const PgSession = connectPgSimple(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  const sql = neon(process.env.DATABASE_URL!);
  
  app.use(session({
    store: new PgSession({
      pool: sql as any,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }));

  // Authentication middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      // Check session authentication first
      if (req.session?.userId) {
        req.userId = req.session.userId;
        return next();
      }
      
      // Check API key auth as fallback
      const apiKey = req.headers.authorization?.replace('Bearer ', '');
      if (apiKey) {
        try {
          const user = await storage.getUserByApiKey(apiKey);
          if (user) {
            req.userId = user.id;
            return next();
          }
        } catch (error) {
          console.error('API key authentication error:', error);
        }
      }
      
      return res.status(401).json({ message: "Authentication required" });
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ message: "Authentication error" });
    }
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        email: userData.email,
        password: hashedPassword,
      });

      // Set session
      req.session.userId = user.id;
      
      res.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      
      res.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Login failed" });
    }
  });

  app.post("/api/auth/magic-link", async (req, res) => {
    try {
      const { email } = magicLinkSchema.parse(req.body);
      
      // For MVP, we'll just return success
      // In production, you'd send an actual email with a magic link
      res.json({ message: "Magic link sent to your email" });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send magic link" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUserById(userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json({ user: { id: user.id, email: user.email, apiKey: user.apiKey } });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Article routes
  app.get("/api/articles", requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const tag = req.query.tag as string;
      const articles = await storage.getArticlesByUserId(userId!, tag);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.post("/api/articles", requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { url, tag } = saveArticleSchema.parse(req.body);
      
      try {
        const { title, content } = await extractArticleContent(url);
        const domain = extractDomain(url);
        
        const article = await storage.createArticle({
          userId: userId!,
          url,
          title,
          content,
          domain,
          tag: tag || null,
        });
        
        res.json(article);
      } catch (parseError) {
        // If content extraction fails, save with basic info
        const domain = extractDomain(url);
        const article = await storage.createArticle({
          userId: userId!,
          url,
          title: url,
          content: "Could not extract content from this URL. It may be behind a paywall or blocked.",
          domain,
          tag: tag || null,
        });
        
        res.json(article);
      }
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to save article" });
    }
  });

  app.delete("/api/articles/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { id } = req.params;
      
      const success = await storage.deleteArticle(id, userId!);
      if (!success) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      res.json({ message: "Article deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete article" });
    }
  });

  app.patch("/api/articles/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { tag } = req.body;
      
      const article = await storage.updateArticleTag(id, userId!, tag);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to update article" });
    }
  });

  // Tag routes
  app.get("/api/tags", requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const tags = await storage.getTagsByUserId(userId!);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // API key management
  app.post("/api/auth/generate-api-key", requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const apiKey = await storage.generateApiKey(userId!);
      res.json({ apiKey });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate API key" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}