import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Loader2 size={32} className="animate-spin mb-3" />
        <p className="text-sm">Đang tải nghệ sĩ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-400 font-semibold text-lg mb-2">Không thể tải danh sách nghệ sĩ</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Nghệ sĩ</h2>
        <span className="text-xs text-zinc-500">{artists.length} nghệ sĩ trong thư viện</span>
      </div>

      {artists.length === 0 ? (
        <p className="text-zinc-500 text-sm">Chưa có nghệ sĩ nào.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {artists.slice(0, 120).map((artist) => (
            <Link
              key={artist.name}
              to={`/artist/${encodeURIComponent(artist.name)}`}
              className="group bg-zinc-800/40 hover:bg-zinc-800/90 p-4 rounded-lg transition-all duration-300"
            >
              <div className="aspect-square rounded-full overflow-hidden shadow-lg mb-3 bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                <ArtistAvatar
                  name={artist.name}
                  image={artist.image}
                  className="w-full h-full rounded-none border-0 group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="font-bold text-sm truncate text-center">{artist.name}</p>
              <p className="text-xs text-zinc-500 text-center mt-1">{artist.songCount} bài hát</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
