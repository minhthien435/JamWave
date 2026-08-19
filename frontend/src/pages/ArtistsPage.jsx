import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SpinnerGap, Users } from "@phosphor-icons/react";
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
      <div className="flex flex-col items-center justify-center py-20 text-[#D97C54] font-sans">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="font-mono text-xs text-[#A39282]">Đang tải danh sách nghệ sĩ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center font-sans">
        <p className="font-mono text-sm text-red-400 mb-2">Không thể tải danh sách nghệ sĩ</p>
        <p className="font-mono text-xs text-[#A39282]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 select-none font-sans">
      <div className="flex items-center justify-between border-b border-dashed-indie pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#2E2721] border border-[#EDE6D6]/20 flex items-center justify-center text-[#D97C54] shadow-md">
            <Users size={22} weight="duotone" />
          </div>
          <div>
            <h1 className="font-serif italic font-bold text-2xl sm:text-3xl text-[#EDE6D6]">
              Nghệ Sĩ Độc Lập
            </h1>
            <p className="font-mono text-xs text-[#A39282]">
              Các giọng ca, ban nhạc và nhà sản xuất âm nhạc tự do
            </p>
          </div>
        </div>
        <span className="font-mono text-xs text-[#A39282]">{artists.length} nghệ sĩ</span>
      </div>

      {artists.length === 0 ? (
        <p className="font-mono text-xs text-[#A39282]">Chưa có nghệ sĩ nào.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {artists.slice(0, 120).map((artist) => (
            <Link
              key={artist.name}
              to={`/artist/${encodeURIComponent(artist.name)}`}
              className="group indie-panel p-4 rounded-2xl border-dashed-indie transition-all duration-200 flex flex-col items-center hover:-translate-y-1.5 shadow-md hover:border-[#D97C54]/40"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-md mb-3 border-2 border-[#EDE6D6]/15 group-hover:border-[#D97C54] transition-all duration-200 p-0.5 bg-[#181512]">
                <ArtistAvatar
                  name={artist.name}
                  image={artist.image}
                  className="w-full h-full rounded-full border-0 group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="font-serif italic font-bold text-sm truncate text-center text-[#EDE6D6] group-hover:text-[#D97C54] transition-colors w-full">
                {artist.name}
              </p>
              <p className="font-mono text-[11px] text-[#8A7B6C] text-center mt-1 tabular-nums">
                {artist.songCount} bản thu
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
