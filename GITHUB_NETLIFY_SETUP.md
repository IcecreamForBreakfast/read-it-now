# GitHub & Netlify Deployment Guide

This guide shows you how to sync your Read-It-Later app to GitHub and deploy it on Netlify as an alternative to Replit hosting.

## Prerequisites

- GitHub account
- Netlify account (free tier available)
- Your app working locally (which it is!)

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and log in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name it `read-it-later-app` (or whatever you prefer)
5. Keep it **Private** (since this contains your personal app)
6. **Don't** initialize with README (we'll push existing code)
7. Click "Create repository"

## Step 2: Connect Your Replit to GitHub

In your Replit project:

1. Open the Shell tab (bottom of the screen)
2. Run these commands one by one:

```bash
# Initialize git if not already done
git init

# Add all files to git
git add .

# Make your first commit
git commit -m "Initial commit - Read It Later app"

# Add your GitHub repository as remote (replace YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/read-it-later-app.git

# Push to GitHub
git push -u origin main
```

**Note**: Replace `YOUR-USERNAME` with your actual GitHub username.

## Step 3: Set up Netlify Deployment

### Option A: Connect via GitHub (Recommended)

1. Go to [netlify.com](https://netlify.com) and sign up/log in
2. Click "Add new site" → "Import an existing project"
3. Choose "Deploy with GitHub"
4. Authorize Netlify to access your GitHub account
5. Select your `read-it-later-app` repository
6. Configure build settings:
   - **Base directory**: Leave blank
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
7. Click "Deploy site"

### Option B: Manual Deploy (Alternative)

1. In Replit, run: `npm run build`
2. This creates a `dist` folder with your built app
3. Download the `dist` folder contents
4. Go to Netlify and drag/drop the folder to deploy

## Step 4: Set up Environment Variables in Netlify

Your app needs a database connection. You have two options:

### Option A: Use Your Existing Supabase Database

1. In Netlify, go to your site dashboard
2. Click "Site settings" → "Environment variables"
3. Add this variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Your Supabase database URL (same one you're using now)

### Option B: Create a New Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy the connection string from Settings → Database
3. Add it to Netlify as `DATABASE_URL`

## Step 5: Configure Netlify for Single Page App

Create a file called `_redirects` in your `client/public` folder:

```
/*    /index.html   200
```

This ensures your React routes work properly on Netlify.

## Step 6: Set up Database Schema

Since Netlify will be using a database, you need to set up the tables:

1. In your new database (if you created one), run these SQL commands:

```sql
-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create articles table
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    content TEXT,
    domain VARCHAR(255),
    tag VARCHAR(100) DEFAULT 'untagged',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_articles_tag ON articles(tag);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_api_key ON users(api_key);
```

## Step 7: Update Build Configuration

Create a `netlify.toml` file in your project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Step 8: Deploy and Test

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Add Netlify configuration"
   git push
   ```

2. Netlify will automatically rebuild and deploy

3. Test your new Netlify URL:
   - Create a new account or use your existing credentials
   - Try saving an article
   - Test the iOS sharing functionality

## Step 9: Set up Custom Domain (Optional)

If you have a custom domain:

1. In Netlify, go to "Domain settings"
2. Click "Add custom domain"
3. Follow the DNS setup instructions
4. Netlify will automatically provide SSL certificates

## Ongoing Workflow

Once set up, your workflow becomes:

1. Make changes in Replit
2. Test locally
3. Push to GitHub: `git push`
4. Netlify automatically rebuilds and deploys
5. Your production site updates automatically

## Benefits of This Setup

- **Redundancy**: Two deployment options (Replit + Netlify)
- **Version Control**: Full git history of your changes
- **Scaling**: Netlify can handle more traffic than Replit
- **Custom Domains**: Easy to set up your own domain
- **CDN**: Netlify provides global content delivery
- **Free Tier**: Netlify's free tier is generous for personal projects

## Troubleshooting

**Build fails**: Check that `npm run build` works locally in Replit first
**404 errors**: Make sure the `_redirects` file is in place
**Database connection**: Verify your `DATABASE_URL` is correct in Netlify settings
**API routes not working**: Netlify only serves static files - you'd need Netlify Functions for API routes

## Next Steps

After deployment, you can:
- Set up GitHub Actions for automated testing
- Configure branch previews in Netlify
- Add monitoring and analytics
- Set up automated backups of your database

Your Read-It-Later app will now be available on both Replit and Netlify, giving you maximum flexibility and reliability!