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

// Genre -> từ khóa mô tả mood (VI + EN) để semantic search hiểu "cảm xúc" của bài.
// Song chỉ embed title+artist+genre -> query kiểu "mưa đêm buồn" không khớp được gì.
const GENRE_MOODS = {
  chillout: "thư giãn chill calm nhẹ nhàng buồn mưa đêm relax",
  ambient: "thư giãn calm không gian yên tĩnh nền nhạc nền space",
  lounge: "thư giãn chill calm thư thái lounge",
  downtempo: "chậm rãi thư giãn calm chill buồn",
  relaxation: "thư giãn calm yên tĩnh ngủ dễ chịu",
  piano: "nhẹ nhàng buồn tình cảm calm piano",
  electronic: "mạnh mẽ energetic sôi động hiện đại dance",
  dance: "mạnh mẽ energetic vũ trường party sôi động club",
  edm: "mạnh mẽ energetic party hội hè sôi động",
  house: "mạnh mẽ energetic club dance sôi động",
  techno: "mạnh mẽ energetic club công nghệ tối",
  trance: "mạnh mẽ energetic bay bổng trip",
  hiphop: "mạnh mẽ chất rap street phố",
  rap: "mạnh mẽ chất rap street phố",
  phonk: "mạnh mẽ tối dark gắt workout",
  "hip-hop": "mạnh mẽ chất rap street phố",
  rock: "mạnh mẽ guitar năng lượng phấn khích",
  metal: "mạnh mẽ guitar nặng phấn khích dữ dội",
  pop: "vui tươi happy sôi động mainstream",
  funk: "vui nhộn retro sôi nổi sảng khoái",
  reggae: "vui vẻ thư giãn nắng biển",
  world: "vui vẻ khám phá nhiệt đới exotic",
  acoustic: "mộc mạc nhẹ nhàng tình cảm ballad",
  ballad: "nhẹ nhàng tình cảm buồn sâu lắng",
  jazz: "thư giãn sang trọng jazz đêm tình cảm",
  blues: "buồn da diết tâm trạng sâu lắng",
  classical: "thư giãn trang nghiêm cổ điển thanh bình",
  instrumental: "nhạc cụ không lời nền tập trung",
  lofi: "học tập study focus chill hip hop nhẹ",
  chillhop: "học tập study focus chill hip hop nhẹ",
  rnb: "tình cảm lãng mạn smooth mượt",
  soul: "tình cảm ấm áp soulful sâu lắng",
  synthwave: "retro hoài niệm night đêm tương lai",
  dream: "mộng mơ bay bổng ethereal ảo",
  "singer-songwriter": "tình cảm gần gũi trữ tình acoustic",
  dark: "tối tăm dark huyền bí",
  trap: "mạnh mẽ hiện đại tối street",
  country: "mộc mạc đồng quê giản dị",
  latin: "sôi động vui vẻ nhiệt đới",
  "hip-hop/rap": "mạnh mẽ chất rap street phố",
};

// Văn bản "thuần" để embed cho 1 bài hát
function songEmbeddingText(song) {
  const genreWords = (song.genre || "")
    .split(",")
    .map((g) => GENRE_MOODS[g.trim().toLowerCase()])
    .filter(Boolean)
    .join(", ");
  return normalize(
    [song.title, song.artist, song.genre, genreWords].filter(Boolean).join("\n") || "untitled"
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

module.exports = { embedText, embedBatch, songEmbeddingText, GENRE_MOODS, EMBED_DIM, hasKey: Boolean(AI_API_KEY) };