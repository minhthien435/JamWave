import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../useAuthStore";
import * as likesApi from "../api/likes";

// Hook quản lý trạng thái "yêu thích" cho danh sách bài hát
export function useLikedSongs() {
  const token = useAuthStore((s) => s.token);
  const [likedIds, setLikedIds] = useState(() => new Set());

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    likesApi
      .fetchLikedSongs()
      .then((data) => {
        if (!cancelled) {
          setLikedIds(new Set((data.songs || []).map((s) => s.id)));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [token]);

  const toggleLike = useCallback(
    async (song) => {
      if (!token) return false;

      const isLiked = likedIds.has(song.id);
      try {
        if (isLiked) {
          await likesApi.unlikeSong(song.id);
          setLikedIds((prev) => {
            const next = new Set(prev);
            next.delete(song.id);
            return next;
          });
        } else {
          await likesApi.likeSong(song.id);
          setLikedIds((prev) => new Set(prev).add(song.id));
        }
        return true;
      } catch (error) {
        console.error("Lỗi thay đổi trạng thái yêu thích:", error.message);
        return false;
      }
    },
    [token, likedIds]
  );

  return { likedIds, toggleLike };
}
