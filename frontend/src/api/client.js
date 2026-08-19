import axios from "axios";

const TOKEN_KEY = "spotify_token";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 10000,
});

// Request interceptor: tự động gắn token xác thực nếu có
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor để xử lý lỗi tập trung
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token hết hạn / không hợp lệ: tự đăng xuất (trừ login/register)
    const isAuthEndpoint = error.config?.url?.includes("/auth/login") || error.config?.url?.includes("/auth/register");
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("spotify_user");
      window.dispatchEvent(new Event("jamwave:unauthorized"));
    }
    const message = error.response?.data?.error || error.response?.data?.message || error.message || "Đã xảy ra lỗi mạng";
    console.error("[API Error]:", message);
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
