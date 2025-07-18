import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createTestApp } from './test-app.js';

describe('API Contract Tests', () => {
  let app: express.Application;
  let testUserId: string;
  let testArticleId: string;

  beforeAll(async () => {
    app = await createTestApp();
    
    // Create and login test user
    const authenticatedAgent = request.agent(app);
    
    const registerResponse = await authenticatedAgent
      .post('/api/auth/register')
      .send({
        email: 'contract-test@example.com',
        password: 'password123'
      });

    testUserId = registerResponse.body.user.id;

    await authenticatedAgent
      .post('/api/auth/login')
      .send({
        email: 'contract-test@example.com',
        password: 'password123'
      });

    // Create test article
    const articleResponse = await authenticatedAgent
      .post('/api/articles')
      .send({
        url: 'https://example.com/test-article',
        title: 'Test Article',
        content: 'Test content'
      });

    testArticleId = articleResponse.body.id;
  });

  describe('Authentication Endpoints', () => {
    it('POST /api/auth/register should exist', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new-user@example.com',
          password: 'password123'
        })
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('POST /api/auth/login should exist', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'contract-test@example.com',
          password: 'password123'
        })
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('GET /api/auth/me should exist', async () => {
      const authenticatedAgent = request.agent(app);
      await authenticatedAgent
        .post('/api/auth/login')
        .send({
          email: 'contract-test@example.com',
          password: 'password123'
        });
        
      await authenticatedAgent
        .get('/api/auth/me')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('POST /api/auth/logout should exist', async () => {
      const authenticatedAgent = request.agent(app);
      await authenticatedAgent
        .post('/api/auth/login')
        .send({
          email: 'contract-test@example.com',
          password: 'password123'
        });
        
      await authenticatedAgent
        .post('/api/auth/logout')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });
  });

  describe('Article Management Endpoints', () => {
    it('GET /api/articles should require authentication', async () => {
      await request(app)
        .get('/api/articles')
        .expect(401);
    });

    it('POST /api/articles should require authentication', async () => {
      await request(app)
        .post('/api/articles')
        .send({
          url: 'https://example.com/test',
          title: 'Test'
        })
        .expect(401);
    });

    it('GET /api/articles/:id should require authentication', async () => {
      await request(app)
        .get(`/api/articles/${testArticleId}`)
        .expect(401);
    });

    it('DELETE /api/articles/:id should require authentication', async () => {
      await request(app)
        .delete(`/api/articles/${testArticleId}`)
        .expect(401);
    });

    it('PATCH /api/articles/:id/tag should exist and require authentication', async () => {
      await request(app)
        .patch(`/api/articles/${testArticleId}/tag`)
        .send({ tags: ['work'] })
        .expect(401);
    });
  });

  describe('Delete Operations with 404 Handling', () => {
    it('should handle delete of non-existent article gracefully', async () => {
      const authenticatedAgent = request.agent(app);
      await authenticatedAgent
        .post('/api/auth/login')
        .send({
          email: 'contract-test@example.com',
          password: 'password123'
        });
        
      const nonExistentId = 'non-existent-article-id';
      
      const response = await authenticatedAgent
        .delete(`/api/articles/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should delete existing article successfully', async () => {
      const authenticatedAgent = request.agent(app);
      await authenticatedAgent
        .post('/api/auth/login')
        .send({
          email: 'contract-test@example.com',
          password: 'password123'
        });
        
      // Create article to delete
      const articleResponse = await authenticatedAgent
        .post('/api/articles')
        .send({
          url: 'https://example.com/to-delete',
          title: 'Article to Delete'
        });

      const articleId = articleResponse.body.id;

      // Delete the article
      await authenticatedAgent
        .delete(`/api/articles/${articleId}`)
        .expect(200);

      // Verify it's deleted
      await authenticatedAgent
        .get(`/api/articles/${articleId}`)
        .expect(404);
    });
  });

  describe('Manual Tag Editing', () => {
    it('should update article tags via PATCH endpoint', async () => {
      const newTags = ['work', 'important'];
      
      const response = await authenticatedAgent
        .patch(`/api/articles/${testArticleId}/tag`)
        .send({ tags: newTags })
        .expect(200);

      expect(response.body.tags).toEqual(newTags);
    });

    it('should prevent cross-user article tag editing', async () => {
      // Create second user
      const secondAgent = request.agent(app);
      await secondAgent
        .post('/api/auth/register')
        .send({
          email: 'second-user@example.com',
          password: 'password123'
        });

      await secondAgent
        .post('/api/auth/login')
        .send({
          email: 'second-user@example.com',
          password: 'password123'
        });

      // Try to edit first user's article
      await secondAgent
        .patch(`/api/articles/${testArticleId}/tag`)
        .send({ tags: ['hacked'] })
        .expect(404); // Should not find article (user isolation)
    });
  });

  describe('Auto-tagging Endpoints', () => {
    it('GET /api/auto-tag/analytics should exist and require auth', async () => {
      await request(app)
        .get('/api/auto-tag/analytics')
        .expect(401);

      await authenticatedAgent
        .get('/api/auto-tag/analytics')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });

    it('POST /api/auto-tag/retag-existing should exist and require auth', async () => {
      await request(app)
        .post('/api/auto-tag/retag-existing')
        .expect(401);

      await authenticatedAgent
        .post('/api/auto-tag/retag-existing')
        .expect((res) => {
          expect(res.status).not.toBe(404);
        });
    });
  });

  describe('User Data Isolation', () => {
    it('should only return user-specific articles', async () => {
      // Create second user with articles
      const secondAgent = request.agent(app);
      await secondAgent
        .post('/api/auth/register')
        .send({
          email: 'isolation-test@example.com',
          password: 'password123'
        });

      await secondAgent
        .post('/api/auth/login')
        .send({
          email: 'isolation-test@example.com',
          password: 'password123'
        });

      // Create article for second user
      await secondAgent
        .post('/api/articles')
        .send({
          url: 'https://example.com/second-user-article',
          title: 'Second User Article'
        });

      // First user should only see their own articles
      const firstUserArticles = await authenticatedAgent
        .get('/api/articles')
        .expect(200);

      const secondUserArticles = await secondAgent
        .get('/api/articles')
        .expect(200);

      // Articles should be different
      expect(firstUserArticles.body.length).not.toBe(secondUserArticles.body.length);
      
      // No overlap in article IDs
      const firstUserIds = firstUserArticles.body.map((a: any) => a.id);
      const secondUserIds = secondUserArticles.body.map((a: any) => a.id);
      
      expect(firstUserIds.some((id: string) => secondUserIds.includes(id))).toBe(false);
    });
  });
});