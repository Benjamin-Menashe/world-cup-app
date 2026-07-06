# Architecture Deep Dive

> This document explains **how the code works** at a level of detail sufficient for debugging, extending, or refactoring. For the high-level overview, see [AGENTS.md](./.agents/AGENTS.md).

---

## 1. Request Flow Diagram

```
User (Browser)
  │
  ├─ Page Load ──────────► Next.js Server Component (src/app/**/page.tsx)
  │                            ├── getSession() → JWT cookie → user identity
  │                            ├── Prisma queries → PostgreSQL
  │                            └── Returns rendered HTML
  │
  ├─ Form Submit ────────► Server Action (src/app/actions/*.ts)
  │                            ├── "use server" directive
  │                            ├── getSession() for auth
  │                            ├── Prisma mutations
  │                            └── revalidatePath() or redirect()
  │
  ├─ Client Fetch ───────► API Route (src/app/api/**/route.ts)
  │                            ├── /api/game-predictions — game bet details
  │                            └── /api/auth/google — OAuth flow
  │
  └─ Automated ──────────► Vercel Cron → GET /api/sync (every 5 min)
                               ├── Fetches scores from API-Football
                               ├── Updates Game records
                               ├── Counts player goals from events
                               └── Derives group standings
```

---

## 2. Data Model Relationships

```
User ──1:N──► Member ──N:1──► Group        (Friend leagues)
User ──1:N──► GroupRankingBet               (One per group letter per user)
User ──1:1──► ChampionBet                   (One champion pick)
User ──1:1──► TopScorerBet ──N:1──► Player  (One golden boot pick)
User ──1:1──► WinnerLoserBet ──N:1──► Team  (Undefeated + Winless in one record)
User ──1:N──► GameBet ──N:1──► Game         (One per knockout game per user)

Team ──1:N──► Player                        (Squad members)
Team ──1:N──► Game (as home or away)        (Match participants)

TournamentResult                            (Standalone key-value store)
```

### Key Relationship Gotchas

- `WinnerLoserBet.winnerTeamId` = the user's **undefeated** team pick (not "winner")
- `WinnerLoserBet.loserTeamId` = the user's **winless** team pick (not "loser")
- `Game.homeTeamId` and `Game.awayTeamId` are **nullable** — knockout games start as TBD
- `GroupRankingBet.rankedTeamIds` stores a **JSON string** (not a Prisma relation): `'["uuid1","uuid2","uuid3","uuid4"]'`
- `User.password` is **nullable** — Google OAuth users have no password

---

## 3. Scoring Engine Deep Dive

### `calculateUserPoints(userId, currentUserId?, teamsDict, playersDict, options?)`

**Location**: `src/lib/scoring.ts`

This function computes points for a single user. It returns `{ total, breakdown }` where `breakdown` is an array of `PointBreakdown` objects (used to render the detailed point cards in the UI).

**Performance pattern**: When computing a leaderboard, `fetchGlobalScoringData()` is called ONCE, and its result is passed to every `calculateUserPoints()` call via `options.globalData`. This avoids N+1 queries.

#### Scoring flow:

```
1. Golden Boot
   └── player.goalsScored + (1 bonus if player.goalsScored === maxGoals across all players)

2. Knockout Matches (loop over ALL knockout games, including unfinished)
   └── For finished games:
       ├── Direction match (home/away/draw): +2
       ├── Exact home score:                 +1
       ├── Exact away score:                 +1
       └── If stage === 'Final':             ×2 multiplier

3. Champion
   └── resultMap['Champion'] === bet.teamId ? 10 : 0

4. Undefeated Team
   └── Auto-derived from game records (3W, 0L) OR admin override
   └── +3 if user's pick is in the undefeated set

5. Winless Team
   └── Auto-derived from game records (0W, 3L) OR admin override
   └── +3 if user's pick is in the winless set

6. Group Rankings (12 groups)
   └── Kendall-Tau distance: max 6 points per group
   └── Actual ranking from TournamentResult['Group_X'] or derived from finished games
```

#### Visibility rules:
- **Before group stage locks**: Other users' special picks (champion, golden boot, undefeated, winless, group rankings) are hidden
- **Before a knockout game locks**: Other users' predictions for that specific game are hidden
- Your own bets are always visible to you

### `fetchGlobalScoringData()`

Batches 8 parallel database queries into one `Promise.all`:
1. `isGroupStageLocked()` — is group stage locked?
2. Max goals across all players
3. All knockout games (with teams)
4. Effective "now" (handles admin time override)
5. All tournament results
6. All finished group games
7. Total group game count
8. All teams

Then derives group standings in-memory and builds the team win/loss/draw record.

---

## 4. Sync Pipeline Architecture

### Main Sync (`/api/sync` — `route.ts`)

**Trigger**: Vercel Cron (every 5 min) OR manual via admin panel

**Authentication**: 
- Cron: `Authorization: Bearer <CRON_SECRET>` (Vercel injects automatically)
- Manual: `x-sync-secret: <SYNC_SECRET>` header
- Supports `?force=true` to bypass early-exit

**Pipeline steps**:

```
Step 0: Smart Early-Exit
├── Query DB for games that are: currently live, recently finished (2h), or about to start (30min)
├── If none → return early (saves API quota)
└── Skipped if ?force=true

Step 1: Sync Game Scores
├── GET /fixtures?league=1&season=2026 from API-Football
├── For each API fixture:
│   ├── Match to DB game by: teamNamesMatch(home) AND teamNamesMatch(away) AND kickoff within 48h
│   ├── Update: kickoffTime, homeScore, awayScore, isFinished
│   └── Skip if nothing changed (reduces DB writes)
└── For newly-finished games (not in ProcessedGames):
    ├── GET /fixtures/events?fixture=<id>
    ├── Filter: type=Goal AND (detail=Normal Goal OR detail=Penalty) AND NOT Penalty Shootout
    ├── For each goal: playerNamesMatch() → increment Player.goalsScored
    └── Add game ID to ProcessedGames set

Step 1b: Auto-derive Group Standings
├── For each group letter A–L:
│   ├── Filter finished games in that group
│   ├── If all 6 games finished → compute standings
│   └── Upsert into TournamentResult['Group_X']

Step 1c: Top Scorers Crosscheck
├── GET /players/topscorers?league=1&season=2026
├── For each scorer:
│   ├── Match to DB player by playerNamesMatch()
│   └── If DB goals < API goals → update to API value (one-way correction)
```

### Team Name Matching (`src/lib/teams.ts`)

Critical for sync reliability. The matching pipeline:

1. **Normalize**: lowercase, strip accents (NFD + remove combining marks), trim
2. **Exact match** on normalized names
3. **Clean match**: remove all non-alphanumeric characters, compare
4. **Synonym lookup**: hardcoded table (USA ↔ United States, Turkiye ↔ Turkey, etc.)
5. **Containment fallback**: if both names are >3 chars, check if one contains the other

### Player Name Matching

More complex than teams because APIs often use abbreviated first names:

1. Normalize (lowercase, strip accents AND punctuation)
2. Exact match
3. **Single-word name**: check if it appears anywhere in the other name's words
4. **Last name + first initial**: "H. Kane" matches "Harry Kane"
5. **All-words-in**: check if all words from one name appear in the other

---

## 5. Authentication Architecture

### Two auth methods (coexist):

**Email/Password:**
```
POST /login form → loginAction() → bcrypt.compare() → signToken() → setSessionCookie()
POST /register form → registerAction() → bcrypt.hash() → create User → (auto-join via invite code) → signToken()
```

**Google OAuth:**
```
GET /api/auth/google → redirect to Google consent screen
GET /api/auth/google/callback → exchange code for tokens → fetch user profile
  → Find user by googleId OR email
  → Create new user / link Google ID to existing email user
  → signToken() → setSessionCookie() → redirect to /
```

### Session Management:
- `signToken(userId, isAdmin)` → JWT with 7-day expiry
- Stored in `auth_token` HTTP-only cookie
- `getSession()` reads + verifies on every protected page/action
- No middleware — fully decentralized auth checks

### Admin Authorization:
Admin actions use a **double-check** pattern:
```typescript
async function verifyAdmin() {
  const session = await getSession()       // JWT check
  if (!session?.isAdmin) redirect("/")     // Fast gate from JWT
  const user = await prisma.user.findUnique(...)  // DB verification
  if (!user?.isAdmin) redirect("/")        // Final gate from DB
}
```

---

## 6. Bet Locking System

### Group Stage Bets
- Lock time = kickoff of the earliest Group stage game minus 1 hour
- `isGroupStageLocked()` checks this
- Once locked, the group stage betting form becomes read-only
- Locks ALL group-stage bets simultaneously (rankings, champion, golden boot, undefeated, winless)

### Knockout Bets  
- Each game locks individually: `game.kickoffTime - 1 hour`
- Three modes via `KnockoutLockOverride`:
  - `"Auto"` (default): Per-game lock based on kickoff time
  - `"Locked"`: All knockout bets locked (admin override)
  - `"Unlocked"`: All knockout bets unlocked (admin override)
- Locking is enforced in `saveKnockoutBetsAction()` — the server action filters out locked games before saving

### Time Override
- `getEffectiveNow()` returns admin-set time OR `new Date()`
- Stored as `TournamentResult` key `TimeOverride`
- Used for testing: freeze time before a game's lock window to verify behavior

---

## 7. Admin Panel

**Location**: `src/app/admin/page.tsx` (~42K, very large file)

The admin panel is a single server component that provides:

1. **Simulation Timeline** — 9-step wizard to simulate the entire tournament
2. **Time Override** — Freeze effective time for testing
3. **Knockout Lock Override** — Force lock/unlock all knockout bets
4. **Match Management** — View all games, edit scores, kickoff times, mark finished
5. **Knockout Game Manager** — Add/delete knockout games, assign teams
6. **Team Management** — Create/edit/delete teams
7. **Player Management** — Create/edit/delete players, adjust goal counts
8. **Tournament Results** — Set champion, undefeated/winless teams, group rankings
9. **User Override Panel** — Edit any user's bets (bypasses all locks)
10. **Snapshot & Reset** — Save/restore the entire tournament state

### Admin Sub-Components:
| Component | File | Purpose |
|-----------|------|---------|
| `AdminControls.tsx` | Client component | Interactive controls wrapper |
| `SyncButton.tsx` | Client component | Trigger manual sync |
| `SyncPlayersButton.tsx` | Client component | Deep-scan player rosters |
| `SyncKnockoutButton.tsx` | Client component | Sync knockout bracket |
| `InitTournamentButton.tsx` | Client component | Initialize tournament data |
| `SaveSnapshotButton.tsx` | Client component | Save base snapshot |
| `FixGroupsButton.tsx` | Client component | Fix group letter assignments |
| `UserOverridePanel.tsx` | Client component | Override any user's bets |

---

## 8. Frontend Architecture

### Page Rendering Strategy
- **Server Components** (default): All pages render on the server. Data is fetched with Prisma directly.
- **Client Components** (`"use client"`): Used only for interactive UI (forms, dropdowns, mobile nav)
- **Server Actions**: Form submissions go through server actions — no client-side API calls for mutations

### Styling
- Single `globals.css` file with CSS custom properties
- Color scheme: World Cup colors (red, blue, yellow, green) on white
- Font: `Inter` (loaded via `next/font/google` in layout)
- Mobile responsive: hamburger menu via `MobileNav.tsx`
- RTL support: `dir="rtl"` applied to `<main>` when language is Hebrew

### Key UI Components

**`PointsBreakdownCard.tsx`** (~11K) — The largest component. Renders a user's complete point breakdown with expandable sections for each scoring category.

**`MatchCenter.tsx`** (~9K) — Displays live/upcoming/finished matches. Client component for interactivity.

**`GamePredictionsTabs.tsx`** (~5K) — Tabbed view showing who predicted what for a game (fetches from `/api/game-predictions`).

---

## 9. Performance Considerations

1. **`fetchGlobalScoringData()`** — Called once per leaderboard render, shared across all users. Without this, each user scoring would trigger 8+ DB queries.

2. **Sync early-exit** — The cron job checks for active/recent games before making any API calls. Saves API-Football quota (limited requests/day).

3. **Batch upserts** — Knockout bet saves use `prisma.$transaction()` to batch all upserts.

4. **In-memory group standings** — `deriveGroupStandingsFromGames()` computes standings from already-fetched game data instead of querying the DB per group.

5. **Skip-if-unchanged** — The sync pipeline compares all fields before issuing an update. If nothing changed, no DB write occurs.

---

## 10. Testing & Diagnostic Scripts

Located in `scripts/`:

| Script | Purpose |
|--------|---------|
| `run-sync.mjs` | Run the sync pipeline manually from CLI |
| `diagnose-sync.mjs` | Detailed sync diagnostics with verbose output |
| `check-all-player-goals.mjs` | Verify all player goal counts |
| `check-france-events.mjs` | Debug events for France's games |
| `simulate-all-france.mjs` | Simulate all France match events |
| `test-matching.mjs` | Test team/player name matching |
| `test-player-matching-logic.mjs` | Detailed player matching tests |
| `test-topscorers.mjs` | Test top scorers sync |
| `inspect-db.mjs` | Quick DB inspection |
| `test_api.js` | Test API-Football connectivity |

Also at project root:
- `extract_qualified.js` — Extract qualified teams data
- `extract_teams.js` — Extract team data
- `script.js` / `script.ts` — Utility scripts

---

## 11. Simulation System

**Location**: `src/app/api/simulate/exit/route.ts`

The admin panel includes a 9-step simulation timeline for testing the entire tournament flow without real data. Steps include:
1. Initialize tournament data
2. Save base snapshot
3. Set group stage results
4. Set knockout bracket
5. Simulate match scores
6. ...through to Final
7. Set champion

The "Exit Sim & Master Reset" button (`masterResetAction()` in `admin.ts`) wipes all data and restores from the base snapshot.
