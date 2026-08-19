// Chuyển đổi đường dẫn ảnh (/uploads/...) sang URL đầy đủ từ backend
export function resolveImageUrl(url) {
  if (!url) return "";
  // Giữ nguyên nếu đã là URL tuyệt đối (Google avatar, Jamendo CDN, data:, blob:)
  if (/^(https?:|data:|blob:|\/\/)/i.test(url)) {
    return url;
  }
  // Nếu là đường dẫn /uploads/... trả về từ backend
  const apiUrl = import.meta.env.VITE_API_URL || "";
  const backendBase = apiUrl ? apiUrl.replace(/\/api\/?$/i, "") : "";
  return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
}
