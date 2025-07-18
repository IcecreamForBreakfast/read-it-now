import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createTestApp } from './test-app.js';

describe('iOS Integration Tests', () => {
  let app: express.Application;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();
    
    // Create test user and get token
    const agent = request.agent(app);
    
    // Register and login user
    await agent
      .post('/api/auth/register')
      .send({
        email: 'ios-test@example.com',
        password: 'password123'
      });

    await agent
      .post('/api/auth/login')
      .send({
        email: 'ios-test@example.com',
        password: 'password123'
      });

    // Generate token
    const tokenResponse = await agent
      .post('/api/generate-token')
      .expect(200);

    userToken = tokenResponse.body.token;
    userId = tokenResponse.body.userId;
  });

  describe('Token-based Article Saving', () => {
    it('should save article with valid token and URL', async () => {
      const testUrl = 'https://example.com/article';
      
      const response = await request(app)
        .post(`/api/save/${userToken}`)
        .send({ url: testUrl })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.url).toBe(testUrl);
      expect(response.body.article.userId).toBe(userId);
    });

    it('should handle iOS shortcut URL array format', async () => {
      const testUrls = ['https://example.com/article-2'];
      
      const response = await request(app)
        .post(`/api/save/${userToken}`)
        .send({ url: testUrls })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.article.url).toBe(testUrls[0]);
    });

    it('should handle iOS shortcut URL object format', async () => {
      const testUrl = { url: 'https://example.com/article-3' };
      
      const response = await request(app)
        .post(`/api/save/${userToken}`)
        .send({ url: testUrl })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.article.url).toBe(testUrl.url);
    });

    it('should reject requests with invalid token', async () => {
      const invalidToken = 'invalid-token-123';
      
      await request(app)
        .post(`/api/save/${invalidToken}`)
        .send({ url: 'https://example.com/article' })
        .expect(401);
    });

    it('should handle malformed URLs gracefully', async () => {
      const malformedUrl = 'not-a-url';
      
      const response = await request(app)
        .post(`/api/save/${userToken}`)
        .send({ url: malformedUrl })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle blocked/inaccessible sites', async () => {
      const blockedUrl = 'https://httpstat.us/403';
      
      const response = await request(app)
        .post(`/api/save/${userToken}`)
        .send({ url: blockedUrl })
        .expect(200);

      // Should still save the article but with error message
      expect(response.body.success).toBe(true);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.url).toBe(blockedUrl);
    });
  });

  describe('Token Management', () => {
    it('should generate new token for authenticated user', async () => {
      const agent = request.agent(app);
      
      // Login
      await agent
        .post('/api/auth/login')
        .send({
          email: 'ios-test@example.com',
          password: 'password123'
        });

      const response = await agent
        .post('/api/generate-token')
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.userId).toBe(userId);
      expect(response.body.token).not.toBe(userToken); // Should be new token
    });

    it('should reject token generation for unauthenticated user', async () => {
      await request(app)
        .post('/api/generate-token')
        .expect(401);
    });
  });

  describe('Article Auto-tagging Integration', () => {
    it('should auto-tag articles saved via iOS', async () => {
      const workUrl = 'https://github.com/company/project';
      
      const response = await request(app)
        .post(`/api/save/${userToken}`)
        .send({ url: workUrl })
        .expect(200);

      expect(response.body.article.tags).toContain('work');
    });

    it('should handle personal articles', async () => {
      const personalUrl = 'https://cooking.nytimes.com/recipes/12345';
      
      const response = await request(app)
        .post(`/api/save/${userToken}`)
        .send({ url: personalUrl })
        .expect(200);

      expect(response.body.article.tags).toContain('personal');
    });
  });
});