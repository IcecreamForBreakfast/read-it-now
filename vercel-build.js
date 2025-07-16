#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('Building frontend for Vercel...');

try {
  // Build frontend only for Vercel
  execSync('vite build', { stdio: 'inherit' });
  console.log('Frontend build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}