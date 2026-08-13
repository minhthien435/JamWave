import apiClient from "./client";

// Ghi nhận lượt nghe (chỉ khi đăng nhập, fire-and-forget)
export const recordListen = async (songId) => {
  const response = await apiClient.post(`/songs/${songId}/listen`);
  return response.data;
};

// Bài hát nghe gần đây của người dùng (mỗi bài 1 lần)
export const fetchRecentListens = async (limit = 10) => {
  const response = await apiClient.get(`/listens/recent?limit=${limit}`);
  return response.data;
};

// Top bài hát nghe nhiều nhất (week | month) - công khai
export const fetchTopListens = async (period = "week", limit = 10) => {
  const response = await apiClient.get(`/listens/top?period=${period}&limit=${limit}`);
  return response.data;
};
