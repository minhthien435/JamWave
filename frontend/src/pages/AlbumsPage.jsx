import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Disc, SpinnerGap, Play } from "@phosphor-icons/react";
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
      <div className="flex flex-col items-center justify-center py-20 text-[#D97C54] font-sans">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="text-xs font-mono text-[#A39282]">Đang tải kho album...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center font-sans">
        <p className="font-mono text-sm text-red-400 mb-2">Không thể tải danh sách album</p>
        <p className="font-mono text-xs text-[#A39282]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 select-none font-sans">
      <div className="flex items-center justify-between border-b border-dashed-indie pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#2E2721] border border-[#EDE6D6]/20 flex items-center justify-center text-[#D97C54] shadow-md">
            <Disc size={22} weight="duotone" />
          </div>
          <div>
            <h1 className="font-serif italic font-bold text-2xl sm:text-3xl text-[#EDE6D6]">
              Album Đặc Sắc
            </h1>
            <p className="font-mono text-xs text-[#A39282]">
              Tuyển tập các đĩa nhạc indie và bản thu nghệ sĩ độc lập
            </p>
          </div>
        </div>
        <span className="font-mono text-xs text-[#A39282]">{albums.length} album</span>
      </div>

      {albums.length === 0 ? (
        <p className="font-mono text-xs text-[#A39282]">Chưa có album nào.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {albums.slice(0, 120).map((album) => (
            <Link
              key={album.id}
              to={`/album/${album.id}`}
              className="group indie-panel p-3 rounded-2xl border-dashed-indie hover:-translate-y-1.5 transition-all duration-200 block shadow-md hover:border-[#D97C54]/40"
            >
              <div className="aspect-square rounded-xl overflow-hidden shadow-inner mb-3 bg-[#181512] relative flex items-center justify-center">
                {album.coverImg ? (
                  <img
                    src={album.coverImg}
                    alt={album.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Disc size={44} weight="duotone" className="text-[#8A7B6C]" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-xl bg-[#B85C38] text-[#EDE6D6] flex items-center justify-center shadow-lg border border-[#EDE6D6]/20">
                    <Play size={16} weight="fill" className="ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-1.5 mt-1">
                <p className="font-serif italic font-bold text-sm truncate text-[#EDE6D6] group-hover:text-[#D97C54] transition-colors">
                  {album.title}
                </p>
                <SourceBadge source={album.source} />
              </div>
              <p className="font-mono text-xs text-[#A39282] truncate mt-0.5">{album.artist}</p>
              <p className="font-mono text-[10px] text-[#8A7B6C] mt-1 tabular-nums">{album.songCount} bài hát</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
