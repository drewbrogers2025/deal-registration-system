# Vercel Environment Variables Setup

This document contains the environment variables needed to deploy the Deal Registration System on Vercel.

## 🔧 Required Environment Variables

Add these environment variables in your Vercel project dashboard:

### 1. NEXT_PUBLIC_SUPABASE_URL
```
https://xnyyanfulgvcsgjiyfyb.supabase.co
```

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhueXlhbmZ1bGd2Y3Nnaml5ZnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTgzMTIsImV4cCI6MjA2NzkzNDMxMn0.iOR4d3e3UROwqkKZIOTFHDXuK4vVLs9LaSOj2Thz2WE
```

### 3. SUPABASE_SERVICE_ROLE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhueXlhbmZ1bGd2Y3Nnaml5ZnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1ODMxMiwiZXhwIjoyMDY3OTM0MzEyfQ._yNXsOB27XY9IcGTM52372EPV7ynmAcHa_CjAtxeD6w
```

## 📋 Setup Instructions

### Step 1: Access Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your `deal-registration-system` project

### Step 2: Open Environment Variables Settings
1. Click on your project
2. Go to **Settings** tab
3. Click on **Environment Variables** in the sidebar

### Step 3: Add Each Variable
For each environment variable above:
1. Click **Add New**
2. Enter the **Name** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. Enter the **Value** (copy from above)
4. Select **All Environments** (Production, Preview, Development)
5. Click **Save**

### Step 4: Redeploy
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger automatic deployment

## 🔒 Security Notes

- ✅ **`NEXT_PUBLIC_*` variables** are safe to expose to the client
- ✅ **`SUPABASE_SERVICE_ROLE_KEY`** is server-only and won't be exposed
- ✅ These values match your local `.env.local` file

## 🚀 Optional Variables

You may also want to add:

### NEXT_PUBLIC_APP_URL
```
https://your-vercel-app-url.vercel.app
```
(Replace with your actual Vercel deployment URL)

### NEXTAUTH_SECRET
```
your-random-secret-string-here
```
(Generate a random secret if using NextAuth in the future)

## ✅ Verification

After setup:
1. ✅ Build completes successfully
2. ✅ Authentication functionality works
3. ✅ Database connections are established
4. ✅ All pages load without errors

## 📞 Support

If you encounter issues:
1. Check that all variable names are spelled correctly
2. Verify values are copied exactly (no extra spaces)
3. Ensure all environments are selected
4. Try redeploying after adding variables
