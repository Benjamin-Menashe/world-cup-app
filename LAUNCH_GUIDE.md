# 🚀 World Cup 2026 App - Go-Live Launch Guide

This guide contains the **exact instructions** you need to transition your application from the free tier to a production-ready, fully automated state when the World Cup starts in 2 months. 

## 1. Upgrade Vercel Account
* **Why:** The Vercel Hobby (Free) plan is strictly limited to 1 cron job execution per day. To have live scores updated during the matches, you need more frequent updates.
* **Action:** Upgrade your Vercel account to the **Pro Plan ($20/mo)**.
* **Code Change Required:** Once upgraded, you can change the poll rate back to every 5 minutes.
    * Open `vercel.json` in the root of the project.
    * Change the schedule back to every 5 minutes:
      ```json
      {
        "crons": [
          {
            "path": "/api/sync",
            "schedule": "*/5 * * * *"
          }
        ]
      }
      ```
    * Commit and push this change to GitHub.

## 2. Upgrade API-Football Account
* **Why:** The free tier of API-Football limits the number of requests you can make per day (100) and may restrict specific data. Polling every 5 minutes equals ~288 requests/day.
* **Action:** Subscribe to the **Pro plan ($19/mo)** or higher on API-Football.
* **Code Change Required:** 
    * Copy your new API key from the API-Football dashboard.
    * Go to your **Vercel Project Settings > Environment Variables**.
    * Update the values for both `API_KEY` and `API_FOOTBALL_KEY` to the new paid key.
    * Redeploy the app from Vercel to apply the new environment variables perfectly.

## 3. Publish Google OAuth App
* **Why:** By default, Google OAuth apps start in "Testing" mode. This mode has two severe limitations:
    1. Only specifically listed "Test Users" can sign in.
    2. Refresh/Session tokens may expire faster.
* **Action:** Publish the app to Production so anyone can sign in.
    * Go to the [Google Cloud Console](https://console.cloud.google.com/).
    * Ensure your `WC2026` project is selected.
    * Go to **APIs & Services > OAuth consent screen**.
    * Click the **"Publish App"** button under the "Publishing status" section to change it from "Testing" to "In production".
* **Do I need Google Verification?** **NO.** Because this app only requests basic, non-sensitive scopes (`email`, `profile`, `openid`), you do not need to go through the lengthy Google app verification process. It will work immediately as soon as you click Publish.

## 4. Final Data Reset (CRITICAL)
* **Why:** You have been testing the app with fake data, simulated scores, and test accounts. You need a clean slate before your friends join.
* **Action:**
    * Log in to the application as your Admin user.
    * Go to the `/admin` dashboard.
    * Scroll to the Simulation Timeline section and click **"Exit Sim & Master Reset"**. This completely wipes all test matches, test bets, and simulated results, resetting everything to official starting data.
    * Inform your friends that the app is ready and share the invite links!

---

*Note: The Vercel Postgres Database (free tier) provides 256MB of storage and 60 hours of compute/month, which is generally plenty for an app storing text metadata and small numbers (scores). You likely will NOT need to upgrade this element.*
