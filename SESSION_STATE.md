# ⚽ World Cup 2026 Betting App — Distilled Session State

> **Purpose:** Everything a future AI conversation needs to understand this codebase instantly.  
> **Last updated:** 2026-06-11 (Tournament Day 1)  
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

## 3. Project Structure

```
src/
├── app/
│   ├── actions/          # Server actions
│   │   ├── admin.ts      # ~400 lines: time override, scores, teams, players, results, snapshots, master reset
│   │   ├── auth.ts       # Login/register/logout actions
│   │   ├── bets.ts       # Save group-stage bets (rankings, champion, top scorer, winner/loser)
│   │   ├── group.ts      # Create/join groups
│   │   ├── knockout.ts   # Save knockout match bets (respects per-game lock)
│   │   └── language.ts   # Toggle EN/HE cookie
│   ├── admin/            # Admin panel page (simulation, overrides, CRUD)
│   ├── api/
│   │   ├── auth/google/  # OAuth initiation + callback
│   │   ├── game-predictions/ # GET: fetch predictions for a game (used by Match Center)
│   │   ├── simulate/exit/    # Exit simulation mode
│   │   └── sync/
│   │       ├── route.ts      # ★ MAIN CRON: scores + player goals + group standings (every 5 min)
│   │       ├── init/         # One-time: import all teams + group games from API
│   │       ├── knockout/     # One-time: import knockout fixtures from API
│   │       └── players/      # One-time: deep scan squads for Golden Boot dropdown
│   ├── bets/
│   │   ├── page.tsx          # Hub: links to group-stage and knockout
│   │   ├── group-stage/      # Group ranking drag/drop + special picks form
│   │   └── knockout/         # Knockout score predictions with per-game locks
│   ├── dashboard/            # Personal points breakdown, change nickname, delete account
│   ├── group/                # Group list, create/join, leaderboard
│   │   └── [groupId]/        # Group detail + [userId]/ user profile within group
│   ├── login/                # Login form + Google OAuth button
│   ├── register/             # Registration with optional invite code auto-join
│   ├── rules/                # Static scoring rulebook
│   ├── team/[teamId]/        # Team history page
│   ├── layout.tsx            # Root layout: navbar, mobile nav, language toggle
│   ├── page.tsx              # ★ HOME: hero, points card, group rankings, Match Center
│   ├── error.tsx             # Global error boundary
│   ├── loading.tsx           # Global loading spinner
│   └── globals.css           # Design system: variables, components, responsive
├── components/
│   ├── MatchCenter.tsx       # Client component: horizontal match cards + prediction panel
│   ├── MobileNav.tsx         # Hamburger menu with slide-in drawer
│   ├── LanguageToggle.tsx    # EN/HE toggle button
│   ├── CopyButton.tsx        # Copy-to-clipboard utility
│   ├── SearchableSelect.tsx  # Wrapper around react-select
│   ├── PointsBreakdownCard.tsx # Detailed scoring card (used in group user profiles)
│   └── ShareBreakdownButton.tsx # Share point breakdown
├── hooks/
│   └── useUnsavedChanges.ts  # beforeunload warning for dirty forms
└── lib/
    ├── auth.ts               # JWT sign/verify, session cookie helpers
    ├── prisma.ts             # Prisma client singleton
    ├── lockTime.ts           # Time override, group lock, knockout lock, group standings derivation
    ├── scoring.ts            # ★ CORE: calculateUserPoints, fetchGlobalScoringData, getUserRankingsInGroup
    └── i18n/
        ├── index.ts          # Cookie-based language detection
        ├── en.json           # English dictionary
        └── he.json           # Hebrew dictionary
```

---

## 4. Database Schema (Prisma)

### Models & Relations

```
User ──< Member >── Group          (many-to-many via Member)
User ──< GroupRankingBet           (one per group letter per user)
User ──< ChampionBet              (one per user)
User ──< TopScorerBet             (one per user)
User ──< WinnerLoserBet           (one per user)
User ──< GameBet >── Game         (one per user per game)
Team ──< Player                   (one-to-many)
Team ──< Game (home/away)         (two relations)
TournamentResult                  (key-value store for Champion, Group standings, overrides, snapshots)
```

### Key DB Design Decisions

- **TournamentResult** is a flexible key-value store. Keys include: `Champion`, `Group_A`..`Group_L`, `Undefeated`, `Winless`, `TimeOverride`, `KnockoutLockOverride`, `BaseSnapshot`.
- **Game.stage** values: `Group`, `R32`, `R16`, `QF`, `SF`, `3rd`, `Final`
- **Team.group** stores the group letter (A–L). WC 2026 has 12 groups of 4 (48 teams).
- Cascading deletes are configured for User → bets and Team → games → bets.

---

## 5. Scoring System (Deep Detail)

Implemented in `src/lib/scoring.ts`:

| Category | Points | Logic |
|----------|--------|-------|
| **Group Rankings** (per group) | 0–6 | Kendall-Tau distance: `max(0, 6 - distance)`. 6 = perfect match. |
| **Tournament Champion** | 10 | Exact match with `TournamentResult['Champion']` |
| **Golden Boot** | goals + bonus | 1 pt per goal scored by picked player + 1 bonus if they're the top scorer |
| **Undefeated Team** | 3 | Picked team won all 3 group games (or admin override) |
| **Winless Team** | 3 | Picked team lost all 3 group games (or admin override) |
| **Knockout Match** | 0–4 | +2 correct direction, +1 exact home score, +1 exact away score |
| **Final Multiplier** | ×2 | Knockout points doubled for the Final |

### Performance Optimization

- `fetchGlobalScoringData()` runs all shared DB queries in a single `Promise.all` (7 parallel queries).
- This cached `GlobalScoringData` object is passed to every `calculateUserPoints()` call on a page — no redundant DB hits.
- Group standings are derived on-the-fly via `deriveGroupStandings()` (wins → GD → GF tiebreaker).

---

## 6. Lock Timing System

Implemented in `src/lib/lockTime.ts`:

| Lock Type | Trigger | Effect |
|-----------|---------|--------|
| **Group Stage Lock** | 1h before first group game kickoff | All group rankings + special picks become read-only |
| **Knockout Game Lock** | 1h before each game's kickoff | That specific game bet becomes read-only |
| **Knockout Override** | Admin sets `KnockoutLockOverride` to `Locked`/`Unlocked` | Overrides all per-game locks |
| **Time Override** | Admin sets `TimeOverride` to an ISO date string | `getEffectiveNow()` returns this instead of real time |

---

## 7. Match Center

**Server-side** (in `page.tsx`): Queries games that are:
- Finished in the last 24h (by estimated end time = kickoff + 105 min)
- Locked and not finished (kickoff within 1h from now)

**Client-side** (`MatchCenter.tsx`): Horizontal scrollable cards with status badges:
- 🔴 **Live** — kickoff ≤ now < kickoff + 105 min, not finished
- 🔵 **Upcoming** — kickoff > now (but within 1h, so already locked)
- ✅ **Finished** — `isFinished = true`

Clicking a card fetches `/api/game-predictions` to show all group members' predictions + earned points.

### ⚠️ Known Issue: No live scores during matches
The sync API only writes scores to DB after `isFinished = true`. During a live match, scores remain `null`. Fix: use `fixture.goals.home/away` for in-progress games.

---

## 8. Data Sync Pipeline

### Automated (Vercel Cron — `/api/sync`)
- Runs every 5 minutes (requires Vercel Pro plan)
- Fetches ALL fixtures from `API-Football` league=1, season=2026
- Matches games by home/away team names (case-insensitive)
- Updates: kickoff times, scores (only when finished), `isFinished` flag
- Fetches top scorers and updates player `goalsScored`
- Auto-derives and stores group standings for completed groups

### One-Time Admin Actions
- `/api/sync/init` — Import all teams + group games
- `/api/sync/knockout` — Import knockout fixtures
- `/api/sync/players` — Deep scan squad rosters for Golden Boot picker

---

## 9. Auth System

- **JWT-based** with HTTP-only cookies (`auth_token`, 7-day expiry)
- **Google OAuth** flow: `/api/auth/google` → Google consent → `/api/auth/google/callback` → upsert user by `googleId` → set cookie → redirect home
- **Email/password** registration also supported (`bcryptjs`)
- Invite codes preserved through OAuth via the `state` parameter
- Admin check: `user.isAdmin === true` (set via DB seed script)

---

## 10. i18n

- Cookie-based (`lang` cookie), defaults to `en`
- Two languages: English (`en.json`, ~11KB) and Hebrew (`he.json`, ~17KB)
- RTL support via `dir={lang === 'he' ? 'rtl' : 'ltr'}` on `<main>`
- Team and player name dictionaries embedded in the language files (e.g., `teams["Germany"]` → `"גרמניה"`)

---

## 11. Admin Panel Capabilities

- **Time Override**: Freeze/set app time for testing
- **Match Management**: Create/edit/delete games, update scores, change kickoff times
- **Team Management**: Create/edit/delete teams, reassign groups
- **Player Management**: Create/rename/delete players, update goal counts
- **Tournament Results**: Set champion, undefeated/winless overrides, group rankings
- **Simulation Timeline**: 9-step simulation of the entire tournament flow
- **Snapshot/Restore**: Save base data state, master reset to snapshot

---

## 12. Environment Variables

| Variable | Used For |
|----------|----------|
| `PRISMA_DATABASE_URL` | PostgreSQL connection (pooled, used by Prisma) |
| `POSTGRES_URL_NON_POOLING` | Direct PostgreSQL connection (for migrations) |
| `API_KEY` / `API_FOOTBALL_KEY` | API-Football authentication |
| `SYNC_SECRET` | Secret for manual sync trigger |
| `JWT_SECRET` | JWT signing key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CRON_SECRET` | Vercel Cron authorization (auto-injected by Vercel) |

---

## 13. Known Issues & Gotchas

1. **Live scores during matches** — Sync API only writes scores after match ends. Fix: use `fixture.goals` for in-progress games.
2. **game-predictions lock check** — Uses `new Date()` instead of `getEffectiveNow()`. Inconsistent with rest of codebase.
3. **No client-side auto-refresh** — Match Center only updates on page reload. No WebSocket/polling for live updates.
4. **Group standings require exactly 6 finished games** — `deriveGroupStandings()` returns `null` if < 6 group games finished. WC 2026 has 4 teams per group → 6 round-robin games.
5. **Team name matching in sync** — Case-insensitive exact match. If API-Football uses different team names than the DB, matches won't be found (but partial matching exists for player names).
6. **Vercel Cron limits** — Free plan allows 1 cron/day. Pro plan ($20/mo) required for the 5-minute interval. The cron schedule is already set to `*/5 * * * *` in `vercel.json`.
7. **Build command** — `vercel.json` overrides to `npx prisma db push --accept-data-loss && next build` (ensures schema sync on every deploy).

---

## 14. File Quick Reference

| Need to... | File |
|------------|------|
| Understand scoring | [scoring.ts](file:///c:/Users/user/Documents/world_cup_app/src/lib/scoring.ts) |
| Understand lock timing | [lockTime.ts](file:///c:/Users/user/Documents/world_cup_app/src/lib/lockTime.ts) |
| Modify the sync/cron | [sync/route.ts](file:///c:/Users/user/Documents/world_cup_app/src/app/api/sync/route.ts) |
| See the home page | [page.tsx](file:///c:/Users/user/Documents/world_cup_app/src/app/page.tsx) |
| Edit Match Center | [MatchCenter.tsx](file:///c:/Users/user/Documents/world_cup_app/src/components/MatchCenter.tsx) |
| Change DB schema | [schema.prisma](file:///c:/Users/user/Documents/world_cup_app/prisma/schema.prisma) |
| Admin actions | [admin.ts](file:///c:/Users/user/Documents/world_cup_app/src/app/actions/admin.ts) |
| Auth system | [auth.ts](file:///c:/Users/user/Documents/world_cup_app/src/lib/auth.ts) |
| Knockout bets | [knockout.ts](file:///c:/Users/user/Documents/world_cup_app/src/app/actions/knockout.ts) |
| Deploy config | [vercel.json](file:///c:/Users/user/Documents/world_cup_app/vercel.json) |
| Styling | [globals.css](file:///c:/Users/user/Documents/world_cup_app/src/app/globals.css) |
