import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { insertUserSchema, loginSchema, magicLinkSchema, saveArticleSchema } from "@shared/schema";
import { extractArticleContent, extractDomain } from "./lib/article-parser";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key-change-in-production";

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasDB: !!process.env.DATABASE_URL,
    hasJWT: !!process.env.JWT_SECRET,
    timestamp: new Date().toISOString()
  });
  
  // Add cookie parser middleware
  app.use(cookieParser());

  // Authentication middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      // Check for JWT token in cookies first
      const token = req.cookies?.auth_token;
      
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          req.userId = decoded.userId;

          return next();
        } catch (jwtError) {
          // JWT verification failed, continue to API key check
        }
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
      

      console.log('Authentication failed - no valid token or API key, headers:', {
        cookies: req.headers.cookie,
        authorization: req.headers.authorization,
        userAgent: req.headers['user-agent']?.substring(0, 50)
      });
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

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      // Set HTTP-only cookie with proper domain configuration
      const isProduction = req.headers.host?.includes('replit.app');
      console.log('Setting registration cookie for host:', req.headers.host, 'isProduction:', isProduction);
      
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: isProduction ? undefined : undefined, // Let browser handle domain
      });
      
      res.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log('Login attempt:', {
        email: req.body?.email,
        userAgent: req.headers['user-agent']?.substring(0, 100),
        origin: req.headers.origin,
        referer: req.headers.referer,
        host: req.headers.host
      });
      
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      // Set HTTP-only cookie with proper domain configuration
      const isProduction = req.headers.host?.includes('replit.app');
      console.log('Setting cookie for host:', req.headers.host, 'isProduction:', isProduction);
      
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: isProduction ? undefined : undefined, // Let browser handle domain
      });
      
      console.log('Login successful, cookie set for:', user.email);
      
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
    // Clear the auth token cookie
    res.clearCookie('auth_token');
    res.json({ message: "Logged out successfully" });
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
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // API key generation endpoint
  app.post("/api/auth/generate-key", requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const apiKey = await storage.generateApiKey(userId!);
      res.json({ apiKey });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate API key" });
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

  app.get("/api/articles/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.userId;
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
      const userId = req.userId;
      
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
      const userId = req.userId;
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
      const userId = req.userId;
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
      const userId = req.userId;
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
      const userId = req.userId;
      
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
