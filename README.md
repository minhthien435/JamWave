# JamWave — Independent Music Streaming 🎵

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_8-1A1A2E?style=for-the-badge&logo=vite&logoColor=646CFF)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_3-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8)

![Node.js](https://img.shields.io/badge/Node.js_18+-0F172A?style=for-the-badge&logo=nodedotjs&logoColor=22C55E)
![Express](https://img.shields.io/badge/Express_5-111827?style=for-the-badge&logo=express&logoColor=FFFFFF)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_Neon-0F172A?style=for-the-badge&logo=postgresql&logoColor=38BDF8)
![Prisma](https://img.shields.io/badge/Prisma_5-1E1B4B?style=for-the-badge&logo=prisma&logoColor=A78BFA)

![Gemini AI](https://img.shields.io/badge/Gemini_AI-312E81?style=for-the-badge&logo=googlegemini&logoColor=8B5CF6)
![AI Assistant](https://img.shields.io/badge/AI_Assistant-RAG-7C3AED?style=for-the-badge&logo=googlegemini&logoColor=FFFFFF)

![Vercel](https://img.shields.io/badge/Vercel_Frontend-111827?style=for-the-badge&logo=vercel&logoColor=FFFFFF)
![Render](https://img.shields.io/badge/Render_Backend-064E3B?style=for-the-badge&logo=render&logoColor=46E3B7)

A Spotify-like full-stack music streaming web application powered by **2 free & legal independent music catalog sources**:
- **Jamendo** — 1,500+ full-length tracks with Creative Commons licensing.
- **Audius** — 940+ decentralized indie tracks streamed directly via discovery nodes.

Over **2,400+ songs** and **1,400+ albums**, featuring an **AI Music Assistant Chatbot**, interactive music player, playlists, liked songs, album & artist discovery.

---

## Deployment

The application is deployed live across modern cloud infrastructure:

- **Frontend App (Vercel):** Deployed on Vercel with SPA client-side routing & Vite optimizations.
- **Backend API (Render):** Express 5 REST API running on Render Cloud Services.
- **Database (Neon PostgreSQL):** Serverless PostgreSQL database hosted on Neon.tech.

---

## Architecture & Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Backend API** | Node.js, Express 5, Prisma ORM 5, PostgreSQL | RESTful API for auth, music discovery, playlists, likes, and AI assistant |
| **Frontend Web** | React 19, Vite 8, Tailwind CSS 3, Zustand | Spotify-inspired dark glassmorphism UI with responsive design |
| **Database** | PostgreSQL (Neon.tech) | Relational schema storing users, tracks, playlists, albums, and listens |
| **AI Assistant** | OpenAI API Compatible (Gemini Flash) | Context-aware music recommendations and natural language search |

---

## Key Features

- **Music Discovery & Playback:** Full audio player with queue management, shuffle, repeat, volume control, seek bar, and error auto-skip.
- **Dual Catalog Source Badging:** Clear visual badges distinguishing `Jamendo` and `Audius` tracks across the UI.
- **AI Music Chatbot Assistant:** Smart conversational AI powered by LLM for music recommendations, mood-based discovery, and queries.
- **Albums & Artists Pages:** Grouped Audius & Jamendo albums with tracklists and artist detail views.
- **User Authentication & Authorization:** Secure JWT authentication (Register, Login, Session Persistence).
- **Playlists & Liked Songs:** Create, rename, delete playlists, and add/remove songs from personal libraries.
- **Security & Robustness:** Rate limiting (`express-rate-limit` with proxy trust), CORS protection, input validation, and centralized error handling.

---

##  Running Locally

### Prerequisites
- **Node.js:** v18.x or higher
- **Database:** PostgreSQL instance (Local PostgreSQL, Neon, or Supabase)

### 1. Backend Setup

```bash
cd backend
npm install

# Create environment configuration from template
cp .env.example .env

# Apply database migrations & seed initial catalog
npx prisma migrate deploy
npm run seed

# Run Development Server (Default port: 5000)
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Run Vite Development Server (Default port: 5173)
npm run dev
```

Open `http://localhost:5173` in your browser. Vite automatically proxies `/api` requests to the backend at `http://localhost:5000`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for signing JWT tokens | Yes |
| `PORT` | Backend server port (Default: `5000`) | No |
| `CLIENT_ORIGIN` | Allowed CORS origins (comma-separated) | No |
| `AI_API_KEY` | Gemini / OpenAI-compatible API key for AI chat | Optional |
| `AI_BASE_URL` | Custom OpenAI-compatible endpoint URL | Optional |
| `AI_MODEL` | Target AI model name (e.g. `gemini-flash-latest`) | Optional |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend REST API endpoint URL | `/api` |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Service health status check |
| `GET` | `/api/songs?q=&limit=&offset=` | Paginated songs list & search |
| `GET` | `/api/songs/random?limit=` | Get random songs for discovery |
| `GET` | `/api/albums` | Get all albums with source badges |
| `GET` | `/api/albums/:id` | Get album details and tracklist |
| `GET` | `/api/artists` | Get artist directory |
| `POST` | `/api/auth/register` | User registration |
| `POST` | `/api/auth/login` | User login |
| `GET` | `/api/auth/me` | Current authenticated user session |
| `POST` | `/api/ai/chat` | AI music assistant conversational query |

---

## License

This project is open-source and available under the **ISC License**. Music tracks belong to their respective creators under Creative Commons (Jamendo) and Decentralized Streaming (Audius).
