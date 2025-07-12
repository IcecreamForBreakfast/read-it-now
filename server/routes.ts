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
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Token sharing endpoint
  app.post("/api/save/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Debug: Log what we're receiving
      console.log('Token save request body:', JSON.stringify(req.body, null, 2));
      console.log('Token save request headers:', req.headers);
      
      // Handle different possible data formats from iOS shortcut
      let url = req.body.url || req.body.URLs || req.body;
      
      // If it's an array (from iOS shortcuts), take the first URL
      if (Array.isArray(url)) {
        url = url[0];
      }
      
      // If it's still an object, try to extract URL from it
      if (typeof url === 'object' && url !== null) {
        url = url.url || url.URLs || url.href || Object.values(url)[0];
      }
      
      console.log('Extracted URL:', url);
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "No valid URL found in request" });
      }
      
      // Normalize URL - add https:// if missing
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      
      // Basic URL validation
      try {
        new URL(normalizedUrl);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      
      // Find user by token
      const user = await storage.getUserByToken(token);
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      // Extract article content
      const domain = extractDomain(normalizedUrl);
      const articleContent = await extractArticleContent(normalizedUrl);
      
      // Save article
      const article = await storage.createArticle({
        userId: user.id,
        url: normalizedUrl,
        title: articleContent.title,
        domain,
        content: articleContent.content,
        tag: "untagged"
      });
      
      res.json({ message: "Article saved successfully", article: { id: article.id, title: article.title } });
    } catch (error) {
      console.error('Error saving article via token:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to save article" });
    }
  });

  // Token management endpoint
  app.post("/api/generate-token", requireAuth, async (req, res) => {
    try {
      const token = await storage.generatePersonalToken(req.session.userId!);
      res.json({ token });
    } catch (error) {
      console.error('Error generating token:', error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  });

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
      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json({ user: { id: user.id, email: user.email, personalToken: user.personalToken } });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Article routes
  app.get("/api/articles", requireAuth, async (req, res) => {
    try {
      const tag = req.query.tag as string;
      const articles = await storage.getArticlesByUserId(req.session.userId!, tag);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/:id", requireAuth, async (req, res) => {
    try {
      const article = await storage.getArticleById(req.params.id);
      if (!article || article.userId !== req.session.userId!) {
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
      
      // Extract article content and metadata
      const { title, content } = await extractArticleContent(url);
      const domain = extractDomain(url);
      
      const article = await storage.createArticle({
        userId: req.session.userId!,
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
      const success = await storage.deleteArticle(req.params.id, req.session.userId!);
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
      const { tag } = req.body;
      const article = await storage.updateArticleTag(req.params.id, req.session.userId!, tag);
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
      const tags = await storage.getTagsByUserId(req.session.userId!);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // iOS sharing endpoint
  app.post("/api/save", requireAuth, async (req, res) => {
    try {
      const { url } = saveArticleSchema.parse(req.body);
      
      // Extract article content and metadata
      const { title, content } = await extractArticleContent(url);
      const domain = extractDomain(url);
      
      const article = await storage.createArticle({
        userId: req.session.userId!,
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
