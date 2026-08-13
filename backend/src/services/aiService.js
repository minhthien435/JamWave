const axios = require("axios");

// ---- Cấu hình LLM (OpenAI-compatible: Gemini / DeepSeek / Groq...) ----
const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.deepseek.com";
const AI_MODEL = process.env.AI_MODEL || "deepseek-chat";

// ---------- Từ khóa thể loại (genre = tag Jamendo trong DB) ----------
const GENRE_KEYWORDS = [
  {
    keyword: "lofi",
    label: "Lo-fi / Chill",
    genres: ["lounge", "chillout", "downtempo", "relaxation", "ambient"],
    fallbackTerms: ["lofi", "lo-fi", "chill", "relax", "calm", "sleep", "soft", "ambient", "piano"],
  },
  {
    keyword: "lo-fi",
    label: "Lo-fi / Chill",
    genres: ["lounge", "chillout", "downtempo", "relaxation", "ambient"],
    fallbackTerms: ["lofi", "lo-fi", "chill", "relax", "calm", "sleep", "soft", "ambient", "piano"],
  },
  {
    keyword: "chill",
    label: "Lo-fi / Chill",
    genres: ["lounge", "chillout", "downtempo", "relaxation", "ambient"],
    fallbackTerms: ["lofi", "lo-fi", "chill", "relax", "calm", "sleep", "soft", "ambient", "piano"],
  },
  {
    keyword: "indie",
    label: "Indie",
    genres: ["singer-songwriter", "acoustic", "indie"],
    fallbackTerms: ["indie", "independent", "alternative"],
  },
  { keyword: "kpop", label: "K-Pop", genres: [], fallbackTerms: ["kpop", "k-pop"] },
  { keyword: "vpop", label: "V-Pop", genres: ["vietnamese"], fallbackTerms: ["vietnamese", "vpop", "v-pop"] },
  { keyword: "nhạc trẻ", label: "Nhạc trẻ Việt Nam", genres: ["vietnamese"] },
  {
    keyword: "rap",
    label: "Rap / Hip-hop",
    genres: ["hip-hop", "rap"],
    fallbackTerms: ["rap", "hip hop", "hip-hop"],
  },
  {
    keyword: "hip hop",
    label: "Rap / Hip-hop",
    genres: ["hip-hop", "rap"],
    fallbackTerms: ["hip hop", "hip-hop"],
  },
  { keyword: "bolero", label: "Bolero", genres: [], fallbackTerms: ["bolero"] },
  { keyword: "acoustic", label: "Acoustic", genres: ["acoustic"], fallbackTerms: ["acoustic", "unplugged"] },
  { keyword: "jazz", label: "Jazz", genres: ["jazz", "blues"], fallbackTerms: ["jazz"] },
  {
    keyword: "edm",
    label: "EDM / Điện tử",
    genres: ["electronic", "dance"],
    fallbackTerms: ["edm", "dance", "remix", "electro"],
  },
  { keyword: "electro", label: "EDM / Điện tử", genres: ["electronic"], fallbackTerms: ["electro"] },
  {
    keyword: "pop",
    label: "Pop",
    genres: ["pop", "singer-songwriter"],
    fallbackTerms: ["pop"],
  },
  { keyword: "rock", label: "Rock", genres: ["rock", "metal"], fallbackTerms: ["rock"] },
  { keyword: "phonk", label: "Phonk", genres: ["phonk"], fallbackTerms: ["phonk"] },
  {
    keyword: "synthwave",
    label: "Synthwave",
    genres: ["synthwave", "synth"],
    fallbackTerms: ["synthwave", "synth"],
  },
  {
    keyword: "classical",
    label: "Classical / Instrumental",
    genres: ["classical", "instrumental"],
    fallbackTerms: ["classical", "orchestra"],
  },
  {
    keyword: "piano",
    label: "Piano",
    genres: ["piano", "instrumental", "classical"],
    fallbackTerms: ["piano"],
  },
  {
    keyword: "ambient",
    label: "Ambient",
    genres: ["ambient", "relaxation", "downtempo"],
    fallbackTerms: ["ambient", "atmosphere"],
  },
  {
    keyword: "metal",
    label: "Rock / Metal",
    genres: ["metal", "rock"],
    fallbackTerms: ["metal"],
  },
  {
    keyword: "reggae",
    label: "World / Reggae",
    genres: ["reggae", "world"],
    fallbackTerms: ["reggae"],
  },
];

// ---------- Mood -> thể loại / từ khóa ----------
const MOOD_MAP = [
  { mood: "sad", genres: ["blues", "singer-songwriter", "lounge", "relaxation", "ambient", "piano"], terms: ["sad", "melancholic", "heartbreak", "lonely", "rain"] },
  { mood: "melancholic", genres: ["blues", "singer-songwriter", "lounge", "piano", "jazz"], terms: ["melancholic", "nostalgic", "memory"] },
  { mood: "happy", genres: ["pop", "dance", "funk", "reggae", "world", "rock"], terms: ["happy", "upbeat", "fun", "joy"] },
  { mood: "romantic", genres: ["singer-songwriter", "jazz", "lounge", "pop"], terms: ["love", "romance", "kiss", "heart"] },
  { mood: "dark", genres: ["phonk", "metal", "dark", "trap"], terms: ["dark", "gothic", "shadow"] },
  { mood: "dreamy", genres: ["ambient", "chillout", "downtempo", "dream"], terms: ["dream", "ethereal", "float"] },
  { mood: "focus", genres: ["piano", "ambient", "lounge", "chillout", "downtempo", "relaxation"], terms: ["focus", "concentration", "deep"] },
  { mood: "sleep", genres: ["relaxation", "ambient", "sleep", "piano", "chillout"], terms: ["sleep", "dream", "night"] },
  { mood: "workout", genres: ["dance", "electronic", "rock", "hip-hop", "phonk", "house"], terms: ["workout", "gym", "running", "energy"] },
  { mood: "rainy", genres: ["chillout", "lounge", "piano", "ambient", "blues"], terms: ["rain", "rainy", "storm"] },
  { mood: "night", genres: ["synthwave", "jazz", "lounge", "phonk", "downtempo"], terms: ["night", "midnight", "late"] },
  { mood: "energetic", genres: ["dance", "electronic", "rock", "phonk", "hip-hop", "house", "funk"], terms: ["energetic", "high energy", "pump"] },
  { mood: "chill", genres: ["lounge", "chillout", "downtempo", "relaxation", "ambient"], terms: ["chill", "calm", "relax", "peace"] },
  { mood: "calm", genres: ["lounge", "chillout", "downtempo", "relaxation", "ambient", "piano", "acoustic"], terms: ["calm", "peaceful", "soft", "gentle"] },
];

// ---------- Energy -> thể loại ----------
const ENERGY_GENRES = {
  high: ["dance", "electronic", "rock", "metal", "hip-hop", "rap", "phonk", "funk", "reggae", "house"],
  low: ["lounge", "chillout", "downtempo", "relaxation", "ambient", "piano", "classical", "acoustic", "jazz", "sleep"],
};

// ---------- Purpose (bối cảnh nghe) -> thể loại / từ khóa ----------
const PURPOSE_MAP = {
  study: { genres: ["lounge", "chillout", "downtempo", "relaxation", "ambient", "piano"], terms: ["study", "focus", "concentration"] },
  focus: { genres: ["lounge", "chillout", "downtempo", "relaxation", "ambient", "piano"], terms: ["focus", "concentration", "deep"] },
  sleep: { genres: ["relaxation", "ambient", "sleep", "piano", "chillout"], terms: ["sleep", "dream", "night"] },
  workout: { genres: ["dance", "electronic", "rock", "phonk", "hip-hop", "rap", "house"], terms: ["workout", "gym", "running", "cardio"] },
  party: { genres: ["dance", "electronic", "house", "pop", "funk"], terms: ["party", "dance", "club"] },
  night: { genres: ["synthwave", "jazz", "lounge", "phonk", "downtempo"], terms: ["night", "midnight", "late"] },
  coding: { genres: ["lounge", "downtempo", "chillout", "synthwave"], terms: ["coding", "developer", "hacker"] },
};

// ---------- Phát hiện ngôn ngữ ----------
const VI_WORDS = new Set([
  "mình", "bạn", "nhé", "nha", "được", "gì", "không", "này", "đó", "một", "có", "và", "là", "của",
  "cho", "tôi", "bài", "nhạc", "hát", "nghe", "phát", "muốn", "xin", "giúp", "ơi", "à", "rồi", "đang",
  "để", "vào", "ra", "qua", "lại", "khi", "theo", "như", "thì", "mà", "từ", "với", "cũng", "đây",
  "nào", "ai", "bao", "nhiêu", "hay", "gợi", "ý", "thích", "yêu", "cần", "tìm", "tên", "vậy", "lắm",
  "quá", "giờ", "chút", "thử", "xem", "thấy", "biết", "làm", "hỏi", "trả", "lời", "tạm", "dừng",
  "tiếp", "theo", "trước", "sau", "âm", "lượng", "tăng", "giảm", "bật", "tắt", "ngẫu", "nhiên", "thể",
  "loại", "nghệ", "sĩ", "ca", "sĩ", "album", "lời", "nói", "về", "tóm", "tắt", "ý", "nghĩa",
]);

function detectLanguage(text) {
  const t = (text || "").trim();
  if (!t) return "vi";
  if (/tiếng anh|in english|english please|speak english|translate to english/i.test(t)) return "en";
  if (/tiếng việt|bằng tiếng việt/i.test(t)) return "vi";

  const hasDiacritic = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(t);

  const tokens = t.toLowerCase().split(/\s+/).filter(Boolean);
  const viHits = tokens.filter((w) => VI_WORDS.has(w.replace(/[.,!?"'“”]/g, ""))).length;
  const ratio = tokens.length ? viHits / tokens.length : 0;

  if (hasDiacritic || ratio > 0.15) return "vi";
  return "en";
}

// ---------- Reply song ngữ ----------
function pickReply(templateObj, lang) {
  if (templateObj && typeof templateObj === "object") {
    return templateObj[lang] || templateObj.en || templateObj.vi || templateObj;
  }
  return templateObj;
}

function fmt(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (values && values[k] !== undefined ? values[k] : `{${k}}`));
}

// ---------- Gọi LLM (OpenAI-compatible) ----------
// Trả về { ok, text } hoặc { ok: false, reason: not_configured | invalid_key | rate_limit | model_not_found | timeout | error | bad_json }
async function askLLM(messages, opts = {}) {
  if (!AI_API_KEY) return { ok: false, reason: "not_configured" };

  const { json = false, temperature = 0.7 } = opts;
  const payload = {
    model: AI_MODEL,
    messages,
    temperature,
  };
  if (json) {
    payload.response_format = { type: "json_object" };
  }

  try {
    // Retry vài lần cho lỗi 5xx tạm thời (503/502/504/500) — nhà cung cấp quá tải
    const MAX_ATTEMPTS = 3;
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await axios.post(
          `${AI_BASE_URL.replace(/\/$/, "")}/chat/completions`,
          payload,
          {
            headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
            timeout: 30000,
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) return { ok: false, reason: "empty" };
        return { ok: true, text: content };
      } catch (err) {
        const s = err.response?.status;
        const isTransient = s === 500 || s === 502 || s === 503 || s === 504 || !s;
        if (!isTransient && s !== 429) throw err; // lỗi không thoáng qua -> trả thẳng
        if (attempt === MAX_ATTEMPTS) throw err;
        // Backoff tăng dần, chờ thêm chút nếu là rate limit
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt + (s === 429 ? 1500 : 0)));
      }
    }
  } catch (error) {
    const status = error.response?.status;
    if (status === 401 || status === 403) return { ok: false, reason: "invalid_key" };
    if (status === 402 || status === 429) return { ok: false, reason: "rate_limit" };
    if (status === 404) return { ok: false, reason: "model_not_found" };
    if (status === 500 || status === 502 || status === 503 || status === 504) return { ok: false, reason: "busy" };
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return { ok: false, reason: "timeout" };
    console.error("Lỗi gọi LLM:", error.message);
    return { ok: false, reason: "error" };
  }
}

const LLM_ERROR_MESSAGES = {
  invalid_key: {
    vi: "Mình không gọi được AI vì **API key không hợp lệ hoặc hết hạn**. Bạn kiểm tra lại dòng AI_API_KEY trong backend/.env nhé.",
    en: "I can't reach the AI because the **API key is invalid or expired**. Please check the AI_API_KEY line in backend/.env.",
  },
  rate_limit: {
    vi: "Mình không gọi được AI vì **đang vượt giới hạn yêu cầu (rate limit)**. Bạn chờ một lúc rồi thử lại nhé.",
    en: "I can't reach the AI because **we hit the request limit (rate limit)**. Please wait a moment and try again.",
  },
  model_not_found: {
    vi: "Mình không gọi được AI vì **model không tồn tại**. Bạn kiểm tra lại dòng AI_MODEL trong backend/.env nhé.",
    en: "I can't reach the AI because the **model doesn't exist**. Please check the AI_MODEL line in backend/.env.",
  },
  timeout: { vi: "AI đang phản hồi hơi lâu, bạn thử lại sau giây lát nhé!", en: "The AI is taking a bit long, please try again in a moment!" },
  busy: {
    vi: "Dịch vụ AI đang quá tải, mình chưa trả lời được ngay. Bạn thử lại sau vài giây nhé! 🙏",
    en: "The AI service is currently overloaded and can't respond right now. Please try again in a few seconds! 🙏",
  },
  error: { vi: "Dịch vụ AI đang gặp sự cố, bạn thử lại sau nhé!", en: "The AI service is having issues, please try again later!" },
  empty: { vi: "AI trả về kết quả rỗng, bạn thử hỏi lại cách khác nhé!", en: "The AI returned an empty result, try asking differently!" },
};

function llmErrorReply(result, lang) {
  if (result.reason === "not_configured") return null;
  return pickReply(LLM_ERROR_MESSAGES[result.reason] || LLM_ERROR_MESSAGES.error, lang);
}

// ---------- Phân loại ý định bằng LLM (JSON mode) ----------
const CLASSIFY_SYSTEM = `You are the intent classifier of JamWave, an independent music app (Jamendo + Audius indie catalog).
Analyze the user's latest message (use the short history if the user refers to previous messages).
Output ONLY a valid JSON object, no markdown fences, no commentary:
{
  "lang": "vi" or "en",
  "intent": "search_music" | "artist_info" | "album_info" | "play_music" | "lyrics" | "recommend" | "chat",
  "attributes": {
    "genre": string or null,
    "mood": one of ["happy","sad","chill","energetic","romantic","dark","dreamy","focus","sleep","workout","rainy","night","calm","melancholic"] or null,
    "energy": "low" | "medium" | "high" | null,
    "vocal": "instrumental" | "vocals" | null,
    "purpose": "study" | "focus" | "sleep" | "workout" | "party" | "night" | "coding" | null,
    "artist": artist name or null,
    "album": album name or null,
    "songTitle": exact song title or null,
    "count": number or null
  }
}

Rules:
- "search_music": user wants to DISCOVER music matching attributes (genre, mood, energy, vocals, purpose, style description).
- "play_music": user asks to PLAY/listen/open a specific song, artist, album or random music.
- "artist_info": asks about an artist (who they are, their genre, songs/albums by them).
- "album_info": asks about an album (release info, track list, play the album).
- "lyrics": asks for lyrics, or the meaning/summary/explanation of a song's lyrics.
- "recommend": asks for suggestions/recommendations/playlists of music.
- "chat": anything else (small talk, app questions).
- Infer attributes from feelings ("stressed", "sad", "rainy night", "studying") -> mood/purpose.
- For "without vocals" set vocal to "instrumental".
- When the user refines a previous search, keep the same style attributes.`;

function extractJson(text) {
  if (!text) return null;
  let cleaned = text.trim();
  // Bỏ fence ```json ... ```
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) cleaned = fence[1].trim();
  // Bỏ phần text bao quanh nếu có
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function classifyIntent(message, history = []) {
  const recent = (history || []).slice(-6).map((h) => `${h.role}: ${h.text}`).join("\n");
  const userContent = `Latest message: ${message}\n\nConversation history:\n${recent || "(empty)"}`;

  const result = await askLLM(
    [
      { role: "system", content: CLASSIFY_SYSTEM },
      { role: "user", content: userContent },
    ],
    { json: true, temperature: 0.2 }
  );

  if (!result.ok) return result;

  const parsed = extractJson(result.text);
  if (!parsed || !parsed.intent) return { ok: false, reason: "bad_json", raw: result.text };

  return { ok: true, intent: parsed };
}

// ---------- Session store (context hội thoại, in-memory) ----------
class SessionStore {
  constructor(ttlMs = 30 * 60 * 1000) {
    this.map = new Map();
    this.ttl = ttlMs;
    // Dọn dẹp định kỳ
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
    this.cleanupInterval?.unref?.();
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.updatedAt > this.ttl) {
      this.map.delete(key);
      return null;
    }
    return entry;
  }

  update(key, patch) {
    const existing = this.get(key) || { lastResults: [], history: [], updatedAt: Date.now() };
    this.map.set(key, { ...existing, ...patch, updatedAt: Date.now() });
    return this.map.get(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (now - entry.updatedAt > this.ttl) this.map.delete(key);
    }
  }
}

const sessionStore = new SessionStore();

module.exports = {
  GENRE_KEYWORDS,
  MOOD_MAP,
  ENERGY_GENRES,
  PURPOSE_MAP,
  detectLanguage,
  pickReply,
  fmt,
  askLLM,
  llmErrorReply,
  classifyIntent,
  sessionStore,
};