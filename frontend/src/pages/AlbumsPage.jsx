import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Disc, SpinnerGap } from "@phosphor-icons/react";
import { fetchAlbums } from "../api/albums";
import SourceBadge from "../components/SourceBadge";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAlbums()
      .then((data) => {
        if (!cancelled) setAlbums(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!albums && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-violet-400">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="text-sm text-zinc-400 font-medium">Đang tải album...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-rose-400 font-semibold mb-2">Không thể tải danh sách album</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Album</h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">Tuyển tập các đĩa nhạc indie đặc sắc</p>
        </div>
        <span className="text-xs font-medium tabular-nums text-zinc-400">{albums.length} album</span>
      </div>

      {albums.length === 0 ? (
        <p className="text-zinc-500 text-sm">Chưa có album nào.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {albums.slice(0, 120).map((album) => (
            <Link
              key={album.id}
              to={`/album/${album.id}`}
              className="group glass-card p-3.5 rounded-2xl transition-all duration-200"
            >
              <div className="aspect-square rounded-xl overflow-hidden shadow-md mb-3 bg-zinc-800 flex items-center justify-center">
                {album.coverImg ? (
                  <img
                    src={album.coverImg}
                    alt={album.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Disc size={44} weight="duotone" className="text-zinc-600" />
                )}
              </div>
              <div className="flex items-center justify-between gap-1.5 mt-1">
                <p className="font-bold text-sm truncate text-white group-hover:text-violet-300 transition-colors">
                  {album.title}
                </p>
                <SourceBadge source={album.source} />
              </div>
              <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">{album.artist}</p>
              <p className="text-[11px] text-zinc-500 mt-1 font-medium tabular-nums">{album.songCount} bài hát</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
