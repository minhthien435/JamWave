import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, SpinnerGap, Heart, Disc, MicrophoneStage } from "@phosphor-icons/react";
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
      <div className="flex flex-col items-center justify-center py-20 text-[#D97C54] font-sans">
        <SpinnerGap size={30} className="animate-spin mb-3" />
        <p className="font-mono text-xs text-[#A39282]">Đang tìm tư liệu nghệ sĩ...</p>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center font-sans">
        <p className="font-mono text-sm text-red-400 mb-2">Không thể tải thông tin nghệ sĩ</p>
        <p className="font-mono text-xs text-[#A39282]">{error}</p>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (artist.songs.length === 0) return;
    setCurrentSong(artist.songs[0]);
  };

  return (
    <div className="space-y-8 select-none pb-8 font-sans">
      {/* Header Artist Stamp */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-dashed-indie">
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden shadow-2xl flex-shrink-0 border-2 border-[#EDE6D6]/20 p-1 bg-[#26211C]">
          <ArtistAvatar
            name={artist.artist.name}
            image={artist.artist.image || artist.artist.coverImg}
            className="w-full h-full rounded-full text-4xl"
          />
        </div>

        <div className="min-w-0 text-center sm:text-left flex-1 space-y-2">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="font-mono text-[10px] uppercase font-bold text-[#D97C54] tracking-widest px-2.5 py-0.5 rounded-full bg-[#B85C38]/15 border border-[#B85C38]/30 inline-flex items-center gap-1">
              <MicrophoneStage size={12} />
              NGHỆ SĨ ĐỘC LẬP
            </span>
          </div>

          <h1 className="font-serif italic text-3xl sm:text-4xl font-bold tracking-tight text-[#EDE6D6] truncate">
            {artist.artist.name}
          </h1>

          <p className="font-mono text-xs text-[#A39282]">
            <span>{artist.artist.songCount}</span> bản thu trong kho analog
            {artist.artist.country ? ` • ${artist.artist.country}` : ""}
            {artist.artist.yearRange ? ` • ${artist.artist.yearRange}` : ""}
          </p>

          {artist.artist.genres?.length > 0 && (
            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 pt-1">
              {artist.artist.genres.slice(0, 6).map((g) => (
                <span
                  key={g}
                  className="font-mono text-[10px] px-2.5 py-0.5 rounded-lg bg-[#26211C] text-[#EDE6D6] border border-[#EDE6D6]/15"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center sm:justify-start gap-2.5 pt-2">
            <button
              onClick={handlePlayAll}
              disabled={artist.songs.length === 0}
              className="w-11 h-11 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] flex items-center justify-center disabled:opacity-40 transition-all shadow-md active:scale-95 border border-[#EDE6D6]/20"
              title="Phát tất cả"
            >
              <Play size={18} weight="fill" className="ml-0.5" />
            </button>

            {user && (
              <button
                onClick={handleToggleFollow}
                disabled={followToggling}
                className={`font-mono text-xs flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all active:scale-95 disabled:opacity-60 ${
                  following
                    ? "bg-[#26211C] border-[#EDE6D6]/20 text-[#EDE6D6]"
                    : "bg-[#B85C38] hover:bg-[#D97C54] border-[#EDE6D6]/20 text-[#EDE6D6] shadow-sm"
                }`}
              >
                {followToggling ? (
                  <SpinnerGap size={13} className="animate-spin" />
                ) : (
                  <Heart size={14} weight={following ? "fill" : "regular"} className={following ? "text-[#D97C54]" : ""} />
                )}
                {following ? "Đang theo dõi" : "Theo dõi"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Albums (Polaroids) */}
      {artist.artist.albums?.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2">
            <Disc size={16} weight="duotone" className="text-[#D97C54]" /> ALBUM PHÁT HÀNH ({artist.artist.albums.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {artist.artist.albums.map((album, idx) => (
              <button
                key={album.id}
                onClick={() => navigate(`/album/${album.id}`)}
                className={`group text-left polaroid-frame rounded-lg p-2.5 transition-all active:scale-95 relative ${
                  idx % 2 === 0 ? "-rotate-1" : "rotate-1"
                }`}
              >
                <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 rounded-sm rotate-2 z-10" />
                <div className="aspect-square rounded overflow-hidden bg-[#181512] mb-2 shadow-inner">
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
                <p className="font-serif italic font-semibold text-xs truncate text-[#EDE6D6] group-hover:text-[#D97C54] transition-colors">
                  {album.title}
                </p>
                <p className="font-mono text-[10px] text-[#A39282] mt-0.5">{album.songCount} bản thu</p>
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
