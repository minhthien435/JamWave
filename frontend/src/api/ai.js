import apiClient from "./client";

export const sendChatMessage = async (message, { history = [], currentSong = null } = {}) => {
  const payload = {
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
  };
  const response = await apiClient.post("/ai/chat", payload, { timeout: 60000 });
  return response.data;
};