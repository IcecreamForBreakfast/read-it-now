import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createTestApp } from './test-app';

describe('Basic Authentication Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('User Registration and Login', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.id).toBeDefined();
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should maintain session across requests', async () => {
      const agent = request.agent(app);
      
      // Login
      await agent
        .post('/api/auth/login')
        .send(testUser);

      // Should be authenticated
      const meResponse = await agent.get('/api/auth/me');
      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user).toBeDefined();
      expect(meResponse.body.user.email).toBe(testUser.email);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });
  });
});