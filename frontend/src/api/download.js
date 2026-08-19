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

// Tải file qua fetch → ReadableStream theo dõi tiến trình → Blob → trigger click
export async function downloadWithAuth(url, fallbackName, onProgress = null, signal = null) {
  const token = localStorage.getItem("spotify_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let response;
  try {
    response = await fetch(url, { headers, signal });
  } catch (error) {
    if (error?.name === "AbortError" || signal?.aborted) {
      throw new Error("Đã hủy tải xuống");
    }
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

  const contentLengthHeader = response.headers.get("Content-Length");
  const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
  const contentType = response.headers.get("Content-Type") || "application/octet-stream";
  const filename = getFilenameFromDisposition(response.headers.get("Content-Disposition"), fallbackName);

  let blob;

  if (response.body && typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;
    const startTime = performance.now();
    let lastUpdate = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      const now = performance.now();
      // Throttle nhẹ cập nhật giao diện (mỗi 70ms) để không gây giật frame
      if (onProgress && (now - lastUpdate > 70 || (total && receivedLength === total))) {
        const elapsedSec = Math.max((now - startTime) / 1000, 0.001);
        const speed = receivedLength / elapsedSec; // bytes/sec

        let percent = 0;
        let remainingSeconds = null;

        if (total && total > 0) {
          percent = Math.min(Math.round((receivedLength / total) * 100), 99);
          const remainingBytes = Math.max(total - receivedLength, 0);
          remainingSeconds = speed > 0 ? Math.max(Math.ceil(remainingBytes / speed), 1) : null;
        } else {
          // Dynamic ZIP stream không có header Content-Length trước
          // Tạo đường cong phần trăm tiệm cận mượt mà dựa theo dung lượng đã nhận
          percent = Math.min(Math.round((1 - Math.exp(-receivedLength / (8 * 1024 * 1024))) * 92) + 5, 95);
        }

        onProgress({
          loaded: receivedLength,
          total,
          percent,
          speed,
          remainingSeconds,
        });

        lastUpdate = now;
      }
    }

    blob = new Blob(chunks, { type: contentType });

    if (onProgress) {
      onProgress({
        loaded: receivedLength,
        total: receivedLength,
        percent: 100,
        speed: 0,
        remainingSeconds: 0,
      });
    }
  } else {
    blob = await response.blob();
  }

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  return filename;
}

export default apiClient;