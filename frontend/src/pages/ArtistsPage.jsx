import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SpinnerGap } from "@phosphor-icons/react";
import { fetchArtists } from "../api/artists";
import ArtistAvatar from "../components/ArtistAvatar";

export default function ArtistsPage() {
  const [artists, setArtists] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchArtists()
      .then((data) => {
        if (!cancelled) setArtists(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!artists && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-violet-400">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="text-sm text-zinc-400 font-medium">Đang tải danh sách nghệ sĩ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-rose-400 font-semibold mb-2">Không thể tải danh sách nghệ sĩ</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Nghệ sĩ</h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">Các giọng ca và nhà sản xuất âm nhạc độc lập</p>
        </div>
        <span className="text-xs font-medium tabular-nums text-zinc-400">{artists.length} nghệ sĩ</span>
      </div>

      {artists.length === 0 ? (
        <p className="text-zinc-500 text-sm">Chưa có nghệ sĩ nào.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {artists.slice(0, 120).map((artist) => (
            <Link
              key={artist.name}
              to={`/artist/${encodeURIComponent(artist.name)}`}
              className="group glass-card p-4 rounded-2xl transition-all duration-200 flex flex-col items-center"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-md mb-3 border-2 border-transparent group-hover:border-violet-500 transition-all duration-200 p-0.5">
                <ArtistAvatar
                  name={artist.name}
                  image={artist.image}
                  className="w-full h-full rounded-full border-0 group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="font-bold text-sm truncate text-center text-white group-hover:text-violet-300 transition-colors w-full">
                {artist.name}
              </p>
              <p className="text-[11px] text-zinc-400 text-center mt-1 font-medium tabular-nums">
                {artist.songCount} bài hát
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
