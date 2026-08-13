import apiClient from "./client";

export const fetchAdminStats = async () => {
  const response = await apiClient.get("/admin/stats");
  return response.data;
};

export const fetchAdminUsers = async ({ q = "", page = 1, limit = 20 } = {}) => {
  const response = await apiClient.get(`/admin/users?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`);
  return response.data;
};

export const updateUserRole = async (userId, role) => {
  const response = await apiClient.patch(`/admin/users/${userId}`, { role });
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await apiClient.delete(`/admin/users/${userId}`);
  return response.data;
};

export const fetchAdminSongs = async ({ q = "", page = 1, limit = 20 } = {}) => {
  const response = await apiClient.get(`/admin/songs?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`);
  return response.data;
};

export const deleteSong = async (songId) => {
  const response = await apiClient.delete(`/admin/songs/${songId}`);
  return response.data;
};
