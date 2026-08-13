import apiClient from "./client";

// Lấy danh sách bài hát (hỗ trợ tìm kiếm + phân trang)
// Trả về: { songs, total, limit, offset }
export const fetchSongs = async ({ q, limit, offset } = {}) => {
  const params = {};
  if (q) params.q = q;
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;
  const response = await apiClient.get("/songs", { params });
  return response.data;
};

// Lấy bài hát ngẫu nhiên (cho nút "Phát ngẫu nhiên")
export const fetchRandomSongs = async (limit = 20) => {
  const response = await apiClient.get("/songs/random", { params: { limit } });
  return response.data;
};
