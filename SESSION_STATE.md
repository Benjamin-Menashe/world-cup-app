# ⚽ World Cup 2026 Betting App — Distilled Session State

> **Purpose:** Everything a future AI conversation needs to understand this codebase instantly.  
> **Last updated:** 2026-06-17
> **Status:** Production on Vercel, live at a `.vercel.app` domain

---

## 1. What This App Does

A social World Cup betting app where friends create private groups, predict match outcomes and tournament results, and compete on leaderboards. Two main betting phases:

1. **Group Stage Bets** (locked 1h before first match): Rank all 12 groups A–L, pick champion, top scorer, undefeated team, winless team.
2. **Knockout Bets** (each locks 1h before its kickoff): Predict exact 90-minute scorelines for every knockout match.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Server Components) | 16.1.7 |
| Database | PostgreSQL via Prisma ORM | Prisma 6.4.1 |
| Auth | JWT + bcrypt + Google OAuth (HTTP-only cookies, 7-day expiry) | jsonwebtoken 9.x |
| Styling | Vanilla CSS + CSS custom properties + Outfit font | — |
| Icons | Lucide React | 0.577.0 |
| Dropdowns | React Select | 5.10.2 |
| External API | API-Football (api-sports.io) | v3 |
| Hosting | Vercel (Pro plan needed for cron) | — |
| Language | TypeScript, React 19 | — |

---

## 3. Core Architecture Decisions

### Database Schema (Prisma)
- **TournamentResult** is a flexible key-value store. Keys include: `Champion`, `Group_A`..`Group_L`, `Undefeated`, `Winless`, `TimeOverride`, `KnockoutLockOverride`, `BaseSnapshot`, and `ProcessedGames` (for sync deduplication).
- **Game.stage** values: `Group`, `R32`, `R16`, `QF`, `SF`, `3rd`, `Final`
- **Team.group** stores the group letter (A–L). WC 2026 has 12 groups of 4 (48 teams).

### Scoring System
- **Golden Boot**: 1 pt per goal scored + 1 bonus if top overall. Goals are tracked via `Player.goalsScored`.
- **Performance Optimization**: `fetchGlobalScoringData()` runs all shared DB queries in a single `Promise.all`. Group standings are derived on-the-fly.

### Data Sync Pipeline (Automated via Cron)
- Runs every 5 minutes (`/api/sync`).
- **Game Scores**: Updates kickoff times and fulltime scores only when finished.
- **Player Goals**: Uses an **event-based backfill**. When a game flips from "live" to "finished", it fetches match events exactly once (`fixtures/events`), counts "Normal Goal" and "Penalty" events, and increments player goals. Deduplicated via `ProcessedGames` in `TournamentResult`.

---

## 4. Current State

### Functional State
- ✅ **User Bets**: Group stage and knockout betting fully working.
- ✅ **Scoring**: Point calculations for all categories are accurate.
- ✅ **Automated Sync**: The cron job successfully fetches scores and deduplicates event-based player goals.
- ✅ **Admin Panel**: "Step 4" button is mapped to `/api/sync?force=true` and can reliably backfill player goals for already-finished games.

### Known Issues / Broken States
1. **Live scores during matches** — Sync API only writes scores after match ends. Fix: use `fixture.goals` for in-progress games.
2. **game-predictions lock check** — Uses `new Date()` instead of `getEffectiveNow()`. Inconsistent with rest of codebase.
3. **No client-side auto-refresh** — Match Center only updates on page reload.

---

## 5. Next Immediate Steps

1. **[Backfill]**: The user needs to click the "Step 4" sync button in the admin panel to backfill the player goals for the 20 games that finished prior to the event-based sync implementation.
2. **[Fix Live Scores]**: Update the sync API and UI to display `fixture.goals.home/away` for in-progress games so users can see live updates.
3. **[Standardize Time]**: Refactor `game-predictions` to use `getEffectiveNow()` instead of `new Date()` for correct lock checking during time-override testing.
