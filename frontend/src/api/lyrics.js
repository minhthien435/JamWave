import apiClient from "./client";

// Lấy lời bài hát (backend cache từ LRCLIB)
export const fetchLyrics = async (songId) => {
  const response = await apiClient.get(`/lyrics/${songId}`);
  return response.data;
};
