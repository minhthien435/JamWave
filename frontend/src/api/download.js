import apiClient from "./client";

// Lấy tên file từ header Content-Disposition của backend
function getFilenameFromDisposition(disposition, fallback) {
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        // bỏ qua, dùng match bên dưới
      }
    }
    const plain = disposition.match(/filename="?([^";]+)"?/i);
    if (plain) return plain[1];
  }
  return fallback || "download";
}

// Tải file qua fetch → Blob → object URL → click link.
// Cách này gắn được header Authorization và hoạt động trên Tauri/WebView2
// (không phụ thuộc vào download manager của trình duyệt).
export async function downloadWithAuth(url, fallbackName) {
  const token = localStorage.getItem("spotify_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let response;
  try {
    response = await fetch(url, { headers });
  } catch (error) {
    throw new Error("Không kết nối được máy chủ để tải xuống", { cause: error });
  }

  if (!response.ok) {
    let message = "Tải xuống thất bại";
    try {
      const data = await response.json();
      if (data.error) message = data.error;
    } catch {
      // body không phải JSON
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const filename = getFilenameFromDisposition(response.headers.get("Content-Disposition"), fallbackName);

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
  return filename;
}

export default apiClient;