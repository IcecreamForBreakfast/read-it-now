import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createTestApp } from './test-app.js';

describe('Session Authentication Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Create test app
    app = await createTestApp();
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('User Registration and Login', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should register a new user', async () => {
      const agent = request.agent(app);
      const response = await agent
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.id).toBeDefined();
    });

    it('should login with valid credentials', async () => {
      const agent = request.agent(app);
      const response = await agent
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should maintain session across requests', async () => {
      const agent = request.agent(app);
      
      // Login first
      await agent
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      // First request - should be authenticated
      const meResponse = await agent
        .get('/api/auth/me')
        .expect(200);

      expect(meResponse.body.user).toBeDefined();
      expect(meResponse.body.user.email).toBe(testUser.email);

      // Second request - should still be authenticated
      const articlesResponse = await agent
        .get('/api/articles')
        .expect(200);

      expect(Array.isArray(articlesResponse.body)).toBe(true);
    });

    it('should handle logout correctly', async () => {
      const agent = request.agent(app);
      
      // Login first
      await agent
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      // Logout
      await agent
        .post('/api/auth/logout')
        .expect(200);

      // Should not be authenticated after logout
      await agent
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('Session Security', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      const newAgent = request.agent(app);

      // Test protected endpoints
      await newAgent.get('/api/articles').expect(401);
      await newAgent.post('/api/articles').expect(401);
      await newAgent.get('/api/auth/me').expect(401);
    });

    it('should handle invalid login credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should prevent registration with existing email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(400);
    });
  });

  describe('Cookie Configuration', () => {
    it('should set session cookies with correct security settings', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      // Check cookie headers
      const cookies = response.headers['set-cookie'] as string[];
      expect(cookies).toBeDefined();
      
      const sessionCookie = cookies?.find((cookie: string) => 
        cookie.includes('connect.sid')
      );
      
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite=Lax');
      
      // In test environment, secure should be false
      expect(sessionCookie).not.toContain('Secure');
    });
  });
});