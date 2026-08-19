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
  "bg-[#B85C38] text-[#EDE6D6] border-[#D97C54] shadow-md",
  "bg-[#76876F] text-[#EDE6D6] border-[#76876F]/60",
  "bg-[#E0B35C] text-[#2B2620] border-[#E0B35C]/60",
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
    { key: "week", label: "Tuần Này" },
    { key: "month", label: "Tháng Này" },
  ];

  return (
    <div className="space-y-6 pb-6 select-none font-sans">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-dashed-indie pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#2E2721] border border-[#EDE6D6]/20 flex items-center justify-center text-[#D97C54] shadow-md">
            <TrendUp size={22} weight="bold" />
          </div>
          <div>
            <h1 className="font-serif italic font-bold text-2xl sm:text-3xl text-[#EDE6D6]">Bảng Xếp Hạng JamWave</h1>
            <p className="font-mono text-xs text-[#A39282]">Những bản nhạc độc lập được lắng nghe nhiều nhất</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#26211C] border border-[#EDE6D6]/15 rounded-xl p-1 font-mono text-xs">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => handlePeriod(t.key)}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all duration-150 ${
                period === t.key
                  ? "bg-[#B85C38] text-[#EDE6D6] shadow-sm"
                  : "text-[#A39282] hover:text-[#EDE6D6]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#D97C54]">
          <SpinnerGap size={30} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-mono text-sm text-red-400 mb-2">Không thể tải bảng xếp hạng</p>
          <p className="font-mono text-xs text-[#A39282]">{error}</p>
        </div>
      ) : songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center indie-panel rounded-2xl border-dashed-indie p-8">
          <p className="text-3xl mb-2">📈</p>
          <p className="font-serif italic text-[#EDE6D6] font-bold mb-1">Chưa có dữ liệu {period === "week" ? "tuần này" : "tháng này"}</p>
          <p className="font-mono text-xs text-[#A39282] max-w-md">
            Lượt nghe sẽ được cập nhật tự động khi bài hát phát.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {songs.map((song, index) => {
            const isThisSongSelected = currentSong?.id === song.id;
            const isTop3 = index < 3;

            return (
              <div
                key={`chart-${song.id}`}
                onClick={() => handleSelectSong(song)}
                className={`ticket-row flex items-center gap-3.5 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                  isThisSongSelected
                    ? "bg-[#2E2721] border-[#D97C54]"
                    : "hover:bg-[#26211C]"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 tabular-nums ${
                    isTop3 ? RANK_STYLE[index] : "text-[#8A7B6C] bg-[#26211C] border border-[#EDE6D6]/10"
                  }`}
                >
                  {index + 1}
                </div>

                <div className="w-10 h-10 rounded bg-[#28221D] border border-[#EDE6D6]/15 p-0.5 overflow-hidden shadow-sm flex-shrink-0">
                  <img
                    src={song.albumCover}
                    alt={song.title}
                    loading="lazy"
                    className="w-full h-full object-cover rounded"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p
                      className={`font-serif italic text-sm truncate ${
                        isThisSongSelected ? "text-[#D97C54] font-bold" : "text-[#EDE6D6] group-hover:text-[#D97C54] transition-colors"
                      }`}
                    >
                      {song.title}
                    </p>
                    <SourceBadge source={song.source} />
                  </div>
                  <p className="font-mono text-[11px] text-[#A39282] truncate mt-0.5">{song.artist}</p>
                </div>

                <span className="font-mono text-[11px] text-[#D97C54] flex-shrink-0 tabular-nums">
                  {song.listenCount > 0 ? `${song.listenCount} lượt nghe` : ""}
                </span>

                <span className="font-mono text-[11px] text-[#8A7B6C] flex-shrink-0 hidden sm:block tabular-nums w-10 text-right">
                  {formatDuration(song.duration)}
                </span>

                <button
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md transition-all duration-150 flex-shrink-0 bg-[#B85C38] text-[#EDE6D6] border border-[#EDE6D6]/20 ${
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
