import express from 'express';
import { registerRoutes } from '../server/routes';

export async function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Register routes but don't start the server
  await registerRoutes(app);

  return app;
}