import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import bcrypt from 'bcrypt';

// Simple in-memory storage for testing
const testUsers: any[] = [];
const testArticles: any[] = [];
const testCustomTags: any[] = [];

// Mock AutoTagger with new logic (no uncertain tag)
class MockAutoTagger {
  tagArticle(article: any) {
    const domain = article.url ? this.extractDomain(article.url) : '';
    const text = `${article.title} ${article.content || ''}`.toLowerCase();
    
    // Work indicators
    const workDomains = ['github.com', 'medium.com', 'techcrunch.com', 'linkedin.com'];
    const workKeywords = ['javascript', 'programming', 'startup', 'ai', 'machine learning', 'product management'];
    
    // Personal indicators  
    const personalDomains = ['allrecipes.com', 'foodnetwork.com', 'mayoclinic.org'];
    const personalKeywords = ['recipe', 'cooking', 'family', 'health', 'fitness', 'travel'];
    
    let workScore = 0;
    let personalScore = 0;
    const reasons: string[] = [];
    
    // Check domains
    if (workDomains.some(d => domain.includes(d))) {
      workScore++;
      reasons.push(`Domain: ${domain}`);
    }
    if (personalDomains.some(d => domain.includes(d))) {
      personalScore++;
      reasons.push(`Domain: ${domain}`);
    }
    
    // Check keywords
    const matchingWorkKeywords = workKeywords.filter(k => text.includes(k));
    const matchingPersonalKeywords = personalKeywords.filter(k => text.includes(k));
    
    if (matchingWorkKeywords.length > 0) {
      workScore += matchingWorkKeywords.length;
      reasons.push(`Keywords: ${matchingWorkKeywords.slice(0, 3).join(', ')}`);
    }
    
    if (matchingPersonalKeywords.length > 0) {
      personalScore += matchingPersonalKeywords.length;
      reasons.push(`Keywords: ${matchingPersonalKeywords.slice(0, 3).join(', ')}`);
    }
    
    // Determine result
    if (workScore > personalScore) {
      return {
        tag: 'work',
        confidence: workScore >= 2 ? 'high' : 'medium',
        reasons
      };
    } else if (personalScore > workScore) {
      return {
        tag: 'personal', 
        confidence: personalScore >= 2 ? 'high' : 'medium',
        reasons
      };
    } else if (workScore === personalScore && workScore > 0) {
      return {
        tag: null,
        confidence: 'low',
        reasons: ['Equal work and personal indicators found']
      };
    }
    
    return {
      tag: null,
      confidence: 'low',
      reasons: ['No clear work or personal indicators found']
    };
  }
  
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }
}

// Create test app with tagging integration
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Session middleware
  const MemoryStoreSession = MemoryStore(session);
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 30,
      sameSite: 'lax'
    },
    store: new MemoryStoreSession({
      checkPeriod: 86400000,
    })
  }));

  const autoTagger = new MockAutoTagger();
  
  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  };

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    
    const existingUser = testUsers.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      password: hashedPassword,
      token: Math.random().toString(36).substr(2, 32),
      createdAt: new Date()
    };
    
    testUsers.push(user);
    (req.session as any).userId = user.id;
    
    res.status(201).json({ 
      user: { id: user.id, email: user.email, token: user.token } 
    });
  });

  // Save article endpoint with auto-tagging
  app.post('/api/notes', requireAuth, async (req, res) => {
    const { url, title, content, tags } = req.body;
    
    if (!url && !title) {
      return res.status(400).json({ message: 'URL or title required' });
    }
    
    // Create article
    const article = {
      id: Math.random().toString(36).substr(2, 9),
      userId: (req.session as any).userId,
      url: url || '',
      title: title || 'Untitled',
      content: content || '',
      domain: url ? new URL(url).hostname : '',
      state: 'inbox',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Apply auto-tagging if no manual tags provided
    let finalTags = tags || [];
    if (!tags || tags.length === 0) {
      const taggingResult = autoTagger.tagArticle(article);
      if (taggingResult.tag) {
        finalTags = [taggingResult.tag];
        (article as any).tags = finalTags;
        (article as any).taggingResult = taggingResult;
      } else {
        finalTags = [];
        (article as any).tags = [];
        (article as any).taggingResult = taggingResult;
      }
    } else {
      (article as any).tags = finalTags;
    }
    
    testArticles.push(article);
    
    res.status(201).json(article);
  });

  // Get articles endpoint
  app.get('/api/notes', requireAuth, (req, res) => {
    const userArticles = testArticles.filter(a => a.userId === (req.session as any).userId);
    res.json(userArticles);
  });

  // iOS Save endpoint with auto-tagging
  app.post('/api/save/:token', async (req, res) => {
    const { token } = req.params;
    const { url, title } = req.body;
    
    const user = testUsers.find(u => u.token === token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Create article
    const article = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      url: url || 'https://example.com/article',
      title: title || 'Test Article',
      content: 'This is test content from the article.',
      domain: url ? new URL(url).hostname : 'example.com',
      state: 'inbox',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Apply auto-tagging
    const taggingResult = autoTagger.tagArticle(article);
    if (taggingResult.tag) {
      (article as any).tags = [taggingResult.tag];
    } else {
      (article as any).tags = [];
    }
    (article as any).taggingResult = taggingResult;
    
    testArticles.push(article);
    
    res.status(201).json({
      message: 'Article saved successfully',
      article
    });
  });

  return app;
}

describe('Tagging Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Clear test data
    testUsers.length = 0;
    testArticles.length = 0;
    testCustomTags.length = 0;
    
    app = createTestApp();
  });

  describe('Article Saving with Auto-Tagging', () => {
    it('should auto-tag work articles when saving via API', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(registerResponse.status).toBe(201);
      const cookies = registerResponse.headers['set-cookie'];

      // Save work article
      const saveResponse = await request(app)
        .post('/api/notes')
        .set('Cookie', cookies)
        .send({
          url: 'https://github.com/facebook/react',
          title: 'React - JavaScript Library for Building User Interfaces',
          content: 'React is a JavaScript library for building user interfaces with components.'
        });

      expect(saveResponse.status).toBe(201);
      expect(saveResponse.body.tags).toEqual(['work']);
      expect(saveResponse.body.taggingResult.tag).toBe('work');
      expect(saveResponse.body.taggingResult.confidence).toBe('medium');
    });

    it('should auto-tag personal articles when saving via API', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const cookies = registerResponse.headers['set-cookie'];

      // Save personal article
      const saveResponse = await request(app)
        .post('/api/notes')
        .set('Cookie', cookies)
        .send({
          url: 'https://allrecipes.com/recipe/chocolate-cake',
          title: 'Best Chocolate Cake Recipe for Family Dinner',
          content: 'This recipe is perfect for cooking with family and kids.'
        });

      expect(saveResponse.status).toBe(201);
      expect(saveResponse.body.tags).toEqual(['personal']);
      expect(saveResponse.body.taggingResult.tag).toBe('personal');
      expect(saveResponse.body.taggingResult.confidence).toBe('high'); // Multiple personal indicators
    });

    it('should leave articles untagged when no clear classification', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const cookies = registerResponse.headers['set-cookie'];

      // Save neutral article
      const saveResponse = await request(app)
        .post('/api/notes')
        .set('Cookie', cookies)
        .send({
          url: 'https://neutral-news.com/general-article',
          title: 'General News Update',
          content: 'This is a general news article with no specific indicators.'
        });

      expect(saveResponse.status).toBe(201);
      expect(saveResponse.body.tags).toEqual([]);
      expect(saveResponse.body.taggingResult.tag).toBeNull();
      expect(saveResponse.body.taggingResult.confidence).toBe('low');
      expect(saveResponse.body.taggingResult.reasons).toContain('No clear work or personal indicators found');
    });

    it('should respect manual tags and skip auto-tagging', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const cookies = registerResponse.headers['set-cookie'];

      // Save article with manual tags
      const saveResponse = await request(app)
        .post('/api/notes')
        .set('Cookie', cookies)
        .send({
          url: 'https://github.com/facebook/react',
          title: 'React Documentation',
          content: 'JavaScript library documentation.',
          tags: ['documentation', 'reference']
        });

      expect(saveResponse.status).toBe(201);
      expect(saveResponse.body.tags).toEqual(['documentation', 'reference']);
      expect(saveResponse.body.taggingResult).toBeUndefined();
    });
  });

  describe('iOS Integration with Auto-Tagging', () => {
    it('should auto-tag work articles saved via iOS shortcut', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const token = registerResponse.body.user.token;

      // Save work article via iOS
      const saveResponse = await request(app)
        .post(`/api/save/${token}`)
        .send({
          url: 'https://techcrunch.com/startup-funding',
          title: 'AI Startup Raises $50M for Machine Learning Platform'
        });

      expect(saveResponse.status).toBe(201);
      expect(saveResponse.body.article.tags).toEqual(['work']);
      expect(saveResponse.body.article.taggingResult.tag).toBe('work');
      expect(saveResponse.body.article.taggingResult.confidence).toBe('high');
    });

    it('should auto-tag personal articles saved via iOS shortcut', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const token = registerResponse.body.user.token;

      // Save personal article via iOS
      const saveResponse = await request(app)
        .post(`/api/save/${token}`)
        .send({
          url: 'https://foodnetwork.com/healthy-recipes',
          title: 'Healthy Family Recipes for Kids'
        });

      expect(saveResponse.status).toBe(201);
      expect(saveResponse.body.article.tags).toEqual(['personal']);
      expect(saveResponse.body.article.taggingResult.tag).toBe('personal');
    });

    it('should leave iOS articles untagged when ambiguous', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const token = registerResponse.body.user.token;

      // Save neutral article via iOS
      const saveResponse = await request(app)
        .post(`/api/save/${token}`)
        .send({
          url: 'https://random-blog.com/general-post',
          title: 'Random Blog Post'
        });

      expect(saveResponse.status).toBe(201);
      expect(saveResponse.body.article.tags).toEqual([]);
      expect(saveResponse.body.article.taggingResult.tag).toBeNull();
    });
  });

  describe('Mixed Content Scenarios', () => {
    it('should handle articles with equal work and personal indicators', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const cookies = registerResponse.headers['set-cookie'];

      // Save mixed content article
      const saveResponse = await request(app)
        .post('/api/notes')
        .set('Cookie', cookies)
        .send({
          url: 'https://example.com/work-life-balance',
          title: 'Balancing Programming Work with Family Cooking Time',
          content: 'How to manage javascript development projects while maintaining healthy family recipes and meal planning.'
        });

      expect(saveResponse.status).toBe(201);
      expect(saveResponse.body.tags).toEqual([]);
      expect(saveResponse.body.taggingResult.tag).toBeNull();
      expect(saveResponse.body.taggingResult.reasons).toContain('Equal work and personal indicators found');
    });

    it('should prioritize domain over content keywords', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const cookies = registerResponse.headers['set-cookie'];

      // Work domain with personal content
      const saveResponse = await request(app)
        .post('/api/notes')
        .set('Cookie', cookies)
        .send({
          url: 'https://medium.com/food-blog/recipe',
          title: 'Cooking Tips for Developers',
          content: 'How to cook healthy family meals and recipes while working in tech.'
        });

      expect(saveResponse.status).toBe(201);
      // Should be work due to Medium domain, despite personal keywords
      expect(saveResponse.body.tags).toEqual(['work']);
      expect(saveResponse.body.taggingResult.tag).toBe('work');
    });
  });

  describe('Error Handling', () => {
    it('should handle articles with malformed URLs gracefully', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const cookies = registerResponse.headers['set-cookie'];

      // Save article with malformed URL
      const saveResponse = await request(app)
        .post('/api/notes')
        .set('Cookie', cookies)
        .send({
          url: 'not-a-valid-url',
          title: 'Article with Bad URL',
          content: 'This should still work and be classified based on content.'
        });

      expect(saveResponse.status).toBe(201);
      expect(saveResponse.body.tags).toEqual([]);
      expect(saveResponse.body.taggingResult.tag).toBeNull();
    });

    it('should handle empty or minimal content', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const cookies = registerResponse.headers['set-cookie'];

      // Save minimal article
      const saveResponse = await request(app)
        .post('/api/notes')
        .set('Cookie', cookies)
        .send({
          title: 'Minimal Article'
        });

      expect(saveResponse.status).toBe(201);
      expect(saveResponse.body.tags).toEqual([]);
      expect(saveResponse.body.taggingResult.tag).toBeNull();
    });
  });
});