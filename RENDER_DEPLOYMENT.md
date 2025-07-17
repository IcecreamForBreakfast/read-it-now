# Render Deployment Guide

## Prerequisites
- GitHub repository: `https://github.com/IcecreamForBreakfast/read-it-now.git`
- Supabase database configured
- Environment variables ready

## Deployment Steps

### 1. Sign up for Render
- Go to https://render.com
- Sign up with GitHub account
- Connect your GitHub account

### 2. Create New Web Service
- Click "New" → "Web Service"
- Connect your GitHub and select `IcecreamForBreakfast/read-it-now` repository
- Render will auto-detect your Node.js app

### 3. Configure Deployment Settings
Render should auto-detect these, but verify:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Environment**: `Node`

### 4. Configure Environment Variables
In Render dashboard, add these environment variables:
```
DATABASE_URL=your_supabase_connection_string
SESSION_SECRET=b8WZO6bj4ghYBnbF6qq6jPfWrhhhEvHObph3P2y3vsIc1VqAg6KJNN2YVXbzovjq1D0F58TkDlLTMBmCBwfyMg==
NODE_ENV=production
```

### 5. Deploy
- Click "Create Web Service"
- Render will automatically build and deploy
- Your app will be available at a Render-generated URL (e.g., `https://read-it-now.onrender.com`)

### 6. Update iOS Shortcut
- Replace the URL in your iOS shortcut with the new Render URL
- Test article saving functionality

### 7. Update UptimeRobot (Recommended)
- Update monitoring URL to `https://your-app.onrender.com/api/health`
- This keeps your app warm and prevents 15-minute sleeps
- The health check endpoint is lightweight and doesn't query the database

## Advantages of Render
- **Zero configuration**: Works with your existing Express + React setup
- **Full-stack support**: Handles both frontend and backend naturally
- **Fast cold starts**: ~3-5 seconds when sleeping
- **Free tier**: 750 hours/month (sufficient for personal use)
- **Simple environment variables**: Easy to configure

## Cost Management
- **Free tier**: 750 hours/month
- **With UptimeRobot**: Uses ~720 hours/month (within free tier)
- **Personal use**: Should stay free indefinitely
- **No surprise charges**: Clear usage limits

## Post-Deployment Checklist
- [ ] App loads with full styling (not backend code)
- [ ] Login/logout functionality works
- [ ] Article saving and reading works
- [ ] iOS shortcut works with new URL
- [ ] Database connections are stable
- [ ] Health check endpoint responds at `/api/health`
- [ ] UptimeRobot monitoring updated

## Monitoring Setup
- **Health check URL**: `https://your-app.onrender.com/api/health`
- **Expected response**: `{"status":"healthy","timestamp":"...","uptime":...}`
- **UptimeRobot interval**: 5 minutes
- **Purpose**: Keeps app warm, prevents cold starts

## Troubleshooting
- **Build failures**: Check logs in Render dashboard
- **Database connection issues**: Verify DATABASE_URL environment variable
- **Session problems**: Check SESSION_SECRET is set correctly
- **Cold starts**: Ensure UptimeRobot is monitoring the health endpoint

## Cleanup
- Removed Vercel configuration files (`vercel.json`, `vercel-build.js`, `build.js`)
- Added Render configuration (`render.yaml`)
- Added health check endpoint for monitoring