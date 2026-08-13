import apiClient from "./client";

export const fetchAlbums = async () => {
  const response = await apiClient.get("/albums");
  return response.data;
};

export const fetchAlbum = async (id) => {
  const response = await apiClient.get(`/albums/${id}`);
  return response.data;
};
