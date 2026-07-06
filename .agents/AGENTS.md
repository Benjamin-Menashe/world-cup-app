# ⚽ World Cup 2026 Betting App — Agent Onboarding

> **Read this file first.** It is the single entry point for any AI agent working on this codebase.
> For deep technical details, see [ARCHITECTURE.md](./ARCHITECTURE.md).
> Last updated: 2026-07-06

---

## 1. What This App Is

A **social World Cup betting web app** where friends create private groups, predict match outcomes and tournament results, and compete on leaderboards. It is **live in production** on Vercel during the FIFA World Cup 2026 (June–July 2026).

**Users** register (email/password or Google OAuth), join "friend groups" via 6-character invite codes, and place two types of bets:

1. **Group Stage Bets** (locked 1 hour before the first match of the tournament):
   - Rank all 12 groups (A–L) in predicted finish order
   - Pick: Tournament Champion, Golden Boot (top scorer), Undefeated Team, Winless Team

2. **Knockout Bets** (each locks 1 hour before its individual kickoff):
   - Predict exact 90-minute scorelines for each knockout match

Points are calculated automatically. Leaderboards show rankings within each friend group.

---

## 2. Tech Stack (Quick Reference)

| Layer | Technology | Key Detail |
|-------|-----------|------------|
| Framework | **Next.js 16** (App Router) | Server Components + Server Actions |
| Database | **PostgreSQL** via **Prisma ORM 6.4** | Hosted on Vercel Postgres |
| Auth | **JWT + bcrypt + Google OAuth** | HTTP-only cookie, 7-day expiry |
| Styling | **Vanilla CSS** | CSS custom properties, `Outfit` font. **No Tailwind.** |
| API | **API-Football** (api-sports.io, v3) | Live scores & player goals |
| Hosting | **Vercel** (Pro plan) | Cron jobs every 5 min for sync |
| Language | **TypeScript**, React 19 | Internationalization: English + Hebrew |

---

## 3. Project Structure

```
world_cup_app/
├── prisma/
│   ├── schema.prisma          # Database schema (THE source of truth for all models)
│   ├── seed.js                # Seeds teams, groups, matches from API
│   └── seed-admin.js          # Creates admin account
├── src/
│   ├── app/
│   │   ├── actions/           # Server Actions (the write layer)
│   │   │   ├── admin.ts       # HUGE file (~466 lines) — all admin mutations
│   │   │   ├── auth.ts        # Login, register, logout, delete account
│   │   │   ├── bets.ts        # Save group-stage bets
│   │   │   ├── knockout.ts    # Save knockout match bets
│   │   │   ├── group.ts       # Create/join/leave friend groups
│   │   │   └── language.ts    # Toggle EN/HE
│   │   ├── admin/             # Admin panel (page.tsx is ~42K — very large)
│   │   ├── api/
│   │   │   ├── sync/route.ts  # ★ CRITICAL: Automated data sync from API-Football
│   │   │   ├── sync/knockout/ # Knockout bracket sync
│   │   │   ├── sync/players/  # Player roster deep-scan
│   │   │   ├── sync/init/     # Initial tournament data load
│   │   │   ├── sync/fix-groups/ # Group correction endpoint
│   │   │   ├── auth/google/   # Google OAuth flow (initiate + callback)
│   │   │   ├── game-predictions/ # Fetch predictions for a specific game
│   │   │   └── simulate/      # Tournament simulation for testing
│   │   ├── bets/              # Bet placement pages (group-stage + knockout)
│   │   ├── dashboard/         # User's personal points breakdown
│   │   ├── game/[gameId]/     # Individual game detail page
│   │   ├── group/             # Friend groups + leaderboard pages
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration (supports invite code in URL)
│   │   ├── rules/             # Scoring rules page
│   │   ├── team/              # Team history pages
│   │   ├── layout.tsx         # Root layout (navbar, session, i18n)
│   │   ├── page.tsx           # Homepage (Match Center)
│   │   └── globals.css        # All global styles
│   ├── components/            # Shared UI components
│   │   ├── MatchCenter.tsx    # Live match display component
│   │   ├── PointsBreakdownCard.tsx # Detailed point breakdown UI
│   │   ├── MobileNav.tsx      # Hamburger menu + slide-in drawer
│   │   ├── SearchableSelect.tsx    # react-select wrapper
│   │   ├── GamePredictionsTabs.tsx # Tabbed predictions view
│   │   ├── CopyButton.tsx     # Copy-to-clipboard utility
│   │   ├── ShareBreakdownButton.tsx
│   │   └── LanguageToggle.tsx # EN/HE switcher
│   ├── hooks/
│   │   └── useUnsavedChanges.ts # Warns before navigating away
│   └── lib/                   # Core utilities (THE business logic lives here)
│       ├── scoring.ts         # ★ CRITICAL: Point calculation engine (~457 lines)
│       ├── lockTime.ts        # ★ CRITICAL: Bet locking logic + group standings
│       ├── auth.ts            # JWT sign/verify, session cookie management
│       ├── prisma.ts          # Prisma client singleton
│       ├── teams.ts           # Name normalization + fuzzy matching
│       └── i18n/              # Internationalization (en.json, he.json)
├── scripts/                   # Diagnostic & testing scripts (Node.js, .mjs)
├── vercel.json                # Cron schedule (every 5 min → /api/sync)
└── package.json               # postinstall: "prisma generate"
```

---

## 4. Critical Files You Must Understand

### `src/lib/scoring.ts` — The Scoring Engine
The heart of the app. Contains:
- `calculateUserPoints()` — Computes a single user's total points + breakdown
- `fetchGlobalScoringData()` — Batches ALL shared DB queries into one `Promise.all` (performance-critical)
- `getUserRankingsInGroup()` — Computes leaderboard for a friend group
- **Kendall-Tau distance** algorithm for group ranking scoring (max 6 pts per group)

### `src/lib/lockTime.ts` — Time & Lock Logic
- `getEffectiveNow()` — Returns admin time override OR real wall clock
- `isGroupStageLocked()` — Group bets lock 1h before first group match
- `deriveGroupStandings()` / `deriveGroupStandingsFromGames()` — Compute standings from game results

### `src/app/api/sync/route.ts` — The Sync Pipeline
Runs every 5 minutes via Vercel Cron. Steps:
1. **Smart early-exit**: Skips API calls if no games are active/recent
2. **Game scores**: Matches API fixtures to DB games by team name + kickoff proximity
3. **Player goals**: Event-based backfill — fetches `/fixtures/events` exactly once per finished game, increments `Player.goalsScored`. Deduplicated via `ProcessedGames` key in `TournamentResult`
4. **Top scorers crosscheck**: Corrects goal counts using API-Football's `/players/topscorers`
5. **Group standings auto-derive**: Stores final standings for completed groups

### `src/lib/teams.ts` — Name Matching
Fuzzy matching for both team names (`teamNamesMatch`) and player names (`playerNamesMatch`). Includes a synonym table for country name variations (e.g., "USA" ↔ "United States", "Turkiye" ↔ "Turkey").

---

## 5. Database Schema (Key Concepts)

### Models
| Model | Purpose |
|-------|---------|
| `User` | Accounts (email/password OR Google OAuth) |
| `Group` / `Member` | Friend leagues (many-to-many via Member) |
| `Team` | 48 national teams, each with a `group` letter (A–L) |
| `Player` | Players with `goalsScored` counter |
| `Game` | Matches. `stage`: Group, R32, R16, QF, SF, 3rd, Final |
| `GroupRankingBet` | User's predicted ranking for one group (JSON array of team IDs) |
| `ChampionBet` | User's champion pick (1 per user) |
| `TopScorerBet` | User's golden boot pick (1 per user) |
| `WinnerLoserBet` | User's undefeated + winless team picks (1 per user) |
| `GameBet` | User's predicted score for one knockout match |
| `TournamentResult` | **Flexible key-value store** for tournament state |

### TournamentResult Keys (Important!)
This model is a **key-value store** — not a single record. Known keys:
| Key | Value Format | Purpose |
|-----|-------------|---------|
| `Champion` | Team ID (string) | Official tournament winner |
| `Group_A` .. `Group_L` | JSON array of team IDs | Official group final standings |
| `Undefeated` | JSON array of team IDs | Admin override for undefeated team(s) |
| `Winless` | JSON array of team IDs | Admin override for winless team(s) |
| `TimeOverride` | JSON ISO date string | Admin time freeze for testing |
| `KnockoutLockOverride` | `"Locked"` or `"Unlocked"` | Admin lock override for knockout bets |
| `ProcessedGames` | JSON array of Game IDs | Tracks which games have had player goals counted |
| `BaseSnapshot` | Large JSON blob | Snapshot of all teams/games/players for master reset |

---

## 6. Scoring System (Complete Rules)

| Category | Points | Logic |
|----------|--------|-------|
| Group ranking (per group) | 0–6 | Kendall-Tau distance: `6 - inversions` |
| Tournament Champion | 10 | Exact match with `TournamentResult.Champion` |
| Golden Boot | 1 per goal + 1 bonus | `Player.goalsScored` + 1 if player is the tournament top scorer |
| Undefeated Team | 3 | Picked team finished groups with 3W-0L (or admin override) |
| Winless Team | 3 | Picked team finished groups with 0W-3L (or admin override) |
| Knockout: correct direction | 2 | Home win / away win / draw matches actual |
| Knockout: exact team score | 1 per team | Predicted score = actual score (per team) |
| Final match | ×2 multiplier | All points for the Final are doubled |

---

## 7. Authentication Flow

- **Email/password**: bcrypt-hashed, stored in `User.password`
- **Google OAuth**: `/api/auth/google/route.ts` → redirects to Google → `/api/auth/google/callback/route.ts` → creates/links user → sets JWT cookie
- **Session**: JWT in HTTP-only cookie (`auth_token`), 7-day expiry
- **Admin check**: Double-verified — JWT claim `isAdmin` + DB lookup `User.isAdmin`
- **No middleware**: Auth is checked per-page/per-action via `getSession()`

---

## 8. Bet Locking Mechanism

- **Group stage bets**: ALL lock simultaneously, 1 hour before the first group match kicks off
- **Knockout bets**: Each locks individually, 1 hour before its own kickoff
- Admin can override via `TimeOverride` (freeze time) or `KnockoutLockOverride` (force lock/unlock all knockout bets)
- `getEffectiveNow()` is the canonical "what time is it" function — always use this, never raw `new Date()`

---

## 9. Data Sync Pipeline (How Scores Update)

```
Vercel Cron (every 5 min)
  → GET /api/sync
    → Smart early-exit check (any active games?)
    → Fetch all fixtures from API-Football
    → Match to DB games by fuzzy team name + kickoff proximity (<48h)
    → Update scores (live: fixture.goals, finished: score.fulltime)
    → For newly-finished games: fetch /fixtures/events, count goals, increment Player.goalsScored
    → Crosscheck with /players/topscorers endpoint
    → Auto-derive and store group standings for completed groups
```

**Deduplication**: The `ProcessedGames` key in `TournamentResult` stores an array of game IDs that have already had their player goal events counted. This prevents double-counting when the cron runs again.

---

## 10. Common Gotchas & Pitfalls

> [!CAUTION]
> **These have caused bugs before. Read carefully.**

1. **Always use `getEffectiveNow()` instead of `new Date()`** for any time-based logic. The admin can freeze time via `TimeOverride`.

2. **Player name matching is fuzzy.** The API returns names like `"H. Kane"` while the DB might store `"Harry Kane"`. The `playerNamesMatch()` function in `teams.ts` handles this, but edge cases exist. If a player's goals aren't being counted, check the matching logic.

3. **`TournamentResult` is a key-value store**, not a single record. Don't treat it like a normal model. Use `upsert` with `where: { key: '...' }`.

4. **The admin page (`admin/page.tsx`) is enormous (~42K)**. It's a single server component. Be surgical when editing it.

5. **Knockout game teams can be null** (TBD until the bracket is determined). Always null-check `homeTeam` and `awayTeam` on `Game`.

6. **The `WinnerLoserBet` model stores BOTH the undefeated pick AND the winless pick** in a single record (`winnerTeamId` = undefeated pick, `loserTeamId` = winless pick). This is confusing — the field names don't match their semantic meaning.

7. **Group standings sorting**: wins desc → goal difference desc → goals scored desc. Implemented in `tallyGroupStandings()` in `lockTime.ts`.

8. **The Final match multiplier (×2)** is applied AFTER computing direction + exact-score points. So a perfect Final prediction is worth `(2 + 1 + 1) × 2 = 8` points.

9. **Admin kickoff time inputs are treated as IDT (UTC+3)**. The `+03:00` offset is hardcoded in `admin.ts` (`updateGameKickoffAction`). This is intentional since the app owner is in Israel.

10. **Sync uses `?force=true`** to bypass the smart early-exit. The admin panel "Step 4" sync button uses this to force a full sync including backfill of all player goals.

---

## 11. Internationalization (i18n)

- Two languages: English (`en.json`) and Hebrew (`he.json`)
- Language stored in a cookie (`lang`), toggled via `LanguageToggle` component
- When `lang === 'he'`, the `<main>` element gets `dir="rtl"`
- Translation dictionaries are in `src/lib/i18n/`
- Not every string is translated — some admin-facing text is English-only

---

## 12. Environment Variables

| Variable | Purpose |
|----------|---------|
| `PRISMA_DATABASE_URL` | PostgreSQL connection (pooled) |
| `POSTGRES_URL` | PostgreSQL direct URL (for Prisma) |
| `POSTGRES_URL_NON_POOLING` | Direct PostgreSQL (migrations) |
| `API_KEY` / `API_FOOTBALL_KEY` | API-Football authentication |
| `SYNC_SECRET` | Secret for manual sync trigger (`x-sync-secret` header) |
| `JWT_SECRET` | JWT signing key |
| `CRON_SECRET` | Vercel-provided secret for cron auth |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

---

## 13. Deployment

- Hosted on **Vercel** (Pro plan for cron frequency)
- Build command: `npx prisma db push --accept-data-loss && next build` (in `vercel.json`)
- `postinstall` script runs `prisma generate`
- See [DEPLOYMENT.md](../DEPLOYMENT.md) for step-by-step deployment instructions
- See [LAUNCH_GUIDE.md](../LAUNCH_GUIDE.md) for go-live checklist

---

## 14. Code Conventions

- **Server Actions** pattern: all write operations go through `src/app/actions/*.ts`
- **API routes** are only for: sync cron, Google OAuth, game predictions (client-side fetch), simulation
- **No middleware** — auth is per-route via `getSession()`
- **Vanilla CSS only** — no CSS-in-JS, no Tailwind
- **Prisma** — always use the singleton from `@/lib/prisma`
- **Performance pattern**: `fetchGlobalScoringData()` batches shared queries into one `Promise.all`, then passes the result to per-user scoring. Don't add new DB queries inside the per-user scoring loop.
