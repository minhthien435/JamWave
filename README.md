# JamWave — Indie Music Streaming & AI Discovery Platform 📼🎵

[![Live Web App](https://img.shields.io/badge/Web_App-jam--wave.vercel.app-D97C54?style=for-the-badge&logo=vercel&logoColor=white)](https://jam-wave.vercel.app)
[![Desktop App](https://img.shields.io/badge/Desktop_App-Tauri_v2-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://github.com/minhthien435/JamWave/releases)
[![Backend API](https://img.shields.io/badge/Backend_API-Render_Live-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://spotify-clone-0yaw.onrender.com/api/health)

![React 19](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite 8](https://img.shields.io/badge/Vite_8-1A1A2E?style=flat-square&logo=vite&logoColor=646CFF)
![Tailwind CSS 3](https://img.shields.io/badge/Tailwind_CSS_3-0F172A?style=flat-square&logo=tailwindcss&logoColor=38BDF8)
![Tauri 2](https://img.shields.io/badge/Tauri_2.0-24C8D8?style=flat-square&logo=tauri&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_20+-0F172A?style=flat-square&logo=nodedotjs&logoColor=22C55E)
![Express 5](https://img.shields.io/badge/Express_5-111827?style=flat-square&logo=express&logoColor=FFFFFF)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_pgvector-0F172A?style=flat-square&logo=postgresql&logoColor=38BDF8)
![Prisma ORM](https://img.shields.io/badge/Prisma_5-1E1B4B?style=flat-square&logo=prisma&logoColor=A78BFA)
![Google Gemini](https://img.shields.io/badge/Gemini_AI_Vector-312E81?style=flat-square&logo=googlegemini&logoColor=8B5CF6)
![Cloudflare Turnstile](https://img.shields.io/badge/Cloudflare_Turnstile-F38020?style=flat-square&logo=cloudflare&logoColor=white)

---

## 🌟 Giới Thiệu (Overview)

**JamWave** là nền tảng nghe nhạc trực tuyến & khám phá âm nhạc độc lập (Indie Music) kết hợp **Trí tuệ Nhân tạo (AI)**, mang phong cách thiết kế **Indie Zine Retro (Ấm áp, hoài cổ, băng đĩa cassette)**:

* 🎶 **Kho nhạc độc lập phong phú**: Hơn **2.440+ bài hát** và **1.400+ album** miễn phí và hợp pháp từ 2 nguồn:
  * **Jamendo**: 1.500+ bài hát bản quyền Creative Commons chất lượng cao.
  * **Audius**: 940+ bài hát độc lập từ mạng lưới lưu trữ phân tán.
* 🤖 **AI Semantic Search & Discovery**: Tìm kiếm bài hát bằng ngôn ngữ tự nhiên thông qua **Gemini 3072-dimensional Vector Embeddings** và **pgvector**.
* ⚡ **Tải nhạc song song thông minh (Parallel Downloader)**: Tải file MP3 đơn và đóng gói cả Playlist thành file `.zip` siêu tốc kèm modal theo dõi tiến trình thời gian thực (tốc độ MB/s, % tải, ETA).
* 🖥️ **Ứng dụng Desktop Đa Nền Tảng (Tauri v2)**: Hỗ trợ đóng gói cài đặt cho Windows (`.exe` / `.msi`), macOS (`.dmg`), và Linux (`.deb`).
* 🔒 **Bảo mật & Xác thực toàn diện**: Đăng nhập bằng Google OAuth 2.0, mã hóa JWT, Cloudflare Turnstile Captcha, xác thực OTP qua Gmail.

---

## 🎨 Phong Cách Thiết Kế (Indie Retro Zine Aesthetics)

Ứng dụng được thiết kế theo cảm hứng **cuộn băng cassette cổ điển & tạp chí thủ công (Indie Zine)**:
* **Bảng màu chủ đạo**:
  * 🌰 Nâu Espresso Đậm: `#2E2721` (Background / Panel)
  * 🏺 Màu Đồng Terracotta: `#D97C54` / `#B85C38` (Primary Brand & Accent)
  * 📜 Màu Giấy Vintage: `#EDE6D6` / `#A39282` (Typography)
  * 🌿 Xanh Rêu Nhạt: `#76876F` / `#5C6E56` (Verified / Badges)
* **Chi tiết nhận diện**: Viền nét đứt thủ công (`border-dashed-indie`), nhãn băng dính Washi Tape, nhãn nguồn nhạc `Jamendo` / `Audius`, đĩa than xoay và hiệu ứng mờ nhạt glassmorphism cao cấp.

---

## 🚀 Kiến Trúc & Công Nghệ (Tech Stack)

```mermaid
graph TD
    Client["Frontend Web (React 19 + Vite 8)"] -->|HTTPS / REST API| Server["Backend API (Express 5 on Render)"]
    Desktop["Desktop App (Tauri v2 Desktop)"] -->|Webview| Client
    Server --> DB[("PostgreSQL Database (pgvector + Prisma)")]
    Server --> AI["Google Gemini AI (Vector Embedding & Chatbot)"]
    Server --> Cloudflare["Cloudflare Turnstile (Bot Protection)"]
    Server --> MusicCDN["Jamendo API & Audius Gateway CDN"]
```

| Tầng (Layer) | Công nghệ chính | Chi tiết chức năng |
|---|---|---|
| **Frontend Web** | React 19, Vite 8, Tailwind CSS, Zustand, Phosphor Icons | Single Page App phản hồi tức thì, audio player toàn cục, quản lý playlist, hồ sơ |
| **Desktop App** | Tauri v2 (Rust + Webview2 / WebKit) | Ứng dụng Desktop siêu nhẹ (<10MB RAM ~30MB), auto-update trực tiếp từ Vercel |
| **Backend API** | Node.js 20, Express 5, Prisma ORM 5 | RESTful API, Rate limiting, CORS bảo mật, stream nhạc IPv4, nén ZIP song song |
| **Database** | PostgreSQL (Neon / Supabase) | Lưu trữ người dùng, playlist, bài hát, phân quyền Admin và cột vector AI |
| **Trí Tuệ Nhân Tạo** | Google Gemini (Embeddings & Chat RAG) | Vector Cosine Semantic Search 3072 chiều, trợ lý âm nhạc gợi ý bài hát theo tâm trạng |
| **Bảo Mật** | JWT, Cloudflare Turnstile, bcryptjs, Nodemailer | Chống bot brute-force, xác thực email OTP, đăng nhập 1 chạm Google |

---

## ✨ Tính Năng Nổi Bật (Key Features)

### 1. Trình Phát Nhạc Toàn Diện (Full Audio Player)
- Phát nhạc liên tục, quản lý hàng đợi (Queue), xáo trộn (Shuffle), lặp lại (Repeat).
- Tự động bỏ qua bài hát lỗi (Auto-skip error handling).
- Ghi nhận lịch sử nghe nhạc và tính tổng thời gian nghe trên hồ sơ cá nhân.

### 2. Tìm Kiếm Thông Minh Bằng AI (AI Semantic Search)
- Tìm kiếm bài hát theo cảm xúc hoặc ngữ cảnh (ví dụ: *"nhạc chill làm việc đêm"*, *"nhạc guitar acoustic buồn"*).
- Phân tích độ tương đồng cosine thông qua **pgvector** và **Gemini Embedding**.

### 3. Tải Nhạc Song Song & Modal Tiến Trình (Real-time Downloader)
- Tải bài hát đơn lẻ dạng file `.mp3` chuẩn metadata.
- **Tải trọn bộ Playlist thành file `.zip`**: Tải song song thông minh đa luồng (`concurrency = 2`), tự động bỏ qua lỗi và hoàn tất tải chỉ trong vài giây.
- **Modal tiến trình trực quan**: Hiển thị tốc độ tải thời gian thực (`MB/s`), dung lượng đã tải (`MB/MB`), tỷ lệ hoàn thành (`%`), thời gian đếm ngược `ETA`, và nút Hủy tải an toàn (`AbortController`).

### 4. Quản Lý Playlist & Thư Viện Cá Nhân
- Tạo, đổi tên, xóa playlist với modal xác nhận phong cách Indie.
- Đổi ảnh bìa playlist và ảnh đại diện tài khoản (hỗ trợ lưu trữ backend và CDN).
- Bật/Tắt chế độ công khai (Public/Private) và chia sẻ liên kết playlist.

### 5. Trang Quản Trị Hệ Thống (Admin Dashboard)
- Tự động nhận diện tài khoản Admin thông qua biến môi trường `ADMIN_EMAIL`.
- Menu quản trị chuyên biệt trên TopBar và Sidebar bên trái.
- Thống kê toàn hệ thống: Tổng số người dùng, bài hát, lượt nghe và album.
- Quản lý phân quyền người dùng (USER / ADMIN) và duyệt/xóa bài hát.

---

## 💻 Cài Đặt & Chạy Cục Bộ (Local Development)

### Yêu Cầu Tiên Quyết
* **Node.js**: Phiên bản 18.x hoặc 20.x trở lên.
* **PostgreSQL**: Cơ sở dữ liệu PostgreSQL (hỗ trợ extension `vector`).
* **Rust** *(chỉ cần nếu bạn muốn build Desktop App Tauri ở máy)*.

---

### 1. Cài Đặt Backend

```bash
cd backend
npm install

# Tạo file cấu hình từ file mẫu
cp .env.example .env

# Đồng bộ Prisma Schema với Database
npx prisma db push

# Chạy Backend Development Server (Cổng 5000)
npm run dev
```

### 2. Cài Đặt Frontend

```bash
cd frontend
npm install

# Chạy Vite Development Server (Cổng 5173)
npm run dev
```

Mở trình duyệt tại địa chỉ `http://localhost:5173`.

---

### 3. Chạy Thử Ứng Dụng Desktop (Tauri)

```bash
cd frontend
npm run tauri dev
```

---

## ⚙️ Biến Môi Trường (Environment Variables)

### Backend (`backend/.env`)

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL (ví dụ: `postgresql://user:pass@host/db`) | **Có** |
| `JWT_SECRET` | Khóa bí mật dùng để ký và giải mã JWT token | **Có** |
| `PORT` | Cổng chạy server Backend (Mặc định: `5000`) | Không |
| `CLIENT_ORIGIN` | Danh sách tên miền Frontend được phép gọi CORS (ví dụ: `https://jam-wave.vercel.app`) | Không |
| `ADMIN_EMAIL` | Email được tự động cấp quyền Quản Trị Viên (ADMIN) | Không |
| `TURNSTILE_SECRET_KEY` | Khóa Secret của Cloudflare Turnstile Captcha | Không |
| `GOOGLE_CLIENT_ID` | Client ID cho Google OAuth Login | Không |
| `AI_API_KEY` | API Key của Google Gemini cho AI search & chatbot | Không |
| `JAMENDO_CLIENT_ID` | Client ID từ Jamendo API để tải ảnh và thông tin nghệ sĩ | Không |

### Frontend (`frontend/.env` & Vercel)

| Biến | Mô tả | Mặc định |
|---|---|---|
| `VITE_API_URL` | Đường dẫn Backend API (Production: `https://spotify-clone-0yaw.onrender.com/api`) | `/api` |
| `VITE_TURNSTILE_SITE_KEY` | Site Key công khai của Cloudflare Turnstile | — |
| `VITE_GOOGLE_CLIENT_ID` | Client ID công khai của Google OAuth 2.0 | — |

---

## 🛠️ Đóng Gói Ứng Dụng Desktop (Tauri Builds)

Dự án đã tích hợp sẵn luồng **GitHub Actions tự động đóng gói ứng dụng Desktop** cho Windows, macOS và Linux:

1. Vào tab **Actions** trên GitHub repository.
2. Chọn workflow **"Build Tauri Desktop App"** ➔ Bấm **Run workflow**.
3. Sau khi build hoàn tất, tải file cài đặt trong mục **Releases / Artifacts**:
   - 🪟 **Windows**: `JamWave_x64_en-US.msi` hoặc `.exe`
   - 🍎 **macOS**: `JamWave_x64.dmg` / `.app`
   - 🐧 **Linux**: `JamWave_amd64.deb` / `.AppImage`

---

## 📄 Bản Quyền (License)

Dự án được phân phối theo giấy phép mã nguồn mở **ISC License**. Toàn bộ âm nhạc trong ứng dụng thuộc quyền sở hữu của các nghệ sĩ độc lập trên nền tảng **Jamendo** (Creative Commons License) và **Audius** (Decentralized Web3 Streaming).
