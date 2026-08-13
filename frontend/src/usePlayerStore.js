import { create } from "zustand";

const STORAGE_KEY = "spotify_player_state";

// Khôi phục trạng thái đã lưu (volume, bài đang phát, queue)
const loadPersisted = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === "number" ? parsed.volume : 0.8,
      currentSong: parsed.currentSong || null,
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
    };
  } catch {
    return null;
  }
};

const persisted = loadPersisted();

export const usePlayerStore = create((set, get) => ({
  currentSong: persisted?.currentSong ?? null,
  isPlaying: false,
  queue: persisted?.queue ?? [],
  volume: persisted?.volume ?? 0.8,
  repeatMode: "off", // "off" | "all" | "one"
  shuffle: false,

  // Set current song
  setCurrentSong: (song) => set({ currentSong: song, isPlaying: true }),

  // Set song queue
  setQueue: (songs) => set({ queue: songs }),

  // Toggle play/pause
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  // Play / pause directly
  setIsPlaying: (value) => set({ isPlaying: value }),

  // Set volume (0 - 1)
  setVolume: (value) => set({ volume: value }),

  // Chế độ lặp: off -> all -> one -> off
  cycleRepeat: () =>
    set((state) => {
      const modes = ["off", "all", "one"];
      const next = modes[(modes.indexOf(state.repeatMode) + 1) % modes.length];
      return { repeatMode: next };
    }),

  // Bật / tắt phát ngẫu nhiên
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

  // Thêm bài hát vào cuối hàng chờ
  addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),

  // Xóa bài khỏi hàng chờ
  removeFromQueue: (songId) =>
    set((state) => ({ queue: state.queue.filter((s) => s.id !== songId) })),

  // Play next song in queue
  playNext: () => {
    const { queue, currentSong, shuffle, repeatMode } = get();
    if (queue.length === 0) return;

    if (queue.length === 1) {
      set({ currentSong: queue[0], isPlaying: true });
      return;
    }

    // Chế độ ngẫu nhiên: chọn bài khác với bài hiện tại
    if (shuffle) {
      let next = currentSong;
      while (next && next.id === currentSong?.id) {
        next = queue[Math.floor(Math.random() * queue.length)];
      }
      set({ currentSong: next, isPlaying: true });
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSong?.id);
    const isLast = currentIndex === -1 || currentIndex === queue.length - 1;

    if (isLast) {
      if (repeatMode === "all") {
        // Lặp cả danh sách: quay về bài đầu tiên
        set({ currentSong: queue[0], isPlaying: true });
      } else {
        // Hết queue: dừng lại
        set({ isPlaying: false });
      }
    } else {
      set({ currentSong: queue[currentIndex + 1], isPlaying: true });
    }
  },

  // Play previous song in queue
  playPrevious: () => {
    const { queue, currentSong } = get();
    if (queue.length === 0) return;

    const currentIndex = queue.findIndex((s) => s.id === currentSong?.id);
    if (currentIndex > 0) {
      set({ currentSong: queue[currentIndex - 1], isPlaying: true });
    } else {
      // Chuyển sang bài cuối cùng
      set({ currentSong: queue[queue.length - 1], isPlaying: true });
    }
  },
}));

// Tự động lưu trạng thái phát nhạc vào localStorage
usePlayerStore.subscribe((state) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        volume: state.volume,
        currentSong: state.currentSong,
        queue: state.queue,
      })
    );
  } catch {
    // bỏ qua nếu localStorage đầy / không cho phép
  }
});
