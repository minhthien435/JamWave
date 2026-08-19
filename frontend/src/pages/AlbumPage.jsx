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
      <div className="flex flex-col items-center justify-center py-20 text-[#D97C54] font-sans">
        <SpinnerGap size={30} className="animate-spin mb-3" />
        <p className="font-mono text-xs text-[#A39282]">Đang tải album...</p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center font-sans">
        <p className="font-mono text-sm text-red-400 mb-2">Không thể tải album</p>
        <p className="font-mono text-xs text-[#A39282]">{error}</p>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (album.songs.length === 0) return;
    setCurrentSong(album.songs[0]);
  };

  return (
    <div className="space-y-8 select-none pb-8 font-sans">
      {/* Header Polaroid Box */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-dashed-indie">
        {/* Polaroid frame */}
        <div className="w-44 h-44 sm:w-52 sm:h-52 polaroid-frame rounded-xl flex items-center justify-center text-zinc-500 shadow-2xl flex-shrink-0 relative rotate-1">
          <div className="washi-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 h-4 rounded-sm -rotate-2 z-10" />
          {album.coverImg ? (
            <img src={album.coverImg} alt={album.title} className="w-full h-full object-cover rounded shadow-inner" />
          ) : (
            <Disc size={64} weight="duotone" />
          )}
        </div>

        <div className="min-w-0 text-center sm:text-left flex-1 space-y-2">
          <p className="font-mono text-[10px] uppercase font-bold text-[#D97C54] tracking-widest px-2.5 py-0.5 rounded-full bg-[#B85C38]/15 border border-[#B85C38]/30 inline-block">
            ALBUM ĐẶC SẮC
          </p>

          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h1 className="font-serif italic text-2xl sm:text-4xl font-bold tracking-tight text-[#EDE6D6] truncate">
              {album.title}
            </h1>
            <SourceBadge source={album.source} />
          </div>

          <p className="font-mono text-xs text-[#A39282]">
            {album.artist} • <span>{album.songs.length}</span> bài hát
          </p>

          <button
            onClick={handlePlayAll}
            disabled={album.songs.length === 0}
            className="w-11 h-11 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] flex items-center justify-center disabled:opacity-40 transition-all shadow-md active:scale-95 border border-[#EDE6D6]/20 mt-3 mx-auto sm:mx-0"
            title="Phát tất cả"
          >
            <Play size={18} weight="fill" className="ml-0.5" />
          </button>
        </div>
      </div>

      {/* Danh sách bài hát dạng vé */}
      <div>
        <SongTable songs={album.songs} emptyText="Album này chưa có bài hát nào." />
      </div>
    </div>
  );
}
