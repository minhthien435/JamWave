import { create } from "zustand";

export const useDownloadStore = create((set, get) => ({
  isOpen: false,
  title: "",
  type: "song", // "song" | "playlist"
  progress: 0, // 0 - 100
  loadedBytes: 0,
  totalBytes: null,
  speed: 0, // bytes/sec
  remainingSeconds: null,
  status: "idle", // "connecting" | "downloading" | "completed" | "error"
  error: null,
  abortController: null,

  startDownload: ({ title, type = "song", abortController = null, totalBytes = null }) => {
    set({
      isOpen: true,
      title,
      type,
      progress: 0,
      loadedBytes: 0,
      totalBytes,
      speed: 0,
      remainingSeconds: null,
      status: "connecting",
      error: null,
      abortController,
    });
  },

  updateProgress: ({ loaded, total, percent, speed, remainingSeconds }) => {
    set((state) => ({
      status: "downloading",
      loadedBytes: loaded ?? state.loadedBytes,
      totalBytes: total !== undefined ? total : state.totalBytes,
      progress: Math.min(Math.max(percent ?? 0, 0), 100),
      speed: speed ?? state.speed,
      remainingSeconds: remainingSeconds !== undefined ? remainingSeconds : state.remainingSeconds,
    }));
  },

  finishDownload: (filename) => {
    set({
      status: "completed",
      progress: 100,
      remainingSeconds: 0,
    });
  },

  failDownload: (errorMessage) => {
    set({
      status: "error",
      error: errorMessage || "Đã xảy ra lỗi khi tải xuống",
    });
  },

  cancelDownload: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({
      isOpen: false,
      status: "idle",
      abortController: null,
    });
  },

  closeModal: () => {
    set({
      isOpen: false,
      status: "idle",
      abortController: null,
      error: null,
    });
  },
}));
