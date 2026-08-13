import apiClient from "./client";

export const fetchPlaylists = async () => {
  const response = await apiClient.get("/playlists");
  return response.data;
};

export const fetchPlaylist = async (id) => {
  const response = await apiClient.get(`/playlists/${id}`);
  return response.data;
};

export const createPlaylist = async (title, isPublic = false) => {
  const response = await apiClient.post("/playlists", { title, isPublic });
  return response.data;
};

// Playlist được chia sẻ công khai (không cần đăng nhập)
export const fetchSharedPlaylist = async (id) => {
  const response = await apiClient.get(`/playlists/shared/${id}`);
  return response.data;
};

export const togglePlaylistPublic = async (id, isPublic) => {
  const response = await apiClient.patch(`/playlists/${id}/privacy`, { isPublic });
  return response.data;
};

export const deletePlaylist = async (id) => {
  const response = await apiClient.delete(`/playlists/${id}`);
  return response.data;
};

export const renamePlaylist = async (id, title) => {
  const response = await apiClient.patch(`/playlists/${id}`, { title });
  return response.data;
};

export const addSongToPlaylist = async (playlistId, songId) => {
  const response = await apiClient.post(`/playlists/${playlistId}/songs`, { songId });
  return response.data;
};

export const removeSongFromPlaylist = async (playlistId, songId) => {
  const response = await apiClient.delete(`/playlists/${playlistId}/songs/${songId}`);
  return response.data;
};
