# Railway Deployment Guide

## Prerequisites
- GitHub repository: `https://github.com/IcecreamForBreakfast/read-it-now.git`
- Supabase database configured
- Environment variables ready

## Deployment Steps

### 1. Sign up for Railway
- Go to https://railway.app
- Sign up with GitHub account
- Connect your GitHub account

### 2. Create New Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose `IcecreamForBreakfast/read-it-now` repository
- Railway will auto-detect your Node.js app

### 3. Configure Environment Variables
In Railway dashboard, go to Variables tab and add:
```
DATABASE_URL=your_supabase_connection_string
SESSION_SECRET=b8WZO6bj4ghYBnbF6qq6jPfWrhhhEvHObph3P2y3vsIc1VqAg6KJNN2YVXbzovjq1D0F58TkDlLTMBmCBwfyMg==
NODE_ENV=production
```

### 4. Deploy
- Railway will automatically build and deploy
- Your app will be available at a Railway-generated URL (e.g., `https://read-it-now-production.up.railway.app`)

### 5. Update iOS Shortcut
- Replace the URL in your iOS shortcut with the new Railway URL
- Test article saving functionality

## Advantages of Railway
- **Zero configuration**: Works out of the box with your current setup
- **Full-stack support**: Handles both frontend and backend naturally
- **Fast cold starts**: ~2-3 seconds (much faster than Replit)
- **Simple environment variables**: Easy to configure
- **Free tier**: Personal projects typically stay free

## Post-Deployment
- Test all functionality: login, article saving, reading, deletion
- Verify iOS shortcut works with new URL
- Check database connections are working
- Consider removing UptimeRobot initially to stay on free tier

## Cost Management
- **Free tier**: $5 credit per month
- **Personal use**: Typically uses $0.50-$2 per month
- **UptimeRobot**: Adds ~$3-5/month for 24/7 uptime (optional)
- **Recommendation**: Start without UptimeRobot, add later if needed