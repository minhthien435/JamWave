import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, SpinnerGap, Heart, Disc } from "@phosphor-icons/react";
import { fetchArtistSongs, fetchFollowedArtists, followArtist, unfollowArtist } from "../api/artists";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import SongTable from "../components/SongTable";
import ArtistAvatar from "../components/ArtistAvatar";

export default function ArtistPage() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [error, setError] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followToggling, setFollowToggling] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { setCurrentSong, setQueue } = usePlayerStore();

  useEffect(() => {
    let cancelled = false;
    fetchArtistSongs(name)
      .then((data) => {
        if (!cancelled) return;
        setArtist(data);
        setQueue(data.songs);
        if (user) {
          return fetchFollowedArtists().then((followed) => {
            if (!cancelled) {
              setFollowing(
                followed.some((f) => f.name.toLowerCase() === data.artist.name.toLowerCase())
              );
            }
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [name, setQueue, user]);

  const handleToggleFollow = async () => {
    if (!user || !artist) return;
    setFollowToggling(true);
    try {
      if (following) {
        await unfollowArtist(artist.artist.name);
        setFollowing(false);
      } else {
        await followArtist(artist.artist.name);
        setFollowing(true);
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setFollowToggling(false);
    }
  };

  if (!artist && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-violet-400">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="text-sm text-zinc-400 font-medium">Đang tải thông tin nghệ sĩ...</p>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-rose-400 font-semibold mb-2">Không thể tải thông tin nghệ sĩ</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (artist.songs.length === 0) return;
    setCurrentSong(artist.songs[0]);
  };

  return (
    <div className="space-y-8 select-none pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-white/10">
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden shadow-2xl flex-shrink-0 border-2 border-white/10 p-0.5">
          <ArtistAvatar
            name={artist.artist.name}
            image={artist.artist.image || artist.artist.coverImg}
            className="w-full h-full rounded-full text-5xl"
          />
        </div>
        <div className="min-w-0 text-center sm:text-left flex-1">
          <p className="text-xs uppercase font-bold text-violet-400 tracking-wider">Nghệ sĩ Indie</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1 mb-2 truncate">
            {artist.artist.name}
          </h1>
          <p className="text-sm text-zinc-400 font-medium">
            <span className="tabular-nums">{artist.artist.songCount}</span> bài hát trong thư viện
            {artist.artist.country ? ` • ${artist.artist.country}` : ""}
            {artist.artist.yearRange ? ` • ${artist.artist.yearRange}` : ""}
          </p>

          {artist.artist.genres?.length > 0 && (
            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-3">
              {artist.artist.genres.slice(0, 6).map((g) => (
                <span
                  key={g}
                  className="text-xs font-semibold px-3 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center sm:justify-start gap-3 mt-4">
            <button
              onClick={handlePlayAll}
              disabled={artist.songs.length === 0}
              className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-md shadow-violet-950/60 active:scale-95"
              title="Phát tất cả"
            >
              <Play size={22} weight="fill" className="ml-0.5" />
            </button>

            {user && (
              <button
                onClick={handleToggleFollow}
                disabled={followToggling}
                className={`flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-full border transition-all active:scale-95 disabled:opacity-60 ${
                  following
                    ? "bg-white/10 hover:bg-white/15 border-white/20 text-white"
                    : "bg-violet-600 hover:bg-violet-500 border-violet-500 text-white shadow-md shadow-violet-950/60"
                }`}
              >
                {followToggling ? (
                  <SpinnerGap size={14} className="animate-spin" />
                ) : (
                  <Heart size={15} weight={following ? "fill" : "regular"} className={following ? "text-violet-400" : ""} />
                )}
                {following ? "Đang theo dõi" : "Theo dõi"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Albums */}
      {artist.artist.albums?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Disc size={20} weight="duotone" className="text-violet-400" /> Albums
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {artist.artist.albums.map((album) => (
              <button
                key={album.id}
                onClick={() => navigate(`/album/${album.id}`)}
                className="group text-left glass-card rounded-2xl p-3 transition-all active:scale-95"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-2 shadow-sm">
                  {album.coverImg ? (
                    <img
                      src={album.coverImg}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <Disc size={28} weight="duotone" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold truncate text-white group-hover:text-violet-300 transition-colors">
                  {album.title}
                </p>
                <p className="text-xs text-zinc-400 font-medium tabular-nums mt-0.5">{album.songCount} bài</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách bài hát */}
      <div>
        <SongTable songs={artist.songs} emptyText="Chưa có bài hát nào của nghệ sĩ này." />
      </div>
    </div>
  );
}
