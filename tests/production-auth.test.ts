import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../server/routes';

describe('Production Authentication Validation', () => {
  let app: any;
  
  beforeAll(async () => {
    app = await createTestApp();
  });

  it('should allow main user to login with known password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'josh.miller.dc@gmail.com',
        password: 'password123'
      });

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