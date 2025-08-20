import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express, { type Express } from 'express';
import { registerRoutes } from '../server/routes';

describe('Production Authentication Validation', () => {
  let app: Express;
  
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);
  });

  it('should allow main user to login with known password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'josh.miller.dc@gmail.com',
        password: 'password123'
      });

    if (response.status !== 200) {
      console.log('Login failed:', response.status, response.body);
    }
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('josh.miller.dc@gmail.com');
  });

  it('should reject invalid credentials for main user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'josh.miller.dc@gmail.com', 
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });
});