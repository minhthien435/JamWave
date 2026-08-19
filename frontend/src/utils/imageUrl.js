// Chuyển đổi đường dẫn ảnh (/uploads/...) sang URL đầy đủ từ backend & chuẩn hóa CDN
export function resolveImageUrl(url) {
  if (!url) return "";

  // Chuẩn hóa các node IPFS Audius cũ/ngừng hoạt động về gateway chính thức
  if (
    url.includes("/content/") &&
    (url.includes("audius") ||
      url.includes("open-audio-validator") ||
      url.includes("theblueprint.xyz") ||
      url.includes("figment.io") ||
      url.includes("zeogrid.com"))
  ) {
    const match = url.match(/\/content\/.+$/i);
    if (match) {
      return `https://creatornode.audius.co${match[0]}`;
    }
  }

  // Giữ nguyên nếu đã là URL tuyệt đối (Google avatar, Jamendo CDN, data:, blob:)
  if (/^(https?:|data:|blob:|\/\/)/i.test(url)) {
    return url;
  }

  // Nếu là đường dẫn /uploads/... trả về từ backend
  const apiUrl = import.meta.env.VITE_API_URL || "";
  const backendBase = apiUrl ? apiUrl.replace(/\/api\/?$/i, "") : "";
  return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
}
