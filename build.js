#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('Building frontend...');
execSync('npm run build', { stdio: 'inherit' });

console.log('Build completed!');