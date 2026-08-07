# Spotify Clone

A Spotify clone project that replicates the core UI and features: music playback, search, playlists, and liked songs.

## Architecture

The project is split into two independent parts:

| Part | Tech stack | Description |
|------|-----------|-------------|
| `backend/` | Express 5, Prisma 5, PostgreSQL | REST API: songs, auth, playlists, likes |
| `frontend/` | React 19, Vite 8, Tailwind CSS 3, zustand, react-router-dom | Spotify-like user interface |

```
Spotify_Clone/
├── backend/
│   ├── prisma/          # schema, migrations, seed
│   └── src/             # Express app (routes, controllers, middleware)
└── frontend/
    └── src/
        ├── api/         # axios client
        ├── components/  # UI components
        └── pages/       # Home, Search, Playlist, Likes...
```

## Features

- [x] Songs API (`GET /api/songs`)
- [x] Seed real music data from the iTunes Search API
- [ ] Music player, search, playlists, likes (in development)

The full roadmap is tracked in the [Issues](https://github.com/minhthien435/Spotify_Clone/issues) section on GitHub.

## Run locally

Requirements: **Node.js 18+** and a PostgreSQL database (local or Supabase).

### 1. Backend

```bash
cd backend
npm install

# Create .env from the template (fill in the real DATABASE_URL)
cp .env.example .env

# Migrate the database and seed music data
npx prisma migrate dev
npm run seed

# Start the dev server (default port 5000)
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` — Vite already proxies `/api` to the backend on port 5000.

## Environment variables

| Variable | Used by | Required |
|----------|---------|----------|
| `DATABASE_URL` | backend (Prisma) | Yes |
| `PORT` | backend (Express) | No (defaults to 5000) |
| `JWT_SECRET` | backend (auth, not used yet) | No (needed once auth lands) |

## Useful scripts

```bash
# Backend
npm run dev        # nodemon
npm run seed       # seed music from iTunes
npx prisma studio  # browse the database in the browser

# Frontend
npm run dev        # vite dev server
npm run build      # production build
npm run lint       # eslint
```
