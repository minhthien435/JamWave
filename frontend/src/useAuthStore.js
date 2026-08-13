import { create } from "zustand";
import * as authApi from "./api/auth";

const TOKEN_KEY = "spotify_token";
const USER_KEY = "spotify_user";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

export const useAuthStore = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: getStoredUser(),
  loading: false,
  error: null,
  ready: false,

  // Gọi lúc khởi động app: xác thực token đang lưu với server
  async bootstrap() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ ready: true });
      return;
    }
    try {
      const data = await authApi.fetchMe();
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      set({ user: data.user, token, ready: true, error: null });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      set({ user: null, token: null, ready: true, error: null });
    }
  },

  // Đăng xuất khi token hết hạn (gọi qua sự kiện từ API client)
  forceLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null, error: null });
  },

  async login(email, password) {
    set({ loading: true, error: null });
    try {
      const data = await authApi.login(email, password);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      set({ token: data.token, user: data.user, loading: false });
      return data;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  async register(name, email, password) {
    set({ loading: true, error: null });
    try {
      const data = await authApi.register(name, email, password);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      set({ token: data.token, user: data.user, loading: false });
      return data;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, error: null });
  },
}));
