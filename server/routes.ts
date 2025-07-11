import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import { insertUserSchema, loginSchema, magicLinkSchema, saveArticleSchema } from "@shared/schema";
import { extractArticleContent, extractDomain } from "./lib/article-parser";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || "read-it-later-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax", // Better compatibility while still secure
    },
  }));

  // Authentication middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    // Check session auth first
    if (req.session?.userId) {
      return next();
    }
    
    // Check API key auth
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

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "Session save failed" });
        }
        res.json({ user: { id: user.id, email: user.email } });
      });
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

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "Session save failed" });
        }
        res.json({ user: { id: user.id, email: user.email } });
      });
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
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId || req.userId;
      const user = await storage.getUserById(userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json({ user: { id: user.id, email: user.email, apiKey: user.apiKey } });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // API key generation endpoint
  app.post("/api/auth/generate-key", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId || req.userId;
      const apiKey = await storage.generateApiKey(userId!);
      res.json({ apiKey });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate API key" });
    }
  });

  // Article routes
  app.get("/api/articles", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId || req.userId;
      const tag = req.query.tag as string;
      const articles = await storage.getArticlesByUserId(userId!, tag);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId || req.userId;
      const article = await storage.getArticleById(req.params.id);
      if (!article || article.userId !== userId!) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  app.post("/api/articles", requireAuth, async (req, res) => {
    try {
      const { url } = saveArticleSchema.parse(req.body);
      const userId = req.session?.userId || req.userId;
      
      // Extract article content and metadata
      const { title, content } = await extractArticleContent(url);
      const domain = extractDomain(url);
      
      const article = await storage.createArticle({
        userId: userId!,
        url,
        title,
        domain,
        content,
        tag: "untagged",
      });
      
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to save article" });
    }
  });

  app.delete("/api/articles/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId || req.userId;
      const success = await storage.deleteArticle(req.params.id, userId!);
      if (!success) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json({ message: "Article deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete article" });
    }
  });

  app.patch("/api/articles/:id/tag", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId || req.userId;
      const { tag } = req.body;
      const article = await storage.updateArticleTag(req.params.id, userId!, tag);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to update article tag" });
    }
  });

  app.get("/api/tags", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId || req.userId;
      const tags = await storage.getTagsByUserId(userId!);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // iOS sharing endpoint
  app.post("/api/save", requireAuth, async (req, res) => {
    try {
      const { url } = saveArticleSchema.parse(req.body);
      const userId = req.session?.userId || req.userId;
      
      // Extract article content and metadata
      const { title, content } = await extractArticleContent(url);
      const domain = extractDomain(url);
      
      const article = await storage.createArticle({
        userId: userId!,
        url,
        title,
        domain,
        content,
        tag: "untagged",
      });
      
      res.json({ success: true, article });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Failed to save article" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
