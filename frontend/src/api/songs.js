import apiClient from "./client";
import { downloadWithAuth } from "./download";

// Lấy danh sách bài hát (hỗ trợ tìm kiếm + lọc + phân trang)
// Trả về: { songs, total, limit, offset }
export const fetchSongs = async ({ q, genre, year, country, sort, limit, offset } = {}) => {
  const params = {};
  if (q) params.q = q;
  if (genre) params.genre = genre;
  if (year) params.year = year;
  if (country) params.country = country;
  if (sort) params.sort = sort;
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;
  const response = await apiClient.get("/songs", { params });
  return response.data;
};

// Lấy các nhãn lọc cho Browse: { genres, years, countries } kèm số lượng
export const fetchFacets = async () => {
  const response = await apiClient.get("/songs/facets");
  return response.data;
};

// Radio: chuỗi bài tương tự 1 bài (semantic embedding, fallback genre)
// Trả về: { seed, songs }
export const fetchRadio = async (songId, limit = 30) => {
  const response = await apiClient.get(`/songs/${songId}/radio`, { params: { limit } });
  return response.data;
};

// Mood: tìm bài theo tâm trạng/vibe (semantic search)
// Trả về: { mood, songs }
export const fetchMoodSongs = async (query, limit = 30) => {
  const response = await apiClient.get("/songs/mood", { params: { q: query, limit } });
  return response.data;
};

// Lấy bài hát ngẫu nhiên (cho nút "Phát ngẫu nhiên")
export const fetchRandomSongs = async (limit = 20) => {
  const response = await apiClient.get("/songs/random", { params: { limit } });
  return response.data;
};

// Tải bài hát về máy (proxy qua backend né CORS)
export const downloadSong = async (songId, fallbackName = "bai-hat.mp3") => {
  await downloadWithAuth(`${apiClient.defaults.baseURL}/songs/${songId}/download`, fallbackName);
};
