# Supabase Database Setup Guide

## Step 1: Get Your Database Connection String

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Select your project (or create a new one if you haven't)
3. Click the **"Connect"** button in the top toolbar
4. In the connection dialog, go to **"Connection string"** → **"Transaction pooler"**
5. Copy the URI that looks like:
   ```
   postgresql://postgres.abc123:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with your actual database password

## Step 2: Add Database URL to Replit

1. In Replit, go to the **Secrets** tab (lock icon in left sidebar)
2. Click **"+ New Secret"**
3. Name: `DATABASE_URL`
4. Value: Your complete connection string from Step 1
5. Click **"Add Secret"**

## Step 3: Create Database Tables

Once you add the DATABASE_URL secret, I'll run the database migrations to create the necessary tables:
- `users` table (for authentication)
- `articles` table (for saved articles)

## Step 4: Test the Connection

After setup, we'll test by:
1. Starting the app
2. Creating a test user account
3. Saving a test article
4. Verifying everything works

## What This Gives You

- **Free tier**: 500MB storage, 2GB bandwidth/month
- **Automatic backups**: 7 days retention
- **Real-time features**: If we add them later
- **Built-in authentication**: We're using our custom auth but could switch to Supabase Auth later

Ready to start? Just add the DATABASE_URL secret and let me know when it's done!