#!/bin/bash

echo "Starting Vercel build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build frontend
echo "Building frontend..."
vite build

echo "Build completed successfully!"
echo "Output directory: dist/public"
ls -la dist/public