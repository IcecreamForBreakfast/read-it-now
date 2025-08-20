import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import bcrypt from 'bcrypt';

// Simple in-memory storage for testing
const testUsers: any[] = [];
const testArticles: any[] = [];

// Create test app with iOS endpoints
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
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax'
    },
    store: new MemoryStoreSession({
      checkPeriod: 86400000, // prune expired entries every 24h
    })
  }));

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

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    const user = testUsers.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    (req.session as any).userId = user.id;
    res.status(200).json({ 
      user: { id: user.id, email: user.email, token: user.token } 
    });
  });

  // Get notes endpoint
  app.get('/api/notes', (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userArticles = testArticles.filter(a => a.userId === userId);
    res.json(userArticles);
  });

  // iOS Save endpoint
  app.post('/api/save/:token', async (req, res) => {
    const { token } = req.params;
    const { url, title } = req.body;
    
    // Find user by token
    const user = testUsers.find(u => u.token === token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Simulate article parsing
    const article = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      url: url || 'https://example.com/article',
      title: title || 'Test Article',
      content: 'This is test content from the article.',
      domain: 'example.com',
      tags: ['uncertain'],
      createdAt: new Date()
    };
    
    testArticles.push(article);
    
    res.json({ 
      message: 'Article saved successfully',
      article: { id: article.id, title: article.title, url: article.url }
    });
  });

  // Articles endpoint
  app.get('/api/articles', (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userArticles = testArticles.filter(a => a.userId === userId);
    res.json(userArticles);
  });

  return app;
}

describe('iOS Integration Tests', () => {
  let app: express.Application;
  let testUser: any;

  beforeEach(async () => {
    app = createTestApp();
    testUsers.length = 0;
    testArticles.length = 0;
    
    // Create test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    testUser = registerResponse.body.user;
  });

  it('should save article via iOS token endpoint', async () => {
    const response = await request(app)
      .post(`/api/save/${testUser.token}`)
      .send({
        url: 'https://example.com/test-article',
        title: 'Test Article from iOS'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Article saved successfully');
    expect(response.body.article.title).toBe('Test Article from iOS');
    expect(response.body.article.url).toBe('https://example.com/test-article');
  });

  it('should handle URL-only iOS requests', async () => {
    const response = await request(app)
      .post(`/api/save/${testUser.token}`)
      .send({
        url: 'https://example.com/url-only'
      });

    expect(response.status).toBe(200);
    expect(response.body.article.url).toBe('https://example.com/url-only');
  });

  it('should handle various URL formats from iOS', async () => {
    const testUrls = [
      'https://www.example.com/article',
      'http://example.com/article',
      'example.com/article',
      'https://subdomain.example.com/path/to/article'
    ];

    for (const url of testUrls) {
      const response = await request(app)
        .post(`/api/save/${testUser.token}`)
        .send({ url });

      expect(response.status).toBe(200);
      expect(response.body.article.url).toBeDefined();
    }
  });

  it('should reject requests with invalid token', async () => {
    const response = await request(app)
      .post('/api/save/invalid-token')
      .send({
        url: 'https://example.com/test-article'
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid token');
  });

  it('should isolate articles between users', async () => {
    // Create second user
    const user2Response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user2@example.com',
        password: 'password123'
      });
    
    const user2 = user2Response.body.user;
    expect(user2Response.status).toBe(201);

    // Save article for user 1
    await request(app)
      .post(`/api/save/${testUser.token}`)
      .send({
        url: 'https://example.com/user1-article',
        title: 'User 1 Article'
      });

    // Save article for user 2
    await request(app)
      .post(`/api/save/${user2.token}`)
      .send({
        url: 'https://example.com/user2-article',
        title: 'User 2 Article'
      });

    // Create sessions for both users
    const agent1 = request.agent(app);
    const agent2 = request.agent(app);

    // Login user 1 (use registration response directly)
    const login1Response = await agent1.post('/api/auth/login').send({
      email: testUser.email,
      password: 'password123'
    });
    expect(login1Response.status).toBe(200);

    // Login user 2
    const login2Response = await agent2.post('/api/auth/login').send({
      email: 'user2@example.com',
      password: 'password123'
    });
    expect(login2Response.status).toBe(200);

    // Get articles for user 1
    const user1Articles = await agent1.get('/api/notes');
    expect(user1Articles.body).toHaveLength(1);
    expect(user1Articles.body[0].title).toBe('User 1 Article');

    // Get articles for user 2
    const user2Articles = await agent2.get('/api/notes');
    expect(user2Articles.body).toHaveLength(1);
    expect(user2Articles.body[0].title).toBe('User 2 Article');
  });

  it('should handle high-frequency iOS requests', async () => {
    // Simulate multiple quick saves from iOS
    const requests = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post(`/api/save/${testUser.token}`)
        .send({
          url: `https://example.com/article-${i}`,
          title: `Article ${i}`
        })
    );

    const responses = await Promise.all(requests);
    
    // All requests should succeed
    responses.forEach((response, index) => {
      expect(response.status).toBe(200);
      expect(response.body.article.title).toBe(`Article ${index}`);
    });
  });
});