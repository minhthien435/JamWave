import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Disc, Play, SpinnerGap } from "@phosphor-icons/react";
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
        if (!cancelled) return;
        setAlbum(data);
        setQueue(data.songs);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, setQueue]);

  if (!album && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-violet-400">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="text-sm text-zinc-400 font-medium">Đang tải album...</p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-rose-400 font-semibold mb-2">Không thể tải album</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (album.songs.length === 0) return;
    setCurrentSong(album.songs[0]);
  };

  return (
    <div className="space-y-8 select-none pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-white/10">
        <div className="w-44 h-44 sm:w-52 sm:h-52 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 shadow-2xl flex-shrink-0 overflow-hidden border border-white/10">
          {album.coverImg ? (
            <img src={album.coverImg} alt={album.title} className="w-full h-full object-cover" />
          ) : (
            <Disc size={64} weight="duotone" />
          )}
        </div>
        <div className="min-w-0 text-center sm:text-left flex-1">
          <p className="text-xs uppercase font-bold text-violet-400 tracking-wider">Album</p>
          <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 mb-2">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white truncate">{album.title}</h1>
            <SourceBadge source={album.source} />
          </div>
          <p className="text-sm text-zinc-400 font-medium">
            {album.artist} • <span className="tabular-nums">{album.songs.length}</span> bài hát
          </p>

          <button
            onClick={handlePlayAll}
            disabled={album.songs.length === 0}
            className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-md shadow-violet-950/60 active:scale-95 mt-4 mx-auto sm:mx-0"
            title="Phát tất cả"
          >
            <Play size={22} weight="fill" className="ml-0.5" />
          </button>
        </div>
      </div>

      {/* Danh sách bài hát */}
      <div>
        <SongTable songs={album.songs} emptyText="Album này chưa có bài hát nào." />
      </div>
    </div>
  );
}
