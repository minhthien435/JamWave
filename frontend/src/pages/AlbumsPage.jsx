import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Disc3, Loader2 } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Loader2 size={32} className="animate-spin mb-3" />
        <p className="text-sm">Đang tải album...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-400 font-semibold text-lg mb-2">Không thể tải album</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Album</h2>
        <span className="text-xs text-zinc-500">{albums.length} album trong thư viện</span>
      </div>

      {albums.length === 0 ? (
        <p className="text-zinc-500 text-sm">Chưa có album nào.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {albums.slice(0, 120).map((album) => (
            <Link
              key={album.id}
              to={`/album/${album.id}`}
              className="group bg-zinc-800/40 hover:bg-zinc-800/90 p-4 rounded-lg transition-all duration-300"
            >
              <div className="aspect-square rounded-md overflow-hidden shadow-lg mb-3 bg-zinc-800 flex items-center justify-center">
                {album.coverImg ? (
                  <img src={album.coverImg} alt={album.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <Disc3 size={48} className="text-zinc-600" />
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <p className="font-bold text-sm truncate">{album.title}</p>
                <SourceBadge source={album.source} />
              </div>
              <p className="text-xs text-zinc-400 truncate mt-0.5">{album.artist}</p>
              <p className="text-xs text-zinc-500 mt-1">{album.songCount} bài</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
