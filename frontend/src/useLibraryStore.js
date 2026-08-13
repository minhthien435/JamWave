import { create } from "zustand";
import * as playlistApi from "./api/playlists";

export const useLibraryStore = create((set) => ({
  playlists: [],
  loading: false,

  async loadPlaylists() {
    set({ loading: true });
    try {
      const data = await playlistApi.fetchPlaylists();
      set({ playlists: data, loading: false });
    } catch (error) {
      console.error("Lỗi tải danh sách playlist:", error.message);
      set({ loading: false });
    }
  },

  clear() {
    set({ playlists: [], loading: false });
  },
}));
