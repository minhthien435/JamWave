# JamWave - Sóng Nhạc Độc Lập 🎵

App nghe nhạc (Spotify-like) với **2 thư viện nhạc độc lập miễn phí**:
- **Jamendo** — 1.500 bài full-length, CC license
- **Audius** — 942 bài indie decentralized (stream qua discovery node)

Tổng ~2.400 bài, kèm AI music assistant chat-box, playlist, bài hát yêu thích, albums & nghệ sĩ.

## Architecture

| Part | Tech stack | Description |
|------|-----------|-------------|
| `backend/` | Express 5, Prisma 5, PostgreSQL | REST API: songs, auth, playlists, likes, AI chat |
| `frontend/` | React 19, Vite 8, Tailwind CSS 3, zustand | UI giống Spotify (dark glassmorphism) |

## Features

- [x] Songs API (`GET /api/songs`) — search (`?q=`), **phân trang** (`?limit=&offset=`), random (`/api/songs/random`)
- [x] Seed nhạc thật từ Jamendo + Audius (2.400+ bài, 1.400+ album, đánh dấu `source`)
- [x] JWT authentication (register / login / me)
- [x] Playlists CRUD (create, view, rename, delete, add/remove songs)
- [x] Liked songs (like / unlike, list)
- [x] Music player: queue, shuffle, repeat, seek, volume, prev/next (tự nhảy bài lỗi)
- [x] Albums & Artists pages (album Audius gộp theo nghệ sĩ "X Essentials")
- [x] AI music assistant (gợi ý nhạc từ cả 2 nguồn; LLM tùy chọn qua `AI_API_KEY`)
- [x] Badge nguồn Jamendo/Audius trên toàn UI
- [x] Rate limiting + validation + CORS theo `CLIENT_ORIGIN`
- [ ] Premium, sharing, recommendations (future)

## Run locally

Requirements: **Node.js 18+** và PostgreSQL (local hoặc Supabase/Neon free).

### 1. Backend

```bash
cd backend
npm install

# Tạo .env từ template (điền DATABASE_URL, JWT_SECRET, JAMENDO_CLIENT_ID)
cp .env.example .env

# Đồng bộ schema (dùng db push cho nhanh, hoặc migrate deploy)
npx prisma db push
npm run seed

# Chạy dev server (mặc định cổng 5000)
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173` — Vite tự proxy `/api` sang backend cổng 5000.

### 3. Chạy production (1 cổng duy nhất)

```bash
cd frontend && npm run build    # tạo frontend/dist
cd ../backend && npm start      # Express tự phục vụ dist + API trên cùng cổng
```

Mở `http://localhost:5000`.

## Environment variables

| Variable | Used by | Required |
|----------|---------|----------|
| `DATABASE_URL` | backend (Prisma) | Yes |
| `JWT_SECRET` | backend (auth) | Yes |
| `JAMENDO_CLIENT_ID` | backend (seed) | Yes (chỉ khi seed) |
| `PORT` | backend (Express) | No (default 5000) |
| `CLIENT_ORIGIN` | backend (CORS, phân cách dấu phẩy) | No (mở hết khi dev) |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | backend (AI chat, OpenAI-compatible) | No |

## API endpoints chính

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/health` | Health check |
| GET | `/api/songs?q=&limit=&offset=` | Danh sách bài hát + phân trang `{ songs, total }` |
| GET | `/api/songs/random?limit=` | Bài hát ngẫu nhiên |
| GET | `/api/albums` / `/api/albums/:id` | Albums (kèm `source`) |
| GET | `/api/artists` | Nghệ sĩ |
| POST | `/api/auth/register` / `/login` | Auth (rate limit 5/phút) |
| GET | `/api/auth/me` | Thông tin user (JWT) |
| POST | `/api/ai/chat` | AI assistant (rate limit 20/phút) |

## Useful scripts

```bash
# Backend
npm run dev        # nodemon
npm run seed       # seed nhạc từ Jamendo + Audius
npx prisma studio  # xem DB trên trình duyệt
npx prisma migrate status

# Frontend
npm run dev        # vite dev server
npm run build      # production build
npm run lint       # eslint
```
