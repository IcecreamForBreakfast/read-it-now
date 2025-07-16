#!/bin/bash
echo "Building React frontend with Vite..."
npm run build
echo "Build completed! Files available in dist/public/"
ls -la dist/public/