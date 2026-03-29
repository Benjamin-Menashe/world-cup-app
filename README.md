# ⚽ World Cup 2026 — Bet with Friends!

A social betting web app for the FIFA World Cup 2026. Create private leagues with friends, predict group rankings, knockout scores, and compete for glory.

## Features

- **Group Stage Predictions** — Rank all 12 groups (A–L) using drag-and-drop. Scored via [Kendall-Tau distance](https://en.wikipedia.org/wiki/Kendall_tau_distance) (up to 6 pts per group).
- **Knockout Match Bets** — Predict exact 90-minute scores. Bets lock 1 hour before kickoff.
- **Special Picks** — Tournament Champion (8 pts), Golden Boot, Undefeated Team, Winless Team.
- **Friend Leagues** — Create/join groups with invite codes. Live leaderboard with detailed breakdowns.
- **Admin Panel** — API sync for live scores, simulation suite for testing, manual overrides.
- **Rules Page** — Formal, detailed scoring rulebook.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Components)
- **Database**: SQLite via [Prisma ORM](https://www.prisma.io/)
- **Auth**: JWT + bcrypt (cookie-based sessions)
- **Styling**: Vanilla CSS with CSS variables (Outfit font)
- **Icons**: [Lucide React](https://lucide.dev/)
- **API**: [API-Sports](https://www.api-football.com/) for live scores & player data

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Seed the database (requires API_KEY in .env)
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
DATABASE_URL="file:./dev.db"
API_KEY="your-api-sports-key"
API_FOOTBALL_KEY="your-api-sports-key"
SYNC_SECRET="your-sync-secret"
JWT_SECRET="your-jwt-secret"
```
