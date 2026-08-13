import apiClient from "./client";

export const fetchArtists = async () => {
  const response = await apiClient.get("/artists");
  return response.data;
};

export const fetchArtistSongs = async (name) => {
  const response = await apiClient.get(`/artists/${encodeURIComponent(name)}`);
  return response.data;
};

export const fetchFollowedArtists = async () => {
  const response = await apiClient.get("/artists/followed");
  return response.data;
};

export const followArtist = async (name) => {
  const response = await apiClient.post(`/artists/${encodeURIComponent(name)}/follow`);
  return response.data;
};

export const unfollowArtist = async (name) => {
  const response = await apiClient.delete(`/artists/${encodeURIComponent(name)}/follow`);
  return response.data;
};
