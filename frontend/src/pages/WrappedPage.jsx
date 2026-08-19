import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkle,
  Headphones,
  Clock,
  MusicNotes,
  Users,
  TrendUp,
  SpinnerGap,
} from "@phosphor-icons/react";
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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-rose-400 font-semibold mb-2">Không thể tải thống kê</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6 select-none">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-[#14141c] p-6 sm:p-8 border border-white/10 shadow-2xl">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Sparkle size={26} weight="fill" className="text-violet-400" />
            JamWave Wrapped
          </h1>
          <p className="text-zinc-400 mt-1.5 text-xs sm:text-sm font-medium">
            Tổng kết hành trình thưởng thức âm nhạc độc lập của bạn
          </p>

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
                className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-all active:scale-95 ${
                  period === p.key
                    ? "bg-violet-600 text-white border-violet-500 shadow-sm"
                    : "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-violet-400">
          <SpinnerGap size={32} className="animate-spin mb-3" />
          <p className="text-sm text-zinc-400 font-medium">Đang tổng kết dữ liệu...</p>
        </div>
      ) : data && data.totalListens === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 glass-card rounded-2xl border border-white/10">
          <Headphones size={40} weight="duotone" className="mb-3 text-zinc-600" />
          <p className="text-base font-bold text-zinc-300">Chưa có dữ liệu nghe trong giai đoạn này</p>
          <p className="text-xs text-zinc-500 mt-1">Hãy nghe thử vài bản nhạc để bảng tổng kết cập nhật!</p>
        </div>
      ) : (
        data && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="glass-card rounded-2xl p-4 border border-white/10 hover:border-violet-500/30 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mb-3">
                  <Headphones size={20} weight="duotone" className="text-violet-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">{data.totalListens}</p>
                <p className="text-xs text-zinc-400 font-medium mt-1">Lượt nghe</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-white/10 hover:border-emerald-500/30 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <Clock size={20} weight="duotone" className="text-emerald-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">{formatMinutes(data.minutesListened)}</p>
                <p className="text-xs text-zinc-400 font-medium mt-1">Thời gian nghe</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-white/10 hover:border-cyan-500/30 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center mb-3">
                  <MusicNotes size={20} weight="duotone" className="text-cyan-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">{data.uniqueSongs}</p>
                <p className="text-xs text-zinc-400 font-medium mt-1">Bài hát khác nhau</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-white/10 hover:border-amber-500/30 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-3">
                  <Users size={20} weight="duotone" className="text-amber-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">{data.topArtists.length}</p>
                <p className="text-xs text-zinc-400 font-medium mt-1">Nghệ sĩ tiêu biểu</p>
              </div>
            </div>

            {/* Top songs */}
            {data.topSongs.length > 0 && (
              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-4">
                  <MusicNotes size={16} weight="duotone" className="text-violet-400" /> Bài hát nghe nhiều nhất
                </h2>
                <div className="space-y-1">
                  {data.topSongs.map((song, i) => (
                    <button
                      key={song.id}
                      onClick={() => setCurrentSong(song)}
                      className="w-full flex items-center gap-3.5 p-2 rounded-xl hover:bg-white/5 text-left transition-all active:scale-[0.99] group"
                    >
                      <span className="w-6 text-center font-bold text-sm text-zinc-500 tabular-nums">{i + 1}</span>
                      {song.albumCover && (
                        <img src={song.albumCover} alt="" className="w-10 h-10 rounded-lg object-cover shadow-sm" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                          {song.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{song.artist}</p>
                      </div>
                      <span className="text-xs text-zinc-400 font-medium tabular-nums">{song.listenCount} lượt</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Top artists */}
            {data.topArtists.length > 0 && (
              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-4">
                  <Users size={16} weight="duotone" className="text-violet-400" /> Nghệ sĩ bạn yêu thích
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {data.topArtists.map((a, i) => (
                    <button
                      key={a.name}
                      onClick={() => navigate(`/artist/${encodeURIComponent(a.name)}`)}
                      className="group text-left glass-card rounded-2xl p-3 transition-all active:scale-95"
                    >
                      <div className="relative">
                        <div className="aspect-square rounded-full overflow-hidden bg-zinc-800 mb-2 border border-white/10">
                          {a.coverImg ? (
                            <img
                              src={a.coverImg}
                              alt={a.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                              <Users size={28} weight="duotone" />
                            </div>
                          )}
                        </div>
                        <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center shadow-md tabular-nums">
                          {i + 1}
                        </span>
                      </div>
                      <p className="text-sm font-semibold truncate text-white group-hover:text-violet-300 transition-colors">
                        {a.name}
                      </p>
                      <p className="text-xs text-zinc-400 font-medium tabular-nums mt-0.5">{a.listenCount} lượt</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Top genres */}
            {data.topGenres.length > 0 && (
              <div className="glass-card rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-4">
                  <TrendUp size={16} weight="duotone" className="text-violet-400" /> Thể loại dẫn đầu
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.topGenres.map((g, i) => (
                    <span
                      key={g.genre}
                      className="flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-violet-400" : "bg-zinc-400"}`} />
                      {g.genre}
                      <span className="text-zinc-500 font-medium tabular-nums">{g.count} lượt</span>
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