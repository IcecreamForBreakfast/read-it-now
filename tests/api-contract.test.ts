import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import bcrypt from 'bcrypt';

// Simple in-memory storage for testing
const testUsers: any[] = [];
const testArticles: any[] = [];

// Create test app with all API endpoints
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
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    
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

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    
    const user = testUsers.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    (req.session as any).userId = user.id;
    
    res.json({ 
      user: { id: user.id, email: user.email, token: user.token } 
    });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    const userId = (req.session as any).userId;
    const user = testUsers.find(u => u.id === userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    res.json({ 
      user: { id: user.id, email: user.email, token: user.token } 
    });
  });

  app.post('/api/auth/logout', requireAuth, (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Articles routes
  app.get('/api/articles', requireAuth, (req, res) => {
    const userId = (req.session as any).userId;
    const userArticles = testArticles.filter(a => a.userId === userId);
    res.json(userArticles);
  });

  app.post('/api/articles', requireAuth, async (req, res) => {
    const { url, title } = req.body;
    const userId = (req.session as any).userId;
    
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }
    
    const article = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      url,
      title: title || 'Untitled Article',
      content: 'Sample content',
      domain: 'example.com',
      tags: ['uncertain'],
      createdAt: new Date()
    };
    
    testArticles.push(article);
    
    res.status(201).json(article);
  });

  app.get('/api/articles/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const userId = (req.session as any).userId;
    
    const article = testArticles.find(a => a.id === id && a.userId === userId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    res.json(article);
  });

  app.patch('/api/articles/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { tags } = req.body;
    const userId = (req.session as any).userId;
    
    const articleIndex = testArticles.findIndex(a => a.id === id && a.userId === userId);
    if (articleIndex === -1) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    if (tags) {
      testArticles[articleIndex].tags = tags;
    }
    
    res.json(testArticles[articleIndex]);
  });

  app.delete('/api/articles/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const userId = (req.session as any).userId;
    
    const articleIndex = testArticles.findIndex(a => a.id === id && a.userId === userId);
    if (articleIndex === -1) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    testArticles.splice(articleIndex, 1);
    
    res.json({ message: 'Article deleted successfully' });
  });

  // Tags routes
  app.get('/api/tags', requireAuth, (req, res) => {
    const userId = (req.session as any).userId;
    const userArticles = testArticles.filter(a => a.userId === userId);
    const tags = [...new Set(userArticles.flatMap(a => a.tags))];
    res.json(tags);
  });

  return app;
}

describe('API Contract Tests', () => {
  let app: express.Application;
  let authenticatedAgent: any;

  beforeEach(async () => {
    app = createTestApp();
    testUsers.length = 0;
    testArticles.length = 0;
    
    // Create authenticated agent
    authenticatedAgent = request.agent(app);
    
    // Register and login
    await authenticatedAgent
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
  });

  describe('Authentication Endpoints', () => {
    it('should validate required fields on registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email and password required');
    });

    it('should validate required fields on login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email and password required');
    });

    it('should return user profile on /me endpoint', async () => {
      const response = await authenticatedAgent.get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.token).toBeDefined();
    });

    it('should successfully logout', async () => {
      const response = await authenticatedAgent.post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
      
      // Should not be able to access protected route after logout
      const meResponse = await authenticatedAgent.get('/api/auth/me');
      expect(meResponse.status).toBe(401);
    });
  });

  describe('Articles Endpoints', () => {
    it('should create article with valid data', async () => {
      const response = await authenticatedAgent
        .post('/api/articles')
        .send({
          url: 'https://example.com/test-article',
          title: 'Test Article'
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe('Test Article');
      expect(response.body.url).toBe('https://example.com/test-article');
    });

    it('should reject article creation without URL', async () => {
      const response = await authenticatedAgent
        .post('/api/articles')
        .send({
          title: 'Test Article'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('URL is required');
    });

    it('should get user articles', async () => {
      // Create test article
      await authenticatedAgent
        .post('/api/articles')
        .send({
          url: 'https://example.com/test-article',
          title: 'Test Article'
        });

      const response = await authenticatedAgent.get('/api/articles');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Test Article');
    });

    it('should get specific article by ID', async () => {
      // Create test article
      const createResponse = await authenticatedAgent
        .post('/api/articles')
        .send({
          url: 'https://example.com/test-article',
          title: 'Test Article'
        });

      const articleId = createResponse.body.id;

      const response = await authenticatedAgent.get(`/api/articles/${articleId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(articleId);
      expect(response.body.title).toBe('Test Article');
    });

    it('should return 404 for non-existent article', async () => {
      const response = await authenticatedAgent.get('/api/articles/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Article not found');
    });

    it('should update article tags', async () => {
      // Create test article
      const createResponse = await authenticatedAgent
        .post('/api/articles')
        .send({
          url: 'https://example.com/test-article',
          title: 'Test Article'
        });

      const articleId = createResponse.body.id;

      const response = await authenticatedAgent
        .patch(`/api/articles/${articleId}`)
        .send({
          tags: ['work', 'important']
        });

      expect(response.status).toBe(200);
      expect(response.body.tags).toEqual(['work', 'important']);
    });

    it('should delete article', async () => {
      // Create test article
      const createResponse = await authenticatedAgent
        .post('/api/articles')
        .send({
          url: 'https://example.com/test-article',
          title: 'Test Article'
        });

      const articleId = createResponse.body.id;

      const response = await authenticatedAgent.delete(`/api/articles/${articleId}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Article deleted successfully');
      
      // Article should no longer exist
      const getResponse = await authenticatedAgent.get(`/api/articles/${articleId}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Tags Endpoints', () => {
    it('should return unique tags from user articles', async () => {
      // Create articles with different tags
      await authenticatedAgent
        .post('/api/articles')
        .send({
          url: 'https://example.com/article1',
          title: 'Article 1'
        });

      await authenticatedAgent
        .post('/api/articles')
        .send({
          url: 'https://example.com/article2',
          title: 'Article 2'
        });

      const response = await authenticatedAgent.get('/api/tags');

      expect(response.status).toBe(200);
      expect(response.body).toContain('uncertain');
    });
  });

  describe('Authorization', () => {
    it('should require authentication for all protected routes', async () => {
      const protectedRoutes = [
        { method: 'get', path: '/api/auth/me' },
        { method: 'post', path: '/api/auth/logout' },
        { method: 'get', path: '/api/articles' },
        { method: 'post', path: '/api/articles' },
        { method: 'get', path: '/api/articles/123' },
        { method: 'patch', path: '/api/articles/123' },
        { method: 'delete', path: '/api/articles/123' },
        { method: 'get', path: '/api/tags' }
      ];

      for (const route of protectedRoutes) {
        let response;
        if (route.method === 'get') {
          response = await request(app).get(route.path);
        } else if (route.method === 'post') {
          response = await request(app).post(route.path);
        } else if (route.method === 'patch') {
          response = await request(app).patch(route.path);
        } else if (route.method === 'delete') {
          response = await request(app).delete(route.path);
        }
        expect(response?.status).toBe(401);
        expect(response?.body.message).toBe('Authentication required');
      }
    });
  });
});