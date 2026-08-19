import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  DownloadSimple,
  CheckCircle,
  WarningCircle,
  X,
  SpinnerGap,
  CassetteTape,
  Disc,
  Clock,
  Gauge,
  HardDrives,
} from "@phosphor-icons/react";
import { useDownloadStore } from "../useDownloadStore";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return "0 KB/s";
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
}

function formatETA(seconds) {
  if (seconds === null || seconds === undefined) return "Đang tính...";
  if (seconds <= 0) return "Vài giây";
  if (seconds < 60) return `~${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `~${mins}p ${secs}s`;
}

export default function DownloadProgressModal() {
  const {
    isOpen,
    title,
    type,
    progress,
    loadedBytes,
    totalBytes,
    speed,
    remainingSeconds,
    status,
    error,
    cancelDownload,
    closeModal,
  } = useDownloadStore();

  const [autoCloseTimer, setAutoCloseTimer] = useState(null);

  // Auto-close sau khi tải xong 2.2 giây
  useEffect(() => {
    if (status === "completed") {
      const timer = setTimeout(() => {
        closeModal();
      }, 2200);
      setAutoCloseTimer(timer);
      return () => clearTimeout(timer);
    }
  }, [status, closeModal]);

  if (!isOpen) return null;

  const isCompleted = status === "completed";
  const isError = status === "error";
  const isDownloading = status === "downloading" || status === "connecting";

  return createPortal(
    <div
      className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-sm flex items-start justify-center p-4 pt-20 sm:pt-28 pb-32 animate-fade-in font-sans select-none"
      onClick={() => {
        if (!isDownloading) closeModal();
      }}
    >
      <div
        className="indie-panel rounded-2xl p-6 w-full max-w-md shadow-2xl border border-[#EDE6D6]/20 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div
          className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-[60px] pointer-events-none transition-colors duration-500 ${
            isCompleted
              ? "bg-[#55B37E]/20"
              : isError
              ? "bg-red-500/20"
              : "bg-[#D97C54]/20"
          }`}
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 mb-5 border-b border-dashed-indie pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0 transition-colors duration-300 ${
                isCompleted
                  ? "bg-[#55B37E]/15 border-[#55B37E]/30 text-[#55B37E]"
                  : isError
                  ? "bg-red-500/15 border-red-500/30 text-red-400"
                  : "bg-[#2E2721] border-[#EDE6D6]/15 text-[#D97C54]"
              }`}
            >
              {isCompleted ? (
                <CheckCircle size={24} weight="fill" className="animate-scale-in" />
              ) : isError ? (
                <WarningCircle size={24} weight="fill" />
              ) : type === "playlist" ? (
                <CassetteTape size={24} weight="duotone" className="reel-spinning" />
              ) : (
                <Disc size={24} weight="duotone" className="reel-spinning" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EDE6D6]/10 text-[#D4A24C] border border-[#EDE6D6]/10">
                  {type === "playlist" ? "Gói ZIP Playlist" : "Bản thu MP3"}
                </span>
                <span className="font-mono text-[10px] text-[#8A7B6C]">
                  {isCompleted ? "Hoàn tất" : isError ? "Lỗi" : "Đang xử lý"}
                </span>
              </div>
              <h3 className="font-serif italic font-bold text-sm text-[#EDE6D6] truncate mt-1">
                {title || "Đang tải xuống..."}
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              if (isDownloading) cancelDownload();
              else closeModal();
            }}
            className="text-[#A39282] hover:text-[#EDE6D6] p-1.5 rounded-lg hover:bg-[#2E2721] transition-colors flex-shrink-0"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Display */}
        {isError ? (
          <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 my-2 text-xs text-red-300">
            <p className="font-medium">{error || "Tải xuống không thành công"}</p>
            <p className="text-[11px] text-red-400/80 mt-1">
              Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.
            </p>
          </div>
        ) : (
          <div className="space-y-4 my-2">
            {/* Percentage & Status text */}
            <div className="flex items-baseline justify-between font-mono">
              <span className="text-2xl font-bold tracking-tight text-[#EDE6D6]">
                {progress}%
              </span>
              <span className="text-xs text-[#A39282]">
                {isCompleted
                  ? "Tải về thành công!"
                  : status === "connecting"
                  ? "Đang kết nối kho nhạc..."
                  : `${formatBytes(loadedBytes)} ${
                      totalBytes ? `/ ${formatBytes(totalBytes)}` : "đã nhận"
                    }`}
              </span>
            </div>

            {/* Custom Indie Progress Bar */}
            <div className="w-full h-3 bg-[#1E1A17] rounded-full overflow-hidden p-0.5 border border-[#EDE6D6]/15 relative">
              <div
                className={`h-full rounded-full transition-all duration-150 ease-out relative ${
                  isCompleted
                    ? "bg-[#55B37E]"
                    : "bg-gradient-to-r from-[#B85C38] via-[#D97C54] to-[#D4A24C]"
                }`}
                style={{ width: `${Math.max(progress, 3)}%` }}
              >
                {/* Glow bar indicator on edge */}
                {isDownloading && (
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 rounded-full blur-[1px] animate-pulse" />
                )}
              </div>
            </div>

            {/* Meta statistics grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center font-mono text-[11px]">
              <div className="bg-[#26211C] p-2.5 rounded-xl border border-[#EDE6D6]/10">
                <div className="flex items-center justify-center gap-1 text-[#8A7B6C] mb-1">
                  <HardDrives size={12} />
                  <span>Dung lượng</span>
                </div>
                <p className="text-[#EDE6D6] font-semibold truncate">
                  {formatBytes(loadedBytes)}
                </p>
              </div>

              <div className="bg-[#26211C] p-2.5 rounded-xl border border-[#EDE6D6]/10">
                <div className="flex items-center justify-center gap-1 text-[#8A7B6C] mb-1">
                  <Gauge size={12} />
                  <span>Tốc độ</span>
                </div>
                <p className="text-[#EDE6D6] font-semibold truncate">
                  {isCompleted ? "Xong" : formatSpeed(speed)}
                </p>
              </div>

              <div className="bg-[#26211C] p-2.5 rounded-xl border border-[#EDE6D6]/10">
                <div className="flex items-center justify-center gap-1 text-[#8A7B6C] mb-1">
                  <Clock size={12} />
                  <span>Còn lại</span>
                </div>
                <p className="text-[#EDE6D6] font-semibold truncate">
                  {isCompleted ? "0s" : formatETA(remainingSeconds)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-dashed-indie">
          <p className="text-[11px] font-mono text-[#8A7B6C]">
            {isCompleted
              ? "Tệp đã được lưu vào máy"
              : isDownloading
              ? "Giữ trình duyệt mở trong khi tải"
              : "Có thể đóng cửa sổ này"}
          </p>

          {isDownloading ? (
            <button
              onClick={cancelDownload}
              className="font-mono text-xs px-3.5 py-2 rounded-xl text-[#A39282] hover:text-red-400 bg-[#26211C] hover:bg-red-500/10 border border-[#EDE6D6]/15 hover:border-red-500/30 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <X size={14} />
              <span>Hủy tải</span>
            </button>
          ) : (
            <button
              onClick={closeModal}
              className="font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] shadow-sm active:scale-95 transition-all"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
