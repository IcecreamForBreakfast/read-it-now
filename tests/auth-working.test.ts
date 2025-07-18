import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import bcrypt from 'bcrypt';

// Simple in-memory storage for testing
const testUsers: any[] = [];

// Create test app
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
    
    // Check if user exists
    const existingUser = testUsers.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      password: hashedPassword,
      createdAt: new Date()
    };
    
    testUsers.push(user);
    
    // Set session
    (req.session as any).userId = user.id;
    
    res.status(201).json({ 
      user: { 
        id: user.id, 
        email: user.email 
      } 
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Find user
    const user = testUsers.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Set session
    (req.session as any).userId = user.id;
    
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email 
      } 
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = testUsers.find(u => u.id === userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email 
      } 
    });
  });

  return app;
}

describe('Authentication Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    testUsers.length = 0; // Clear users
  });

  const testUser = {
    email: 'test@example.com',
    password: 'password123'
  };

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(testUser.email);
  });

  it('should login with valid credentials', async () => {
    // Register first
    await request(app)
      .post('/api/auth/register')
      .send(testUser);

    // Then login
    const response = await request(app)
      .post('/api/auth/login')
      .send(testUser);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(testUser.email);
  });

  it('should maintain session across requests', async () => {
    const agent = request.agent(app);
    
    // Register and login
    await agent
      .post('/api/auth/register')
      .send(testUser);

    // Check if authenticated
    const meResponse = await agent.get('/api/auth/me');
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.email).toBe(testUser.email);
  });

  it('should reject invalid credentials', async () => {
    // Register first
    await request(app)
      .post('/api/auth/register')
      .send(testUser);

    // Try wrong password
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
  });

  it('should reject unauthenticated requests', async () => {
    const response = await request(app)
      .get('/api/auth/me');

    expect(response.status).toBe(401);
  });
});