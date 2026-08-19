import { useEffect, useRef } from "react";
import { usePlayerStore } from "../usePlayerStore";

// Bỏ qua phím tắt khi đang gõ hoặc focus vào phần tử tương tác (tránh phá lúc nhập liệu)
const isInteractiveTarget = (target) => {
  if (!target || typeof target.tagName !== "string") return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "BUTTON" ||
    tag === "A" ||
    target.isContentEditable
  );
};

// Phím tắt toàn cục: Space (play/pause), ←/→ (prev/next), M (mute), R (repeat), S (shuffle)
export default function useKeyboardShortcuts() {
  const prevVolumeRef = useRef(0.8);

  useEffect(() => {
    const handler = (e) => {
      if (isInteractiveTarget(e.target)) return;

      const { togglePlay, playNext, playPrevious, volume, setVolume, cycleRepeat, toggleShuffle } =
        usePlayerStore.getState();

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          playNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          playPrevious();
          break;
        case "KeyM":
          if (volume > 0) {
            prevVolumeRef.current = volume;
            setVolume(0);
          } else {
            setVolume(prevVolumeRef.current || 0.8);
          }
          break;
        case "KeyR":
          cycleRepeat();
          break;
        case "KeyS":
          toggleShuffle();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}