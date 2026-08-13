import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Headphones, Clock, Music, Users, TrendingUp, Sparkles } from "lucide-react";
import { fetchWrapped } from "../api/wrapped";
import { usePlayerStore } from "../usePlayerStore";

const PERIODS = [
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
  { key: "year", label: "Năm" },
  { key: "all", label: "Tất cả" },
];

const formatMinutes = (minutes) => {
  if (!minutes) return "0 phút";
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
};

export default function WrappedPage() {
  const [period, setPeriod] = useState("all");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { setCurrentSong, setQueue } = usePlayerStore();

  useEffect(() => {
    let cancelled = false;
    fetchWrapped(period)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setQueue(d.topSongs || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, setQueue]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-400 font-semibold text-lg mb-2">Không thể tải thống kê</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950/80 via-purple-900/50 to-cyan-950/70 p-8 border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <Sparkles size={28} className="text-violet-400" />
            JamWave Wrapped
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">Tổng kết hành trình nghe nhạc của bạn 🎵</p>

          {/* Period selector */}
          <div className="flex flex-wrap gap-2 mt-5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setPeriod(p.key);
                }}
                className={`text-xs font-bold px-4 py-2 rounded-full border transition-all active:scale-95 ${
                  period === p.key
                    ? "bg-white text-black border-white"
                    : "bg-white/5 hover:bg-white/15 text-zinc-200 border-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
          <Loader2 size={32} className="animate-spin mb-3" />
          <p className="text-sm">Đang tổng kết...</p>
        </div>
      ) : data && data.totalListens === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center text-zinc-500">
          <Headphones size={40} className="mb-3 opacity-40" />
          <p className="text-lg font-semibold text-zinc-300">Chưa có dữ liệu nghe trong giai đoạn này</p>
          <p className="text-sm mt-1">Hãy nghe thử vài bài để Wrapped trở nên sống động!</p>
        </div>
      ) : (
        data && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-5 border border-white/10 bg-gradient-to-br from-cyan-500/20 to-blue-600/10">
                <Headphones size={18} className="text-cyan-400 mb-3" />
                <p className="text-3xl font-black text-white">{data.totalListens}</p>
                <p className="text-xs text-zinc-400 font-semibold mt-1">Lượt nghe</p>
              </div>
              <div className="glass-card rounded-2xl p-5 border border-white/10 bg-gradient-to-br from-amber-500/20 to-orange-600/10">
                <Clock size={18} className="text-amber-400 mb-3" />
                <p className="text-3xl font-black text-white">{formatMinutes(data.minutesListened)}</p>
                <p className="text-xs text-zinc-400 font-semibold mt-1">Thời gian nghe</p>
              </div>
              <div className="glass-card rounded-2xl p-5 border border-white/10 bg-gradient-to-br from-violet-500/20 to-purple-600/10">
                <Music size={18} className="text-violet-400 mb-3" />
                <p className="text-3xl font-black text-white">{data.uniqueSongs}</p>
                <p className="text-xs text-zinc-400 font-semibold mt-1">Bài hát khác nhau</p>
              </div>
              <div className="glass-card rounded-2xl p-5 border border-white/10 bg-gradient-to-br from-fuchsia-500/20 to-pink-600/10">
                <Users size={18} className="text-fuchsia-400 mb-3" />
                <p className="text-3xl font-black text-white">{data.topArtists.length}</p>
                <p className="text-xs text-zinc-400 font-semibold mt-1">Nghệ sĩ tiêu biểu</p>
              </div>
            </div>

            {/* Top songs */}
            {data.topSongs.length > 0 && (
              <div className="glass-panel rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 mb-4">
                  <Music size={18} className="text-cyan-400" /> Bài hát nghe nhiều nhất
                </h2>
                <div className="space-y-1">
                  {data.topSongs.map((song, i) => (
                    <button
                      key={song.id}
                      onClick={() => setCurrentSong(song)}
                      className="w-full flex items-center gap-4 p-2.5 rounded-lg hover:bg-white/5 text-left transition-all active:scale-[0.99]"
                    >
                      <span className="w-6 text-center font-black text-lg text-zinc-500">{i + 1}</span>
                      {song.albumCover && (
                        <img src={song.albumCover} alt="" className="w-11 h-11 rounded object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                        <p className="text-xs text-zinc-500 truncate">{song.artist}</p>
                      </div>
                      <span className="text-xs text-zinc-500 font-semibold">{song.listenCount} lượt</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Top artists */}
            {data.topArtists.length > 0 && (
              <div className="glass-panel rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 mb-4">
                  <Users size={18} className="text-violet-400" /> Nghệ sĩ bạn yêu thích
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {data.topArtists.map((a, i) => (
                    <button
                      key={a.name}
                      onClick={() => navigate(`/artist/${encodeURIComponent(a.name)}`)}
                      className="group text-left bg-zinc-900/60 hover:bg-zinc-800/60 rounded-xl p-3 transition-all active:scale-95"
                    >
                      <div className="relative">
                        <div className="aspect-square rounded-full overflow-hidden bg-zinc-800 mb-2">
                          {a.coverImg ? (
                            <img src={a.coverImg} alt={a.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                              <Users size={28} />
                            </div>
                          )}
                        </div>
                        <span className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white text-xs font-black flex items-center justify-center shadow-lg">
                          {i + 1}
                        </span>
                      </div>
                      <p className="text-sm font-semibold truncate text-white">{a.name}</p>
                      <p className="text-xs text-zinc-500">{a.listenCount} lượt</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Top genres */}
            {data.topGenres.length > 0 && (
              <div className="glass-panel rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 mb-4">
                  <TrendingUp size={18} className="text-amber-400" /> Thể loại dẫn đầu
                </h2>
                <div className="flex flex-wrap gap-2.5">
                  {data.topGenres.map((g, i) => (
                    <span
                      key={g.genre}
                      className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-zinc-200"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${i === 0 ? "bg-violet-400" : i === 1 ? "bg-cyan-400" : i === 2 ? "bg-fuchsia-400" : "bg-amber-400"}`}
                      />
                      {g.genre}
                      <span className="text-zinc-500 font-semibold">{g.count} lượt</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}