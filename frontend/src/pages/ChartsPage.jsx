import { useEffect, useState } from "react";
import { TrendUp, Play, Pause, SpinnerGap } from "@phosphor-icons/react";
import { fetchTopListens } from "../api/listens";
import { usePlayerStore } from "../usePlayerStore";
import SourceBadge from "../components/SourceBadge";

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const RANK_STYLE = [
  "bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]",
  "bg-slate-300/20 text-slate-200 border border-slate-300/40",
  "bg-amber-700/25 text-amber-400 border border-amber-600/40",
];

export default function ChartsPage() {
  const [period, setPeriod] = useState("week");
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { currentSong, isPlaying, setCurrentSong, togglePlay, setQueue } = usePlayerStore();

  useEffect(() => {
    let cancelled = false;

    fetchTopListens(period, 50)
      .then((data) => {
        if (cancelled) return;
        setSongs(data);
        setQueue(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setSongs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, setQueue]);

  const handlePeriod = (key) => {
    setLoading(true);
    setError(null);
    setPeriod(key);
  };

  const handleSelectSong = (song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      setCurrentSong(song);
    }
  };

  const tabs = [
    { key: "week", label: "Tuần này" },
    { key: "month", label: "Tháng này" },
  ];

  return (
    <div className="space-y-6 pb-6 select-none">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-950/40 text-white">
            <TrendUp size={22} weight="bold" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Bảng xếp hạng</h2>
            <p className="text-xs text-zinc-400 font-medium">Những ca khúc độc lập được lắng nghe nhiều nhất</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => handlePeriod(t.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                period === t.key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-violet-400">
          <SpinnerGap size={32} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-rose-400 font-semibold mb-2">Không thể tải bảng xếp hạng</p>
          <p className="text-zinc-500 text-sm">{error}</p>
        </div>
      ) : songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-2xl border border-white/10">
          <p className="text-3xl mb-2 text-zinc-600">📈</p>
          <p className="text-zinc-300 font-bold mb-1">Chưa có dữ liệu {period === "week" ? "tuần này" : "tháng này"}</p>
          <p className="text-xs text-zinc-500 max-w-md font-medium">
            Lượt nghe sẽ được thống kê tự động khi bài hát được phát.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {songs.map((song, index) => {
            const isThisSongSelected = currentSong?.id === song.id;
            const isTop3 = index < 3;

            return (
              <div
                key={`chart-${song.id}`}
                onClick={() => handleSelectSong(song)}
                className={`group flex items-center gap-3.5 px-4 py-2.5 rounded-2xl border cursor-pointer transition-all duration-150 ${
                  isThisSongSelected
                    ? "bg-violet-600/15 border-violet-500/40"
                    : isTop3
                    ? "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                    : "bg-transparent border-transparent hover:bg-white/[0.05]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 tabular-nums ${
                    isTop3 ? RANK_STYLE[index] : "text-zinc-500 bg-white/5 border border-white/10"
                  }`}
                >
                  {index + 1}
                </div>

                <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                  <img
                    src={song.albumCover}
                    alt={song.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p
                      className={`font-semibold text-sm truncate ${
                        isThisSongSelected ? "text-violet-300 font-bold" : "text-white group-hover:text-violet-200 transition-colors"
                      }`}
                    >
                      {song.title}
                    </p>
                    <SourceBadge source={song.source} />
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">{song.artist}</p>
                </div>

                <span className="text-xs font-semibold text-violet-400/90 flex-shrink-0 tabular-nums">
                  {song.listenCount > 0 ? `${song.listenCount} lượt nghe` : ""}
                </span>

                <span className="text-xs text-zinc-400 font-medium flex-shrink-0 hidden sm:block tabular-nums w-10 text-right">
                  {formatDuration(song.duration)}
                </span>

                <button
                  className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-150 flex-shrink-0 bg-violet-600 text-white ${
                    isThisSongSelected
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
                  }`}
                >
                  {isThisSongSelected && isPlaying ? (
                    <Pause size={14} weight="fill" />
                  ) : (
                    <Play size={14} weight="fill" className="ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
