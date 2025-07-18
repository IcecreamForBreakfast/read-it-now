import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Setup test environment
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
  process.env.SESSION_SECRET = 'test-secret-key-for-testing';
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(async () => {
  // Setup before each test
});

afterEach(async () => {
  // Cleanup after each test
});