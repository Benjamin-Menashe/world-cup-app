# ⚽ World Cup 2026 — Bet with Friends!

A full-stack social betting web app for the FIFA World Cup 2026. Create private leagues with friends, predict group rankings and knockout scores, and compete on live leaderboards for ultimate bragging rights.

## Features

### 🏟️ Predictions
- **Group Stage Rankings** — Rank all 12 groups (A–L) using drag-and-drop or arrow buttons. Scored via [Kendall-Tau distance](https://en.wikipedia.org/wiki/Kendall_tau_distance) (up to 6 pts per group).
- **Knockout Match Bets** — Predict exact 90-minute scores with +/- stepper inputs. Bets lock 1 hour before each kickoff.
- **Special Picks** — Tournament Champion (+8 pts), Golden Boot (1 pt per goal + bonus), Undefeated Team (+3 pts), Winless Team (+3 pts).

### 👥 Social
- **Friend Leagues** — Create or join groups with 6-character invite codes. Share invite links that auto-join on signup.
- **Live Leaderboard** — Ranked standings with tied-rank support (1, 2, 2, 4 pattern). View any member's full point breakdown.
- **Sharing** — Copy your rank, point breakdown, or invite link to clipboard with one click.

### 🛡️ Admin & Automation
- **API Sync** — Automated score and player data sync from [API-Football](https://www.api-football.com/) via Vercel Cron (every 5 minutes).
- **Player Roster Sync** — One-click deep scan of tournament squads for the Golden Boot dropdown.
- **Simulation Suite** — 9-step timeline to simulate the entire tournament flow for testing.
- **Manual Overrides** — Override match scores and player goals directly from the admin panel.

### 🎨 UI/UX
- Responsive mobile navigation with hamburger menu and slide-in drawer.
- Searchable dropdowns (react-select) for all team/player selections.
- Unsaved changes warning before navigating away from prediction forms.
- Global error boundary and loading spinner.
- Light theme with World Cup colors (Red, Blue, Yellow, Green) and Outfit font.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Server Components) |
| Database | PostgreSQL via [Prisma ORM](https://www.prisma.io/) |
| Auth | JWT + bcrypt (HTTP-only cookie sessions) |
| Styling | Vanilla CSS with CSS custom properties |
| Icons | [Lucide React](https://lucide.dev/) |
| Dropdowns | [React Select](https://react-select.com/) |
| API | [API-Football](https://www.api-football.com/) for live scores & player data |
| Hosting | [Vercel](https://vercel.com/) |

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema (requires DATABASE_URL in .env)
npx prisma db push

# Seed the database (teams, groups, matches)
node prisma/seed.js

# Create an admin account
node prisma/seed-admin.js

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env` file in the project root:

```env
PRISMA_DATABASE_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."
API_KEY="your-api-football-key"
API_FOOTBALL_KEY="your-api-football-key"
SYNC_SECRET="your-sync-secret"
JWT_SECRET="your-jwt-secret"
```

## Project Structure

```
src/
├── app/
│   ├── actions/         # Server actions (auth, bets, groups, admin, knockout)
│   ├── admin/           # Admin panel with sync & simulation controls
│   ├── api/             # API routes (sync scores, simulate tournament)
│   ├── bets/            # Group stage & knockout prediction forms
│   ├── dashboard/       # Personal points breakdown & account management
│   ├── group/           # Friend leagues, leaderboards, user profiles
│   ├── login/           # Authentication
│   ├── register/        # Registration with optional invite code
│   ├── rules/           # Official scoring rulebook
│   └── team/            # Team history pages
├── components/          # Shared UI components (nav, copy button, points card)
├── hooks/               # Custom React hooks (unsaved changes warning)
└── lib/                 # Core utilities (auth, prisma, scoring engine, lock time)
```

## Scoring System

| Category | Points |
|----------|--------|
| Group ranking (per group) | 0–6 (Kendall-Tau) |
| Tournament Champion | 8 |
| Golden Boot | 1 per goal + 1 bonus |
| Undefeated Team | 3 |
| Winless Team | 3 |
| Knockout match direction | 2 |
| Exact team score | 1 per team |
| Final match multiplier | ×2 |

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full Vercel deployment guide.
