import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSongs, fetchRandomSongs } from "../api/songs";
import { fetchAlbums } from "../api/albums";
import { fetchArtists, fetchFollowedArtists } from "../api/artists";
import { fetchRecentListens, fetchTopListens } from "../api/listens";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import { Play, Pause, Loader2 } from "lucide-react";
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
        setQueue(data.songs); // Nạp danh sách bài hát vào queue hàng chờ
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Lỗi lấy danh sách bài hát:", err.message);
        setError(err.message);
        setLoading(false);
      });

    // "Gần đây nghe nhiều": đã đăng nhập = lịch sử nghe của chính mình, khách = top tuần
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

  // Xử lý khi nhấn vào 1 bài hát
  const handleSelectSong = (song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      setCurrentSong(song);
    }
  };

  // Phát ngẫu nhiên: lấy bài hát ngẫu nhiên từ toàn thư viện, trộn hàng chờ
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
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-zinc-800/40 p-4 rounded-md space-y-3 animate-pulse">
              <div className="aspect-square bg-zinc-800 rounded-md w-full"></div>
              <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
              <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-400 font-semibold text-lg mb-2">Không thể tải dữ liệu bài hát</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 select-none pb-8">
      {/* 0. Hero Section Futuristic Video */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-white/20 shadow-2xl group transition-all duration-700 bg-black">
        {/* Layer 1: High Visibility Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-85 saturate-125 pointer-events-none group-hover:scale-105 transition-transform duration-1000"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
          <source src="https://assets.mixkit.co/videos/preview/mixkit-party-lights-and-people-dancing-at-a-concert-43282-large.mp4" type="video/mp4" />
        </video>

        {/* Layer 2: Soft Left Gradient Overlay (Only behind text on left) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* Layer 4: Text Content & Action Button */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-extrabold uppercase tracking-widest text-cyan-300 px-3.5 py-1 rounded-full bg-violet-500/25 border border-violet-400/40 shadow-sm backdrop-blur-md inline-block">
              INDIE WAVE
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md leading-snug">
              {user ? <span className="block text-lg sm:text-xl text-gradient-emerald mb-1">{getGreeting()}, {user.name} 👋</span> : null}
              Chạm vào những giai điệu <br className="hidden sm:inline" />
              <span className="text-gradient-emerald">không thuộc dòng chính.</span>
            </h1>
            <p className="text-sm text-zinc-200 font-medium leading-relaxed drop-shadow-sm max-w-lg">
              Khám phá những nghệ sĩ độc lập, những thanh âm mới và những bản nhạc đáng để bạn nghe theo cách riêng.
            </p>
          </div>
          <div className="flex items-center gap-3 md:pb-1">
            <button
              onClick={handleShufflePlay}
              disabled={shuffling}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 via-purple-500 to-cyan-400 hover:from-violet-500 hover:to-cyan-300 text-white font-extrabold text-sm transition-all duration-200 shadow-lg shadow-violet-500/35 active:scale-95 flex items-center gap-2 disabled:opacity-60"
            >
              {shuffling ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="white" />} Phát ngẫu nhiên
            </button>
          </div>
        </div>
      </section>

      {/* 1. Lưới Thẻ Nổi Bật (Featured Glass Cards Grid with Glow & Scale) */}
      <section>
        <h2 className="text-xl font-bold tracking-tight mb-4 text-white flex items-center gap-2">
          {user ? "Gần đây nghe nhiều" : "Top bài hát tuần này"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(recentSongs.length > 0 ? recentSongs : songs.slice(0, 6)).map((song) => {
            const isThisSongSelected = currentSong?.id === song.id;

            return (
              <div
                key={`featured-${song.id}`}
                onClick={() => handleSelectSong(song)}
                className="flex items-center gap-4 glass-card p-2.5 rounded-2xl group cursor-pointer pr-4 transition-all duration-300 hover:border-violet-400/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-md flex-shrink-0">
                  <img
                    src={song.albumCover}
                    alt={song.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-sm truncate text-zinc-100 group-hover:text-cyan-300 transition-colors">{song.title}</span>
                    <SourceBadge source={song.source} />
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">{song.artist}</p>
                  {song.listenCount > 0 && (
                    <span className="text-[10px] font-semibold text-cyan-400/90 mt-0.5 inline-block">
                      {song.listenCount} lượt nghe
                    </span>
                  )}
                </div>

                <button
                  className={`w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-400 text-white flex items-center justify-center shadow-lg transform transition-all duration-300 ${isThisSongSelected
                      ? "opacity-100 scale-100 shadow-violet-500/40"
                      : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
                    }`}
                >
                  {isThisSongSelected && isPlaying ? (
                    <Pause fill="white" className="text-white" size={18} />
                  ) : (
                    <Play fill="white" className="text-white ml-0.5" size={18} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Album nổi bật với Glow & Scale */}
      {albums.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight text-white">Album nổi bật</h2>
            <Link to="/albums" className="text-xs font-semibold text-cyan-400 hover:underline transition-all">
              Xem tất cả
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {albums.slice(0, 6).map((album) => (
              <Link
                key={album.id}
                to={`/album/${album.id}`}
                className="group glass-card p-3.5 rounded-2xl transition-all duration-300 hover:border-violet-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.35)]"
              >
                <div className="aspect-square rounded-xl overflow-hidden shadow-lg mb-3 bg-zinc-800 relative">
                  <img
                    src={album.coverImg}
                    alt={album.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-400 text-white flex items-center justify-center shadow-lg translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                      <Play size={18} fill="white" className="ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="font-bold text-sm truncate text-white group-hover:text-cyan-300 transition-colors">{album.title}</p>
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
            <h2 className="text-xl font-bold tracking-tight text-white">Nghệ sĩ yêu thích</h2>
            <Link to="/artists" className="text-xs font-semibold text-cyan-400 hover:underline transition-all">
              Xem tất cả
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {artists.slice(0, 8).map((artist) => (
              <Link
                key={artist.name}
                to={`/artist/${encodeURIComponent(artist.name)}`}
                className="group flex flex-col items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-all duration-300"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-xl border-2 border-transparent group-hover:border-violet-400 transition-all duration-300 p-0.5">
                  <img
                    src={artist.coverImg}
                    alt={artist.name}
                    loading="lazy"
                    className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <p className="font-bold text-xs sm:text-sm truncate w-full text-center text-zinc-200 group-hover:text-violet-300 transition-colors">{artist.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. Nghệ sĩ đang theo dõi (chỉ khi đăng nhập) */}
      {user && followedArtists.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight text-white">Nghệ sĩ đang theo dõi</h2>
            <Link to="/artists" className="text-xs font-semibold text-cyan-400 hover:underline transition-all">
              Xem tất cả
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {followedArtists.slice(0, 8).map((artist) => (
              <Link
                key={artist.name}
                to={`/artist/${encodeURIComponent(artist.name)}`}
                className="group flex flex-col items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-all duration-300"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-xl border-2 border-violet-400/60 group-hover:border-violet-400 transition-all duration-300 p-0.5">
                  <ArtistAvatar
                    name={artist.name}
                    image={artist.coverImg}
                    className="w-full h-full rounded-full text-2xl"
                  />
                </div>
                <p className="font-bold text-xs sm:text-sm truncate w-full text-center text-zinc-200 group-hover:text-violet-300 transition-colors">
                  {artist.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 5. Bảng Danh Sách Bài Hát (Song Table List) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight text-white">Bảng Xếp Hạng Bài Hát</h2>
          <span className="text-xs text-zinc-400 font-medium">Tổng cộng {totalSongs} bài hát</span>
        </div>
        <SongTable songs={songs.slice(0, 100)} />
      </section>
    </div>
  );
}
