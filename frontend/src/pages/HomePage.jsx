import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSongs, fetchRandomSongs } from "../api/songs";
import { fetchAlbums } from "../api/albums";
import { fetchArtists, fetchFollowedArtists } from "../api/artists";
import { fetchRecentListens, fetchTopListens } from "../api/listens";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import { Play, Pause, Shuffle, CaretRight, Sparkle, SpinnerGap } from "@phosphor-icons/react";
import SongTable from "../components/SongTable";
import SourceBadge from "../components/SourceBadge";
import ArtistAvatar from "../components/ArtistAvatar";

// Lời chào theo khung giờ
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
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
      <div className="space-y-8">
        <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/5 p-4 rounded-2xl space-y-3 animate-pulse">
              <div className="aspect-square bg-white/10 rounded-xl w-full" />
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-rose-400 font-semibold text-base mb-2">Không thể tải dữ liệu bài hát</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 select-none pb-8">
      {/* 0. Hero Section Editorial */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl group transition-all duration-500 bg-[#12121a]">
        {/* Subtle Video Background with Overlay */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40 saturate-100 pointer-events-none"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
          <source src="https://assets.mixkit.co/videos/preview/mixkit-party-lights-and-people-dancing-at-a-concert-43282-large.mp4" type="video/mp4" />
        </video>

        {/* Ambient Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d12]/95 via-[#0d0d12]/80 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-violet-300 px-3 py-1 rounded-full bg-violet-900/30 border border-violet-700/30 inline-flex items-center gap-1.5">
                <Sparkle size={13} weight="fill" />
                INDIE WAVE
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              {user ? (
                <span className="block text-xl sm:text-2xl text-violet-300 mb-1 font-bold">
                  {getGreeting()}, {user.name} 👋
                </span>
              ) : null}
              Khám phá âm nhạc <br className="hidden sm:inline" />
              <span className="text-white">độc lập & tự do.</span>
            </h1>
            <p className="text-sm text-zinc-300 font-normal leading-relaxed max-w-lg">
              Thưởng thức hàng ngàn bài hát từ các nghệ sĩ indie tài năng không giới hạn trên nền tảng JamWave.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShufflePlay}
              disabled={shuffling}
              className="px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all duration-150 shadow-lg shadow-violet-950/60 active:scale-95 flex items-center gap-2 disabled:opacity-60"
            >
              {shuffling ? (
                <SpinnerGap size={18} className="animate-spin" />
              ) : (
                <Shuffle size={18} weight="bold" />
              )}
              Phát ngẫu nhiên
            </button>
          </div>
        </div>
      </section>

      {/* 1. Lưới Thẻ Nổi Bật (Featured Cards Grid) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {user ? "Gần đây nghe nhiều" : "Bài hát thịnh hành tuần này"}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {(recentSongs.length > 0 ? recentSongs : songs.slice(0, 6)).map((song) => {
            const isThisSongSelected = currentSong?.id === song.id;

            return (
              <div
                key={`featured-${song.id}`}
                onClick={() => handleSelectSong(song)}
                className={`flex items-center gap-3.5 glass-card p-2.5 rounded-2xl group cursor-pointer pr-4 transition-all duration-200 ${
                  isThisSongSelected
                    ? "border-violet-500/50 bg-violet-600/10"
                    : "hover:border-violet-500/30"
                }`}
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                  <img
                    src={song.albumCover}
                    alt={song.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-sm truncate text-zinc-100 group-hover:text-violet-200 transition-colors">
                      {song.title}
                    </span>
                    <SourceBadge source={song.source} />
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">{song.artist}</p>
                  {song.listenCount > 0 && (
                    <span className="text-[10px] font-semibold tabular-nums text-violet-400 mt-0.5 inline-block">
                      {song.listenCount} lượt nghe
                    </span>
                  )}
                </div>

                <button
                  className={`w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-md transform transition-all duration-150 ${
                    isThisSongSelected
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
                  }`}
                >
                  {isThisSongSelected && isPlaying ? (
                    <Pause weight="fill" size={16} />
                  ) : (
                    <Play weight="fill" className="ml-0.5" size={16} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Album nổi bật */}
      {albums.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Album nổi bật</h2>
            <Link
              to="/albums"
              className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <CaretRight size={14} weight="bold" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {albums.slice(0, 6).map((album) => (
              <Link
                key={album.id}
                to={`/album/${album.id}`}
                className="group glass-card p-3.5 rounded-2xl transition-all duration-200"
              >
                <div className="aspect-square rounded-xl overflow-hidden shadow-md mb-3 bg-zinc-800 relative">
                  <img
                    src={album.coverImg}
                    alt={album.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2.5">
                    <div className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                      <Play size={16} weight="fill" className="ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="font-bold text-sm truncate text-white group-hover:text-violet-300 transition-colors">
                  {album.title}
                </p>
                <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">{album.artist}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Nghệ sĩ nổi bật */}
      {artists.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Nghệ sĩ yêu thích</h2>
            <Link
              to="/artists"
              className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <CaretRight size={14} weight="bold" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {artists.slice(0, 8).map((artist) => (
              <Link
                key={artist.name}
                to={`/artist/${encodeURIComponent(artist.name)}`}
                className="group flex flex-col items-center gap-2.5 p-2 rounded-2xl hover:bg-white/5 transition-all duration-200"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-md border-2 border-transparent group-hover:border-violet-500 transition-all duration-200 p-0.5">
                  <ArtistAvatar
                    name={artist.name}
                    image={artist.coverImg}
                    className="w-full h-full rounded-full group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="font-bold text-xs sm:text-sm truncate w-full text-center text-zinc-300 group-hover:text-violet-300 transition-colors">
                  {artist.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. Nghệ sĩ đang theo dõi (chỉ khi đăng nhập) */}
      {user && followedArtists.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Nghệ sĩ đang theo dõi</h2>
            <Link
              to="/artists"
              className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <CaretRight size={14} weight="bold" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {followedArtists.slice(0, 8).map((artist) => (
              <Link
                key={artist.name}
                to={`/artist/${encodeURIComponent(artist.name)}`}
                className="group flex flex-col items-center gap-2.5 p-2 rounded-2xl hover:bg-white/5 transition-all duration-200"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-md border-2 border-violet-500/50 group-hover:border-violet-500 transition-all duration-200 p-0.5">
                  <ArtistAvatar
                    name={artist.name}
                    image={artist.coverImg}
                    className="w-full h-full rounded-full"
                  />
                </div>
                <p className="font-bold text-xs sm:text-sm truncate w-full text-center text-zinc-300 group-hover:text-violet-300 transition-colors">
                  {artist.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 5. Bảng Danh Sách Bài Hát */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Bảng Xếp Hạng Bài Hát</h2>
          <span className="text-xs text-zinc-400 font-medium tabular-nums">Tổng cộng {totalSongs} bài hát</span>
        </div>
        <SongTable songs={songs.slice(0, 100)} />
      </section>
    </div>
  );
}
