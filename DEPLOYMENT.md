# World Cup App - Vercel Deployment Guide

This document outlines the exact step-by-step process required to correctly deploy the World Cup betting application to Vercel.

## Pre-deployment Checklist (Completed)
The codebase has already been prepared for production:
- The database provider in `prisma/schema.prisma` was switched from `sqlite` to `postgresql`.
- The local SQLite `dev.db` database and `migrations` folder were deleted to prevent conflicts.
- A `postinstall` script (`"prisma generate"`) was added to `package.json` to ensure the Prisma client builds correctly on Vercel.

> [!WARNING]  
> Because the application now requires PostgreSQL, running it locally will fail until you provide a URL to a real Postgres database in your `.env` file!

---

## Step 1: Upload to GitHub
1. Commit all your latest changes (including `package.json`, `schema.prisma` and the deleted database files).
2. Push the repository to your GitHub account.

## Step 2: Import into Vercel
1. Go to [Vercel](https://vercel.com/) and sign in with your GitHub account.
2. Click **"Add New"** -> **"Project"**.
3. Locate your newly pushed World Cup App repository and click **"Import"**.

## Step 3: Setup the Database (Vercel Postgres)
Before clicking "Deploy", you need to attach a real production database.
1. On the Vercel Import screen, switch to the **"Storage"** tab (this can be opened in a new window to not lose your place).
2. Click **"Create Database"** and select **"Postgres"**.
3. Name it (e.g., `world-cup-db`) and click "Create".
4. Vercel will automatically inject multiple environment variables (like `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`) back into your project! 
   *(You can verify this by checking the project's Environment Variables page).*

## Step 4: Configure the Build Command
To ensure the new database tables and schemas are created, update the build command.
1. Under **"Build and Output Settings"** on the Vercel deployment page, override the default "Build Command".
2. Enter the following exact command:
   ```
   npx prisma db push && next build
   ```
   *(Note: Client generation is now handled automatically by the `postinstall` script).*

## Step 5: Add Environment Variables
Expand the **Environment Variables** section and add the keys your project needs to function:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `API_KEY` | `1ac86921ed3c7547a38950cc81243cef` | Used for API Football |
| `API_FOOTBALL_KEY` | `1ac86921ed3c7547a38950cc81243cef` | Used for API Football |
| `SYNC_SECRET` | `wc2026-sync-secret` | For securely triggering syncs |
| `JWT_SECRET` | *(Random String)* | Used for secure sessions. Create a new secure random string for production. |

*(Note: `POSTGRES_...` variables will already be present from Step 3).*

## Step 6: Deploy!
1. Click the big **"Deploy"** button.
2. Vercel will process the `postinstall`, execute `prisma db push` to generate your database schema in Postgres, and build the Next.js app.
3. Once completed, you will receive your live `.vercel.app` URL.

> [!TIP]  
> **Post-Deployment Data Loading**
> Your newly created Postgres database will be completely empty. Once Vercel finishes deploying, navigate to your live URL, register/log in as an admin account, and press the Sync buttons in the Admin Panel to fetch all accurate API data (Teams, Games, Players) into your live production database.
