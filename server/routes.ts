import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
// @ts-ignore
import ConnectPgSimple from "connect-pg-simple";
import { insertUserSchema, insertNoteSchema, loginSchema, magicLinkSchema, saveArticleSchema } from "@shared/schema";
import { extractArticleContent, extractDomain } from "./lib/article-parser";
import { autoTagger } from "./lib/auto-tagger";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // PostgreSQL session store configuration
  const PgSession = ConnectPgSimple(session);
  
  // Session configuration with PostgreSQL store
  const sessionStore = new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: "session", // Use the existing table name
    createTableIfMissing: true,
  });

  // Add error handling for session store
  sessionStore.on('error', (error) => {
    console.error('Session store error:', error);
  });

  // Debug middleware to track session lifecycle
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/articles')) {
      console.log('Request:', req.method, req.path, {
        sessionId: req.sessionID,
        cookies: req.headers.cookie,
        hasSession: !!req.session
      });
    }
    next();
  });

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "read-it-later-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Allow cookies over HTTP for now to fix session issues
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax", // Better compatibility while still secure
    },
  }));

  // Simple middleware - no session tracking needed for now
  // The user_id column is available for manual inspection in Supabase

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    console.log('Session check:', {
      sessionId: req.sessionID,
      userId: req.session?.userId,
      cookies: req.headers.cookie,
      sessionData: req.session
    });
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Health check endpoint for monitoring
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Token sharing endpoint
  app.post("/api/save/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
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
      
      // Auto-tag the article
      const mockArticle = {
        id: '',
        userId: user.id,
        url: normalizedUrl,
        title: articleContent.title,
        domain,
        content: articleContent.content,
        annotation: null,
        tag: 'untagged',
        state: 'inbox',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const taggingResult = autoTagger.tagArticle(mockArticle);

      // Save article with auto-generated tag in inbox state (unified Notes system)
      const note = await storage.createNote({
        userId: user.id,
        url: normalizedUrl,
        title: articleContent.title,
        domain,
        content: articleContent.content,
        tag: taggingResult.tag,
        state: 'inbox' // iOS articles go to inbox for review
      });
      
      res.json({ message: "Article saved successfully", note: { id: note.id, title: note.title } });
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

  // Password change endpoint
  app.post("/api/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }

      // Get current user
      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUserPassword(req.session.userId!, hashedNewPassword);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Auto-tag analytics endpoint
  app.get("/api/auto-tag/analytics", requireAuth, async (req, res) => {
    try {
      const notes = await storage.getNotesByUserId(req.session.userId!);
      const analytics = autoTagger.generateAnalytics(notes);
      res.json(analytics);
    } catch (error) {
      console.error('Error generating analytics:', error);
      res.status(500).json({ message: "Failed to generate analytics" });
    }
  });

  // Apply auto-tag suggestion endpoint
  app.post("/api/auto-tag/apply-suggestion", requireAuth, async (req, res) => {
    try {
      const { type, category, value } = req.body;
      
      if (!type || !category || !value) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!['domain', 'keyword'].includes(type)) {
        return res.status(400).json({ message: "Invalid type" });
      }

      if (!['work', 'personal'].includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }

      autoTagger.addRule(type, category, value);
      res.json({ message: "Rule added successfully" });
    } catch (error) {
      console.error('Error applying suggestion:', error);
      res.status(500).json({ message: "Failed to apply suggestion" });
    }
  });

  // Batch retag existing notes endpoint
  app.post("/api/auto-tag/retag-existing", requireAuth, async (req, res) => {
    try {
      const notes = await storage.getNotesByUserId(req.session.userId!);
      const untaggedNotes = notes.filter(note => 
        note.tag === 'untagged' || !note.tag
      );

      let updated = 0;
      const results = [];

      for (const note of untaggedNotes) {
        const taggingResult = autoTagger.tagArticle(note);
        
        if (taggingResult.tag !== 'untagged') {
          const updatedNote = await storage.updateNoteTag(
            note.id, 
            req.session.userId!, 
            taggingResult.tag
          );
          
          if (updatedNote) {
            updated++;
            results.push({
              id: note.id,
              title: note.title,
              oldTag: note.tag,
              newTag: taggingResult.tag,
              confidence: taggingResult.confidence,
              reasons: taggingResult.reasons
            });
          }
        }
      }

      res.json({
        message: `Successfully retagged ${updated} notes`,
        totalProcessed: untaggedNotes.length,
        updated,
        results
      });
    } catch (error) {
      console.error('Error retagging notes:', error);
      res.status(500).json({ message: "Failed to retag notes" });
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

  // Legacy article endpoints removed - all functionality moved to unified /api/notes endpoints

  app.get("/api/tags", requireAuth, async (req, res) => {
    try {
      const tags = await storage.getTagsByUserId(req.session.userId!);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // Create a new custom tag
  app.post("/api/tags", requireAuth, async (req, res) => {
    try {
      const { tagName } = req.body;
      
      if (!tagName || typeof tagName !== 'string' || tagName.trim().length === 0) {
        return res.status(400).json({ message: "Tag name is required" });
      }
      
      const trimmedTagName = tagName.trim().toLowerCase();
      
      // Prevent creating reserved tags
      if (['all', 'untagged', 'work', 'personal', 'uncertain'].includes(trimmedTagName)) {
        return res.status(400).json({ message: "Cannot create reserved tag names" });
      }
      
      const success = await storage.createCustomTag(req.session.userId!, trimmedTagName);
      
      if (!success) {
        return res.status(400).json({ message: "Tag already exists" });
      }
      
      res.json({ message: "Tag created successfully", tagName: trimmedTagName });
    } catch (error) {
      res.status(500).json({ message: "Failed to create tag" });
    }
  });

  // Get tag usage statistics
  app.get("/api/tags/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getTagUsageStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tag statistics" });
    }
  });

  // Rename a tag
  app.patch("/api/tags/:tagName", requireAuth, async (req, res) => {
    try {
      const { tagName } = req.params;
      const { newName } = req.body;
      
      if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
        return res.status(400).json({ message: "New tag name is required" });
      }
      
      const trimmedNewName = newName.trim().toLowerCase();
      
      // Prevent renaming to reserved/existing tags
      if (['all', 'untagged'].includes(trimmedNewName)) {
        return res.status(400).json({ message: "Cannot use reserved tag names" });
      }
      
      const success = await storage.renameTag(req.session.userId!, tagName, trimmedNewName);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to rename tag" });
      }
      
      res.json({ message: "Tag renamed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to rename tag" });
    }
  });

  // Delete a tag (sets all articles with this tag to "untagged")
  app.delete("/api/tags/:tagName", requireAuth, async (req, res) => {
    try {
      const { tagName } = req.params;
      
      // Prevent deletion of reserved tags
      if (['untagged'].includes(tagName)) {
        return res.status(400).json({ message: "Cannot delete reserved tags" });
      }
      
      const success = await storage.deleteTag(req.session.userId!, tagName);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete tag" });
      }
      
      res.json({ message: "Tag deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tag" });
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

  // ===================
  // NOTES API (Unified)
  // ===================

  // Get all notes with filtering
  app.get("/api/notes", requireAuth, async (req, res) => {
    try {
      const { tag, state } = req.query;
      const notes = await storage.getNotesByUserId(
        req.session.userId!,
        tag as string,
        state as string
      );
      res.json(notes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  // Get specific note by ID
  app.get("/api/notes/:id", requireAuth, async (req, res) => {
    try {
      const note = await storage.getNoteById(req.params.id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      // Ensure note belongs to current user
      if (note.userId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(note);
    } catch (error) {
      console.error('Error fetching note:', error);
      res.status(500).json({ message: "Failed to fetch note" });
    }
  });

  // Create new note (manual or URL-based)
  app.post("/api/notes", requireAuth, async (req, res) => {
    try {
      const noteData = insertNoteSchema.parse(req.body);
      
      // If URL provided, fetch content like articles
      if (noteData.url) {
        // Normalize URL
        let normalizedUrl = noteData.url.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          normalizedUrl = `https://${normalizedUrl}`;
        }
        
        const domain = extractDomain(normalizedUrl);
        const articleContent = await extractArticleContent(normalizedUrl);
        
        // Auto-tag URL-based notes and set to inbox
        const mockNote = {
          id: '',
          userId: req.session.userId!,
          url: normalizedUrl,
          title: articleContent.title || noteData.title || 'Untitled Article',
          domain,
          content: articleContent.content,
          tag: 'untagged',
          state: 'inbox',
          createdAt: new Date(),
          updatedAt: new Date(),
          annotation: noteData.annotation || null
        };
        const taggingResult = autoTagger.tagArticle(mockNote);
        
        const note = await storage.createNote({
          userId: req.session.userId!,
          url: normalizedUrl,
          title: articleContent.title || noteData.title || 'Untitled Article',
          domain,
          content: articleContent.content,
          annotation: noteData.annotation,
          tag: taggingResult.tag,
          state: noteData.state || 'inbox'
        });
        
        res.json(note);
      } else {
        // Manual note creation
        const note = await storage.createNote({
          userId: req.session.userId!,
          ...noteData,
          state: noteData.state || 'inbox'
        });
        
        res.json(note);
      }
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create note" });
    }
  });

  // Update note state (inbox → saved → archived)
  app.patch("/api/notes/:id/state", requireAuth, async (req, res) => {
    try {
      const { state } = req.body;
      if (!['inbox', 'saved', 'archived'].includes(state)) {
        return res.status(400).json({ message: "Invalid state. Must be inbox, saved, or archived" });
      }
      
      const note = await storage.updateNoteState(req.params.id, req.session.userId!, state);
      if (!note) {
        return res.status(404).json({ message: "Note not found or access denied" });
      }
      
      res.json(note);
    } catch (error) {
      console.error('Error updating note state:', error);
      res.status(500).json({ message: "Failed to update note state" });
    }
  });

  // Update note annotation
  app.patch("/api/notes/:id/annotation", requireAuth, async (req, res) => {
    try {
      const { annotation } = req.body;
      const note = await storage.updateNoteAnnotation(req.params.id, req.session.userId!, annotation);
      if (!note) {
        return res.status(404).json({ message: "Note not found or access denied" });
      }
      
      res.json(note);
    } catch (error) {
      console.error('Error updating note annotation:', error);
      res.status(500).json({ message: "Failed to update note annotation" });
    }
  });

  // Update note tag (compatible with existing functionality)
  app.patch("/api/notes/:id/tag", requireAuth, async (req, res) => {
    try {
      const { tag } = req.body;
      const note = await storage.updateNoteTag(req.params.id, req.session.userId!, tag);
      if (!note) {
        return res.status(404).json({ message: "Note not found or access denied" });
      }
      
      res.json(note);
    } catch (error) {
      console.error('Error updating note tag:', error);
      res.status(500).json({ message: "Failed to update note tag" });
    }
  });

  // Delete note
  app.delete("/api/notes/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteNote(req.params.id, req.session.userId!);
      if (!success) {
        return res.status(404).json({ message: "Note not found or access denied" });
      }
      
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error('Error deleting note:', error);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Export for testing
export async function createTestApp() {
  const express = require('express');
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Register all routes
  await registerRoutes(app);
  
  return app;
}

// Simple createServer export for backward compatibility
export { createTestApp as createServer };
