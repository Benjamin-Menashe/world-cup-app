# ⚽ World Cup 2026 Betting App — Session State

> **Purpose:** Quick-reference snapshot of the app's current state. Updated periodically.
> **Last updated:** 2026-07-06
> **Status:** Production on Vercel, live during FIFA World Cup 2026

---

## 1. What This App Does (One-liner)

A social World Cup betting app where friends create private groups, predict match outcomes and tournament results, and compete on leaderboards.

**For full details see:** [AGENTS.md](./.agents/AGENTS.md) | [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 2. Tech Stack (Quick Ref)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Server Components) | 16.1.7 |
| Database | PostgreSQL via Prisma ORM | Prisma 6.4.1 |
| Auth | JWT + bcrypt + Google OAuth (HTTP-only cookies, 7-day expiry) | jsonwebtoken 9.x |
| Styling | Vanilla CSS + CSS custom properties + Inter font | — |
| Icons | Lucide React | 0.577.0 |
| Dropdowns | React Select | 5.10.2 |
| External API | API-Football (api-sports.io) | v3 |
| Hosting | Vercel (Pro plan for cron) | — |
| Language | TypeScript, React 19 | — |

---

## 3. Current Functional State

### ✅ Working
- **User Bets**: Group stage and knockout betting fully working
- **Scoring**: Point calculations for all categories are accurate
- **Automated Sync**: Cron job runs every 5 min, fetches scores, counts player goals via events, crosschecks with top scorers API
- **Live Scores**: Sync updates scores for in-progress games (using `fixture.goals`)
- **Admin Panel**: Full control over tournament data, time overrides, user bet overrides
- **Google OAuth**: Published to production, anyone can sign in
- **Internationalization**: English and Hebrew supported with RTL layout
- **Friend Groups**: Create, join (invite codes), leaderboards with tied-rank support

### ⚠️ Known Issues
1. **No client-side auto-refresh** — Match Center only updates on page reload
2. **Admin page is huge** — `admin/page.tsx` is ~42K, single server component

### 📝 Past Issues (Resolved)
- Player goal deduplication — Solved via `ProcessedGames` key in `TournamentResult`
- Kane penalty not counted — Was a player name matching issue, resolved by improving `playerNamesMatch()`
- Live scores not showing during matches — Fixed: sync now uses `fixture.goals` for in-progress games

---

## 4. Important Context for Debugging

### Data Sync
- API-Football league ID = **1**, season = **2026**
- Sync early-exits if no games are active/recent (saves API quota)
- Use `?force=true` to bypass early-exit
- Player goals are counted via **match events** (not the top scorers endpoint alone)
- The top scorers endpoint is used as a **crosscheck** — it only corrects upward

### Scoring Gotchas
- `WinnerLoserBet.winnerTeamId` = undefeated pick (not "winner")
- `WinnerLoserBet.loserTeamId` = winless pick (not "loser")
- Undefeated = 3W-0L in group stage (draws are allowed? No — code checks `r.wins === 3 && r.losses === 0`)
- Actually: Undefeated means 3 wins, 0 losses. Draws make a team NOT undefeated in this implementation.
- Final match scores are doubled (×2 multiplier)

### Time
- Admin timezone is **IDT (UTC+3)** — hardcoded in kickoff time input handling
- `getEffectiveNow()` is the canonical time function — always use it
