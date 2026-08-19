import apiClient from "./client";

const buildPayload = (message, { history = [], currentSong = null } = {}) => ({
  message,
  history: history.slice(-10),
  currentSong: currentSong
    ? {
        id: currentSong.id,
        title: currentSong.title,
        artist: currentSong.artist,
        albumCover: currentSong.albumCover,
        albumId: currentSong.albumId ?? null,
        duration: currentSong.duration,
        source: currentSong.source,
        genre: currentSong.genre,
      }
    : null,
});

export const sendChatMessage = async (message, opts = {}) => {
  const response = await apiClient.post("/ai/chat", buildPayload(message, opts), { timeout: 60000 });
  return response.data;
};

// SSE: trả { onResult(data), onText(chunk) } qua callback; resolve khi server đóng.
// Ném lỗi (kèm err.response) nếu HTTP != 200 để caller fallback về POST thường.
export const sendChatMessageStream = async (message, opts = {}, { onResult, onText } = {}) => {
  const base = apiClient.defaults.baseURL || "/api";
  const token = localStorage.getItem("spotify_token");
  const resp = await fetch(`${base}/ai/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(buildPayload(message, opts)),
  });

  if (!resp.ok) {
    const err = new Error(`Request failed with status code ${resp.status}`);
    err.response = { status: resp.status, data: await resp.json().catch(() => ({})) };
    throw err;
  }
  if (!resp.body) throw new Error("Streaming not supported");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = raw.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        const evt = JSON.parse(line.slice(6));
        if (evt.type === "result") onResult?.(evt.data);
        else if (evt.type === "text") onText?.(evt.text);
      } catch {
        // bỏ qua event không parse được
      }
    }
  }
};