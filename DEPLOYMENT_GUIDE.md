# LiveBid Deployment Guide - Render + Vercel

Complete step-by-step guide to deploy your auction platform online.

---

## Overview

| Part | Platform | URL After Deploy |
|------|----------|-----------------|
| Backend (Node.js + Socket.io) | Render | `https://your-app.onrender.com` |
| Frontend (React) | Vercel | `https://your-app.vercel.app` |

---

## Prerequisites

Before starting:
1. **GitHub Account** - Push your code to GitHub first
2. **Render Account** - Free at https://render.com
3. **Vercel Account** - Free at https://vercel.com

---

## Step 1: Push Code to GitHub

### 1.1 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `livebid-auction` (or any name)
3. Keep it **Public** or **Private** (your choice)
4. Click **"Create repository"**

### 1.2 Push Your Code

Open terminal in your project folder (`c:\Users\techg\Desktop\Levich`):

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Live bidding platform"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/livebid-auction.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Render

### 2.1 Create Render Account

1. Go to https://render.com
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended for easy repo access)

### 2.2 Create New Web Service

1. From Render Dashboard, click **"New +"** → **"Web Service"**

2. **Connect Repository:**
   - Click **"Connect a repository from GitHub"**
   - Authorize Render to access your repos
   - Select your `livebid-auction` repository

3. **Configure the Service:**

   | Field | Value |
   |-------|-------|
   | **Name** | `livebid-server` (or any name) |
   | **Region** | Choose closest to your users |
   | **Branch** | `main` |
   | **Root Directory** | `packages/server` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node src/index.js` |

4. **Select Free Plan:**
   - Scroll down to "Instance Type"
   - Select **"Free"** ($0/month)

5. **Add Environment Variables:**
   
   Click **"Advanced"** → **"Add Environment Variable"**
   
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
   | `CLIENT_URL` | `https://your-vercel-app.vercel.app` *(update after Vercel deploy)* |

6. Click **"Create Web Service"**

### 2.3 Wait for Deploy

- Render will clone your repo and build
- Takes 2-5 minutes for first deploy
- You'll see logs in the dashboard
- When done, you'll see: **"Your service is live 🎉"**

### 2.4 Get Your Backend URL

After deploy, Render gives you a URL like:
```
https://livebid-server.onrender.com
```

**Copy this URL** - you'll need it for Vercel!

### 2.5 Test Backend

Open in browser:
```
https://livebid-server.onrender.com/health
```

You should see:
```json
{"status":"ok","serverTime":1234567890,"uptime":123.45}
```

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account

1. Go to https://vercel.com
2. Click **"Sign Up"**
3. Sign up with **GitHub** (recommended)

### 3.2 Import Project

1. From Vercel Dashboard, click **"Add New..."** → **"Project"**

2. **Import Git Repository:**
   - Find your `livebid-auction` repository
   - Click **"Import"**

3. **Configure Project:**

   | Field | Value |
   |-------|-------|
   | **Project Name** | `livebid-client` (or any name) |
   | **Framework Preset** | `Vite` (should auto-detect) |
   | **Root Directory** | Click "Edit" → Select `packages/client` |
   | **Build Command** | `npm run build` (default) |
   | **Output Directory** | `dist` (default) |

4. **Add Environment Variables:**
   
   Click **"Environment Variables"** and add:
   
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://livebid-server.onrender.com` *(your Render URL)* |

   > ⚠️ **Important:** Use your actual Render URL from Step 2.4!

5. Click **"Deploy"**

### 3.3 Wait for Deploy

- Vercel builds very fast (usually under 1 minute)
- You'll see build logs
- When done, you'll see: **"Congratulations!"**

### 3.4 Get Your Frontend URL

After deploy, Vercel gives you a URL like:
```
https://livebid-client.vercel.app
```

---

## Step 4: Update Backend CORS (Important!)

Now go back to Render and update the `CLIENT_URL`:

1. Go to https://dashboard.render.com
2. Click on your `livebid-server` service
3. Go to **"Environment"** tab
4. Find `CLIENT_URL` and update it:
   ```
   https://livebid-client.vercel.app
   ```
5. Click **"Save Changes"**
6. Render will automatically redeploy (takes 1-2 mins)

---

## Step 5: Test Your Deployed App! 🎉

1. Open your Vercel URL in browser:
   ```
   https://livebid-client.vercel.app
   ```

2. You should see the auction dashboard!

3. Open in **two different browser windows** (or use incognito)

4. Try bidding on an item and see real-time updates!

---

## Troubleshooting

### Problem: Frontend can't connect to backend

**Check 1:** CORS URL matches
- Render's `CLIENT_URL` must exactly match your Vercel URL
- Include `https://` but NO trailing slash

**Check 2:** Environment variable is set correctly
- In Vercel, check `VITE_API_URL` is your Render URL
- After changing env vars, you must **redeploy**

### Problem: "Connecting..." forever

**Socket.io on free tier:**
- Render free tier spins down after 15 mins of inactivity
- First request after sleep takes 30-60 seconds to "wake up"
- This is normal for free tier

### Problem: Build fails on Render

**Check Root Directory:**
- Make sure you set `packages/server` as root directory
- NOT the repository root

### Problem: Build fails on Vercel

**Check these:**
1. Root directory is `packages/client`
2. Framework is `Vite`
3. `VITE_API_URL` has no trailing slash

---

## Free Tier Limitations

### Render Free Tier
- ❌ Service sleeps after 15 mins of inactivity
- ❌ Slow cold starts (30-60 seconds to wake up)
- ✅ 750 hours/month free
- ✅ Auto-deploys on git push

### Vercel Free Tier
- ✅ No sleep (always fast)
- ✅ Unlimited static hosting
- ✅ Auto-deploys on git push
- ✅ Great for React apps

### Upgrade Options
- Render Starter: $7/month - No sleep, faster
- Vercel Pro: $20/month - More build minutes

---

## Automatic Redeployment

Both platforms auto-deploy when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Update feature"
git push

# Both Render and Vercel will auto-deploy! 🚀
```

---

## Quick Reference

| Item | URL |
|------|-----|
| **Live App** | `https://livebid-client.vercel.app` |
| **Backend API** | `https://livebid-server.onrender.com` |
| **Health Check** | `https://livebid-server.onrender.com/health` |
| **Items API** | `https://livebid-server.onrender.com/api/items` |
| **Render Dashboard** | https://dashboard.render.com |
| **Vercel Dashboard** | https://vercel.com/dashboard |

---

## Summary Checklist

- [ ] Push code to GitHub
- [ ] Create Render account → Deploy backend → Get URL
- [ ] Create Vercel account → Deploy frontend with `VITE_API_URL`
- [ ] Update Render's `CLIENT_URL` with Vercel URL
- [ ] Test the live app!

Good luck with your deployment! 🎉
