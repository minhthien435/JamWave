import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSongs, fetchRandomSongs } from "../api/songs";
import { fetchAlbums } from "../api/albums";
import { fetchArtists, fetchFollowedArtists } from "../api/artists";
import { fetchRecentListens, fetchTopListens } from "../api/listens";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import { Play, Pause, Shuffle, CaretRight, Sparkle, SpinnerGap, CassetteTape, Disc, BookmarkSimple } from "@phosphor-icons/react";
import SongTable from "../components/SongTable";
import SourceBadge from "../components/SourceBadge";
import ArtistAvatar from "../components/ArtistAvatar";

// Lời chào theo khung giờ mang phong cách mộc mạc
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bình minh dịu êm";
  if (hour < 18) return "Hoàng hôn buông";
  return "Đêm muộn an yên";
};

export default function HomePage() {
  const [songs, setSongs] = useState([]);
  const [totalSongs, setTotalSongs] = useState(0);
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shuffling, setShuffling] = useState(false);

  const user = useAuthStore((s) => s.user);
  const { currentSong, isPlaying, setCurrentSong, togglePlay, setQueue } = usePlayerStore();

  useEffect(() => {
    let cancelled = false;

    fetchSongs({ limit: 100 })
      .then((data) => {
        if (cancelled) return;
        setSongs(data.songs);
        setTotalSongs(data.total);
        setQueue(data.songs);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Lỗi lấy danh sách bài hát:", err.message);
        setError(err.message);
        setLoading(false);
      });

    if (user) {
      fetchRecentListens(6)
        .then((data) => {
          if (!cancelled) setRecentSongs(data);
        })
        .catch(() => { });
      fetchFollowedArtists()
        .then((data) => {
          if (!cancelled) setFollowedArtists(data);
        })
        .catch(() => { });
    } else {
      fetchTopListens("week", 6)
        .then((data) => {
          if (!cancelled) setRecentSongs(data);
        })
        .catch(() => { });
    }

    fetchAlbums()
      .then((data) => {
        if (!cancelled) setAlbums(data);
      })
      .catch(() => { });

    fetchArtists()
      .then((data) => {
        if (!cancelled) setArtists(data);
      })
      .catch(() => { });

    return () => {
      cancelled = true;
    };
  }, [setQueue, user]);

  const handleSelectSong = (song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      setCurrentSong(song);
    }
  };

  const handleShufflePlay = async () => {
    if (shuffling) return;
    setShuffling(true);
    try {
      const randomSongs = await fetchRandomSongs(30);
      if (randomSongs.length === 0) return;
      const shuffled = [...randomSongs].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setCurrentSong(shuffled[0]);
    } catch (err) {
      console.error("Lỗi phát ngẫu nhiên:", err.message);
      if (songs.length > 0) {
        const shuffled = [...songs].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
        setCurrentSong(shuffled[0]);
      }
    } finally {
      setShuffling(false);
    }
  };

  // Skeleton Loading State
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse font-sans">
        <div className="h-64 bg-[#26211C] rounded-2xl border border-dashed-indie" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-[#26211C] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && songs.length === 0) {
    return (
      <div className="text-center py-20 indie-panel rounded-2xl border-dashed-indie p-8 font-sans">
        <p className="font-mono text-sm text-red-400 mb-2">Không thể tải kho nhạc analog</p>
        <p className="text-xs text-[#A39282]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 font-sans select-none">
      {/* ================= HERO: VINYL RECORD & INDIE MUSIC BANNER ================= */}
      <section className="relative rounded-3xl overflow-hidden indie-panel border-dashed-indie p-6 sm:p-8 lg:p-10 shadow-2xl group">
        {/* Ambient Warm Lights */}
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-[#D97C54]/18 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute -left-12 -bottom-12 w-80 h-80 bg-[#E0B35C]/12 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left Column: Text & Primary Action Button */}
          <div className="space-y-4 max-w-xl text-left flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#D97C54] px-3 py-1 rounded-full bg-[#B85C38]/15 border border-[#B85C38]/30 inline-flex items-center gap-1.5 shadow-sm">
                <CassetteTape size={14} weight="duotone" />
                JAMWAVE • INDIE MUSIC
              </span>
            </div>

            <h1 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#EDE6D6] leading-tight drop-shadow-sm">
              {user ? (
                <span className="block text-xl sm:text-2xl text-[#D97C54] mb-1 not-italic font-normal">
                  {getGreeting()}, {user.name}.
                </span>
              ) : null}
              Góc nhỏ lắng nghe <br className="hidden sm:inline" />
              <span className="text-[#EDE6D6]">những thanh âm mộc mạc.</span>
            </h1>

            <p className="text-xs sm:text-sm text-[#A39282] font-normal leading-relaxed max-w-md">
              Tạm gác lại ồn ào vội vã, thả mình trôi theo những giai điệu indie mộc mạc và cảm xúc chân thật trên JamWave.
            </p>

            {/* Action button in left column */}
            <div className="pt-2">
              <button
                onClick={handleShufflePlay}
                disabled={shuffling}
                className="px-6 py-3.5 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] font-mono text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-lg active:scale-95 flex items-center gap-2.5 border border-[#EDE6D6]/20 disabled:opacity-60"
              >
                {shuffling ? (
                  <SpinnerGap size={16} className="animate-spin" />
                ) : (
                  <Shuffle size={16} weight="bold" />
                )}
                Phát Ngẫu Nhiên
              </button>
            </div>
          </div>

          {/* Right Column: Spinning Vinyl Record Player Graphic */}
          <div className="flex flex-col items-center justify-center relative flex-shrink-0">
            {/* The Vinyl Disc */}
            <div
              onClick={handleShufflePlay}
              className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-full bg-[#120F0D] border-4 border-[#2A231D] shadow-[0_15px_35px_rgba(0,0,0,0.8)] flex items-center justify-center group/record cursor-pointer hover:scale-105 transition-transform duration-300"
              title="Nhấn vào đĩa để phát ngẫu nhiên"
            >
              {/* Vinyl Grooves (Concentric Circles) */}
              <div className="absolute inset-2 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-4 rounded-full border border-white/[0.06]" />
              <div className="absolute inset-7 rounded-full border border-white/[0.05]" />
              <div className="absolute inset-10 rounded-full border border-white/[0.07]" />
              <div className="absolute inset-14 rounded-full border border-white/[0.04]" />

              {/* Light Sheen / Reflection */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none" />

              {/* Spinning Vinyl Center */}
              <div className="relative w-full h-full rounded-full flex items-center justify-center animate-spin-slow">
                {/* Center Label */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#B85C38] via-[#A04B2A] to-[#6E2E17] border-2 border-[#EDE6D6]/40 flex flex-col items-center justify-center text-center shadow-inner relative z-10">
                  <span className="font-mono text-[7px] font-bold tracking-widest text-[#EDE6D6]/90 uppercase">JAMWAVE</span>
                  <Disc size={16} weight="duotone" className="text-[#EDE6D6] my-0.5" />
                  <span className="font-mono text-[6px] text-[#EDE6D6]/70 uppercase tracking-wider">33⅓ RPM</span>
                  {/* Spindle Hole */}
                  <div className="w-3 h-3 rounded-full bg-[#120F0D] border border-[#EDE6D6]/60 absolute" />
                </div>
              </div>

              {/* Hover Play Icon Overlay */}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/record:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20 backdrop-blur-[1px]">
                <div className="w-11 h-11 rounded-full bg-[#B85C38] text-[#EDE6D6] flex items-center justify-center shadow-xl border border-[#EDE6D6]/30 group-hover/record:scale-110 transition-transform">
                  <Play size={18} weight="fill" className="ml-0.5" />
                </div>
              </div>
            </div>

            {/* Subtext info */}
            <span className="font-mono text-[10px] text-[#8A7B6C] mt-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#76876F] inline-block animate-pulse" />
              {totalSongs} bản nhạc độc lập
            </span>
          </div>
        </div>
      </section>

      {/* ================= 1. GẦN ĐÂY NGHE NHIỀU (TICKET STUBS) ================= */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-dashed-indie pb-2">
          <div className="flex items-center gap-2">
            <BookmarkSimple size={18} weight="duotone" className="text-[#D97C54]" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6]">
              {user ? "Nghe Gần Đây" : "Bản Thu Thịnh Hành"}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(recentSongs.length > 0 ? recentSongs : songs.slice(0, 6)).map((song) => {
            const isThisSongSelected = currentSong?.id === song.id;

            return (
              <div
                key={`featured-${song.id}`}
                onClick={() => handleSelectSong(song)}
                className={`ticket-row flex items-center gap-3.5 p-2.5 rounded-xl group cursor-pointer pr-4 ${
                  isThisSongSelected ? "bg-[#2E2721] border-[#D97C54]" : ""
                }`}
              >
                <div className="w-12 h-12 p-0.5 bg-[#28221D] border border-[#EDE6D6]/15 rounded flex-shrink-0 shadow-sm">
                  <img
                    src={song.albumCover}
                    alt={song.title}
                    loading="lazy"
                    className="w-full h-full rounded object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-serif italic font-semibold text-sm truncate text-[#EDE6D6] group-hover:text-[#D97C54] transition-colors">
                      {song.title}
                    </span>
                    <SourceBadge source={song.source} />
                  </div>
                  <p className="font-mono text-[11px] text-[#A39282] truncate mt-0.5">{song.artist}</p>
                </div>

                <button
                  className={`w-8 h-8 rounded-lg bg-[#B85C38] text-[#EDE6D6] flex items-center justify-center shadow-md transform transition-all duration-150 ${
                    isThisSongSelected
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
                  }`}
                >
                  {isThisSongSelected && isPlaying ? (
                    <Pause weight="fill" size={14} />
                  ) : (
                    <Play weight="fill" className="ml-0.5" size={14} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 2. ALBUM ĐẶC SẮC (POLAROID CRAFT FRAMES) ================= */}
      {albums.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-dashed-indie pb-2">
            <div className="flex items-center gap-2">
              <Disc size={18} weight="duotone" className="text-[#D97C54]" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6]">
                Album Đặc Sắc (Polaroid)
              </h2>
            </div>
            <Link
              to="/albums"
              className="font-mono text-xs font-bold text-[#D97C54] hover:text-[#EDE6D6] transition-colors flex items-center gap-1"
            >
              <span>Xem Tất Cả</span>
              <CaretRight size={13} weight="bold" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-3">
            {albums.slice(0, 6).map((album, idx) => {
              const tiltClass = idx % 2 === 0 ? "-rotate-1 hover:rotate-0" : "rotate-1 hover:rotate-0";
              return (
                <Link
                  key={album.id}
                  to={`/album/${album.id}`}
                  className={`group polaroid-frame p-3 pt-3.5 pb-4 rounded-xl transition-all duration-300 relative ${tiltClass} hover:scale-105 hover:z-20 shadow-md block`}
                >
                  {/* Washi Tape Ribbon on top */}
                  <div className="washi-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-4 rounded-sm rotate-2 z-10 shadow-sm opacity-90" />

                  {/* Photo area */}
                  <div className="aspect-square rounded-lg overflow-hidden shadow-inner mb-2.5 bg-[#181512] relative flex items-center justify-center">
                    <img
                      src={album.coverImg}
                      alt={album.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-xl bg-[#B85C38] text-[#EDE6D6] flex items-center justify-center shadow-lg border border-[#EDE6D6]/20">
                        <Play size={16} weight="fill" className="ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="text-center px-0.5">
                    <p className="font-serif italic font-semibold text-xs truncate text-[#EDE6D6] group-hover:text-[#D97C54] transition-colors">
                      {album.title}
                    </p>
                    <p className="font-mono text-[10px] text-[#A39282] truncate mt-0.5">{album.artist}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= 3. NGHỆ SĨ ĐỘC LẬP ================= */}
      {artists.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-dashed-indie pb-2">
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6]">
              Gặp Gỡ Nghệ Sĩ Độc Lập
            </h2>
            <Link
              to="/artists"
              className="font-mono text-xs font-bold text-[#D97C54] hover:text-[#EDE6D6] transition-colors flex items-center gap-1"
            >
              <span>Xem Tất Cả</span>
              <CaretRight size={13} weight="bold" />
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3.5">
            {artists.slice(0, 8).map((artist) => (
              <Link
                key={artist.name}
                to={`/artist/${encodeURIComponent(artist.name)}`}
                className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-[#26211C] transition-all"
              >
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-md border border-[#EDE6D6]/20 group-hover:border-[#D97C54] transition-all p-0.5">
                  <ArtistAvatar
                    name={artist.name}
                    image={artist.coverImg}
                    className="w-full h-full rounded-full group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="font-serif italic text-xs truncate w-full text-center text-[#EDE6D6] group-hover:text-[#D97C54] transition-colors">
                  {artist.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ================= 4. BẢNG BÀI HÁT TỔNG HỢP ================= */}
      <section className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between border-b border-dashed-indie pb-2">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6]">
            Kho Bài Hát Độc Lập
          </h2>
          <span className="font-mono text-[11px] text-[#A39282]">
            Tổng {totalSongs} bài hát
          </span>
        </div>
        <SongTable songs={songs.slice(0, 100)} />
      </section>
    </div>
  );
}
