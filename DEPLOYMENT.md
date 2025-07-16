# Vercel Deployment Guide

## Prerequisites
- GitHub repository: `https://github.com/IcecreamForBreakfast/read-it-now.git`
- Supabase database configured
- Environment variables ready

## Deployment Steps

### 1. Sign up for Vercel
- Go to https://vercel.com
- Sign up with GitHub account
- Connect your GitHub account

### 2. Create New Project
- Click "New Project"
- Select `IcecreamForBreakfast/read-it-now` repository
- Click "Import"
- **Let Vercel auto-detect project settings** (no custom configuration needed)

### 3. Configure Environment Variables
Add these in Vercel dashboard:
```
DATABASE_URL=your_supabase_connection_string
SESSION_SECRET=your_session_secret_key
NODE_ENV=production
```

### 4. Deploy
- Click "Deploy"
- Wait for build to complete
- Your app will be available at `https://read-it-now.vercel.app`

### 5. Update iOS Shortcut
- Replace the URL in your iOS shortcut from Replit to the new Vercel URL
- Test article saving functionality

### 6. Update UptimeRobot (Optional)
- Update monitoring URL to the new Vercel domain
- Vercel has better uptime than Replit by default

## Post-Deployment
- Test all functionality: login, article saving, reading, deletion
- Verify iOS shortcut works with new URL
- Check database connections are working

## Troubleshooting
- If build fails: Check build logs in Vercel dashboard
- If database connection fails: Verify DATABASE_URL environment variable
- If sessions don't work: Check SESSION_SECRET is set correctly
- If you see code instead of the website: The vercel.json has been fixed to serve the frontend properly

## Common Issues Fixed
- **Frontend not loading**: Updated vercel.json to serve from correct dist/public directory  
- **Build configuration**: Configured proper build command and output directory for Vercel
- **Build timeouts**: Simplified build process to use `vite build` instead of full npm build
- **Large icon bundles**: Optimized for faster Vercel builds by using only frontend build

## Build Process
- Vercel runs `vite build` to create the frontend
- Frontend assets are served from `dist/public`
- Backend API runs as serverless functions from `server/index.ts`
- Environment variables are configured in Vercel dashboard