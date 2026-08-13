import apiClient from "./client";

export const fetchLikedSongs = async () => {
  const response = await apiClient.get("/likes");
  return response.data;
};

export const likeSong = async (songId) => {
  const response = await apiClient.put(`/likes/${songId}`);
  return response.data;
};

export const unlikeSong = async (songId) => {
  const response = await apiClient.delete(`/likes/${songId}`);
  return response.data;
};
