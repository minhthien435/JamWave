import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Disc3, Play, Loader2 } from "lucide-react";
import { fetchAlbum } from "../api/albums";
import { usePlayerStore } from "../usePlayerStore";
import SongTable from "../components/SongTable";
import SourceBadge from "../components/SourceBadge";

export default function AlbumPage() {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [error, setError] = useState(null);
  const { setCurrentSong, setQueue } = usePlayerStore();

  useEffect(() => {
    let cancelled = false;
    fetchAlbum(id)
      .then((data) => {
        if (cancelled) return;
        setAlbum(data);
        setQueue(data.songs);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, setQueue]);

  if (!album && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Loader2 size={32} className="animate-spin mb-3" />
        <p className="text-sm">Đang tải album...</p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-400 font-semibold text-lg mb-2">Không thể tải album</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (album.songs.length === 0) return;
    setCurrentSong(album.songs[0]);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-end gap-6 mb-8">
        <div className="w-44 h-44 bg-zinc-800 rounded-md flex items-center justify-center text-zinc-500 shadow-xl flex-shrink-0 overflow-hidden">
          {album.coverImg ? (
            <img src={album.coverImg} alt={album.title} className="w-full h-full object-cover" />
          ) : (
            <Disc3 size={64} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase font-bold text-zinc-400">Album</p>
          <div className="flex items-center gap-2 mt-1 mb-3">
            <h1 className="text-4xl font-extrabold tracking-tight truncate">{album.title}</h1>
            <SourceBadge source={album.source} />
          </div>
          <p className="text-sm text-zinc-400">
            {album.artist} • {album.songs.length} bài hát
          </p>

          <button
            onClick={handlePlayAll}
            disabled={album.songs.length === 0}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-violet-600 via-purple-500 to-cyan-400 text-white flex items-center justify-center hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-lg shadow-violet-500/35 active:scale-95 mt-4"
            title="Phát tất cả"
          >
            <Play size={24} fill="white" className="ml-0.5" />
          </button>
        </div>
      </div>

      {/* Danh sách bài hát */}
      <div className="border-t border-zinc-800 pt-4">
        <SongTable songs={album.songs} emptyText="Album này chưa có bài hát nào." />
      </div>
    </div>
  );
}
