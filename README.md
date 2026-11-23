# DuneBuddy

A neutral referee for our games of the Dune board game (Gale Force Nine edition).

## Features

### Faction draw

1. Someone creates a draw for game night. They choose the date, how many votes each player gets
   (default 2) and which factions are in play (base game, Ixians & Tleilaxu, CHOAM & Richese).
2. They share the link. Each player enters their name and spends **all** of their votes. A player
   can put every vote on one faction or split them however they like. Votes stay hidden until the
   draw.
3. Anyone presses **Calculate assignments**. The server resolves the draw:
   - The highest remaining bid on any faction wins it. Ties are settled by a random draw.
   - Each player wins at most one faction. Once a player is seated, their other bids drop out, and
     the next-highest bid is resolved. A player who loses their top choice can still win their
     second.
   - Players left without a faction are dealt one at random from the unclaimed factions.
4. The result is **locked** and shown to everyone, with a reason for each assignment and every
   ballot revealed. Pressing Calculate again returns the same result. **Reset draw** reopens
   voting. The discarded result stays in the game's history so everyone can see it was reset.

Players can change or withdraw their ballot until the draw, but only from the device they voted on.
Swapping into an unclaimed faction happens at the table, outside the app.

The faction emblems are simple original designs, not the game's artwork. To use your own images,
see `ui/public/factions/README.md`.

## Setup

Requires Node.js 18+ and Docker (for Postgres). If you have a local PostgreSQL 14+, you can use it
instead of Docker.

```bash
npm install
cp .env.example .env
npm run db:up      # starts Postgres in Docker on localhost:5432
npm run migrate
```

## Development

```bash
npm run dev        # data-service on :3003, UI on http://localhost:3002
npm test           # faction assignment tests
npm run build
```

## Project structure

```
/common/src/
  factions.ts      - Faction and expansion list
  /schemas/        - Zod schemas and shared types
  /utils/          - Shared logic, including assignFactions (the draw algorithm)

/data-service/src/
  db.ts            - Postgres helpers (named params, transactions)
  /models/         - Database access
  /trpcRouters/    - tRPC API
  index.ts         - Express server

/ui/src/
  /pages/          - Home (create a draw) and Game (ballot and results)
  /components/     - Ballot, results, faction emblems, UI primitives
  /slices/         - Redux slices
  /utils/          - Frontend helpers, including per-device ballot tokens

/db/migrations/    - node-pg-migrate migrations
```

## Tech stack

TypeScript (strict), React 18 + Vite, Redux Toolkit, react-jss, tRPC, Zod, PostgreSQL with
node-pg-migrate.
