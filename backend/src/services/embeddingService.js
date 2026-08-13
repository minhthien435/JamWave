const axios = require("axios");

// ---- Cấu hình Gemini Embedding (qua OpenAI-compatible endpoint, tái dùng AI_API_KEY) ----
const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const EMBED_DIM = 3072;

// Gemini yêu cầu giới hạn request rate. Khoảng cách tối thiểu giữa 2 request.
let MIN_INTERVAL_MS = 150;
let lastRequestAt = 0;
// Khi gặp 429 liên tiếp -> tăng MIN_INTERVAL để né cửa sổ quota
let consecutive429 = 0;

function normalize(v) {
  if (!v) return null;
  return v
    .toLowerCase()
    .replace(/[^\w\sàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Văn bản "thuần" để embed cho 1 bài hát
function songEmbeddingText(song) {
  return normalize(
    [song.title, song.artist, song.genre].filter(Boolean).join("\n") || "untitled"
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

// Gọi embeddings endpoint (OpenAI-compatible của Gemini). input: string | string[].
// Trả về mảng vector hoặc null nếu lỗi (đã thử lại tối đa).
async function embedBatch(input) {
  if (!AI_API_KEY) return null;
  if (!Array.isArray(input)) input = [input];
  const bodies = input.map((t) => normalize(t)).filter(Boolean);
  if (bodies.length === 0) return null;

  const url = `${AI_BASE_URL.replace(/\/$/, "")}/embeddings`;
  const MAX_ATTEMPTS = 8;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await throttle();
    try {
      const response = await axios.post(
        url,
        { model: EMBED_MODEL, input: bodies },
        {
          headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
          timeout: 30000,
        }
      );
      const data = response.data?.data || [];
      const vecs = data.map((d) => d.embedding);
      if (vecs.length && vecs.every((v) => Array.isArray(v) && v.length === EMBED_DIM)) {
        consecutive429 = 0;
        return vecs;
      }
      if (attempt === MAX_ATTEMPTS) {
        console.error(`Gemini embed: shape lạ ${JSON.stringify(data).slice(0, 200)}`);
        return null;
      }
      await sleep(1000 * attempt);
    } catch (error) {
      const status = error.response?.status;
      const retryAfter = Number(error.response?.headers?.["retry-after"]) || 0;
      if (status === 429 || status === 403 || status === 402) {
        consecutive429 += 1;
        // Thích ứng: càng dính 429 càng giãn khoảng cách
        MIN_INTERVAL_MS = Math.min(3000, 150 + consecutive429 * 300);
        const waitMs = Math.max(retryAfter * 1000, 1500 * attempt);
        if (attempt === MAX_ATTEMPTS) {
          console.error(`Gemini embed rate-limit hết lượt (${input.length} text): ${error.response?.data?.error?.message || error.message}`);
          return null;
        }
        await sleep(waitMs);
        continue;
      }
      if (attempt === MAX_ATTEMPTS) {
        console.error("Gemini embed lỗi:", error.response?.data?.error?.message || error.message);
        return null;
      }
      await sleep(800 * attempt);
    }
  }
  return null;
}

// Helper đơn lẻ (tương thích cũ): embedText text -> 1 vector
async function embedText(text) {
  const vecs = await embedBatch([text]);
  return vecs ? vecs[0] : null;
}

module.exports = { embedText, embedBatch, songEmbeddingText, EMBED_DIM, hasKey: Boolean(AI_API_KEY) };