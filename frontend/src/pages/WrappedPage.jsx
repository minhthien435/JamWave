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
  { key: "week", label: "Tuần Này" },
  { key: "month", label: "Tháng Này" },
  { key: "year", label: "Năm Nay" },
  { key: "all", label: "Tất Cả Thời Gian" },
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
      <div className="flex flex-col items-center justify-center py-20 text-center font-sans">
        <p className="font-mono text-sm text-red-400 mb-2">Không thể tải thống kê</p>
        <p className="font-mono text-xs text-[#A39282]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6 select-none font-sans">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl indie-panel p-6 sm:p-8 border-dashed-indie shadow-2xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B85C38]/15 border border-[#B85C38]/30 text-[#D97C54] font-mono text-[10px] uppercase font-bold tracking-[0.18em] mb-3">
            <Sparkle size={13} weight="fill" className="text-[#E0B35C]" />
            JamWave • TỔNG KẾT
          </div>
          <h1 className="font-serif italic font-bold text-2xl sm:text-4xl text-[#EDE6D6] tracking-tight">
            JamWave Wrapped
          </h1>
          <p className="font-mono text-xs text-[#A39282] mt-1.5">
            Tổng kết hành trình thưởng thức âm nhạc độc lập và gu âm thanh của riêng bạn
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
                className={`font-mono text-xs font-semibold px-4 py-2 rounded-xl border transition-all active:scale-95 ${
                  period === p.key
                    ? "bg-[#B85C38] text-[#EDE6D6] border-[#D97C54] shadow-sm"
                    : "bg-[#26211C] hover:bg-[#2E2721] text-[#A39282] hover:text-[#EDE6D6] border-[#EDE6D6]/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#D97C54]">
          <SpinnerGap size={32} className="animate-spin mb-3" />
          <p className="font-mono text-xs text-[#A39282]">Đang tổng kết dữ liệu âm nhạc...</p>
        </div>
      ) : data && data.totalListens === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center indie-panel rounded-2xl border-dashed-indie">
          <Headphones size={40} weight="duotone" className="mb-3 text-[#8A7B6C]" />
          <p className="font-serif italic text-base font-bold text-[#EDE6D6]">Chưa có dữ liệu nghe trong giai đoạn này</p>
          <p className="font-mono text-xs text-[#A39282] mt-1">Hãy thưởng thức vài bản nhạc để bảng tổng kết cập nhật!</p>
        </div>
      ) : (
        data && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="indie-panel rounded-2xl p-4 border-dashed-indie">
                <div className="w-9 h-9 rounded-xl bg-[#B85C38]/15 border border-[#B85C38]/30 flex items-center justify-center mb-3">
                  <Headphones size={20} weight="duotone" className="text-[#D97C54]" />
                </div>
                <p className="font-serif italic text-2xl sm:text-3xl font-bold text-[#EDE6D6] tabular-nums">{data.totalListens}</p>
                <p className="font-mono text-xs text-[#A39282] mt-1">Lượt nghe</p>
              </div>
              <div className="indie-panel rounded-2xl p-4 border-dashed-indie">
                <div className="w-9 h-9 rounded-xl bg-[#76876F]/15 border border-[#76876F]/30 flex items-center justify-center mb-3">
                  <Clock size={20} weight="duotone" className="text-[#76876F]" />
                </div>
                <p className="font-serif italic text-2xl sm:text-3xl font-bold text-[#EDE6D6] tabular-nums">{formatMinutes(data.minutesListened)}</p>
                <p className="font-mono text-xs text-[#A39282] mt-1">Thời gian nghe</p>
              </div>
              <div className="indie-panel rounded-2xl p-4 border-dashed-indie">
                <div className="w-9 h-9 rounded-xl bg-[#E0B35C]/15 border border-[#E0B35C]/30 flex items-center justify-center mb-3">
                  <MusicNotes size={20} weight="duotone" className="text-[#E0B35C]" />
                </div>
                <p className="font-serif italic text-2xl sm:text-3xl font-bold text-[#EDE6D6] tabular-nums">{data.uniqueSongs}</p>
                <p className="font-mono text-xs text-[#A39282] mt-1">Bản thu khác nhau</p>
              </div>
              <div className="indie-panel rounded-2xl p-4 border-dashed-indie">
                <div className="w-9 h-9 rounded-xl bg-[#A39282]/15 border border-[#A39282]/30 flex items-center justify-center mb-3">
                  <Users size={20} weight="duotone" className="text-[#EDE6D6]" />
                </div>
                <p className="font-serif italic text-2xl sm:text-3xl font-bold text-[#EDE6D6] tabular-nums">{data.topArtists.length}</p>
                <p className="font-mono text-xs text-[#A39282] mt-1">Nghệ sĩ tiêu biểu</p>
              </div>
            </div>

            {/* Top songs */}
            {data.topSongs.length > 0 && (
              <div className="indie-panel rounded-2xl p-5 border-dashed-indie">
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2 mb-4 border-b border-dashed-indie pb-3">
                  <MusicNotes size={16} weight="duotone" className="text-[#D97C54]" /> Bản Thu Nghe Nhiều Nhất
                </h2>
                <div className="space-y-1">
                  {data.topSongs.map((song, i) => (
                    <button
                      key={song.id}
                      onClick={() => setCurrentSong(song)}
                      className="w-full flex items-center gap-3.5 p-2 rounded-xl hover:bg-[#26211C] text-left transition-all active:scale-[0.99] group"
                    >
                      <span className="font-mono w-6 text-center font-bold text-xs text-[#8A7B6C] tabular-nums">{i + 1}</span>
                      {song.albumCover && (
                        <img src={song.albumCover} alt="" className="w-10 h-10 rounded-lg object-cover shadow-sm bg-[#181512]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-serif italic text-sm font-semibold text-[#EDE6D6] group-hover:text-[#D97C54] transition-colors truncate">
                          {song.title}
                        </p>
                        <p className="font-mono text-xs text-[#A39282] truncate mt-0.5">{song.artist}</p>
                      </div>
                      <span className="font-mono text-xs text-[#8A7B6C] tabular-nums">{song.listenCount} lượt</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Top artists */}
            {data.topArtists.length > 0 && (
              <div className="indie-panel rounded-2xl p-5 border-dashed-indie">
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2 mb-4 border-b border-dashed-indie pb-3">
                  <Users size={16} weight="duotone" className="text-[#E0B35C]" /> Nghệ Sĩ Bạn Yêu Thích
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {data.topArtists.map((a, i) => (
                    <button
                      key={a.name}
                      onClick={() => navigate(`/artist/${encodeURIComponent(a.name)}`)}
                      className="group text-left indie-panel rounded-2xl p-3 border-dashed-indie hover:-translate-y-1 transition-all active:scale-95"
                    >
                      <div className="relative">
                        <div className="aspect-square rounded-full overflow-hidden bg-[#181512] mb-2 border border-[#EDE6D6]/15">
                          {a.coverImg ? (
                            <img
                              src={a.coverImg}
                              alt={a.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#8A7B6C]">
                              <Users size={28} weight="duotone" />
                            </div>
                          )}
                        </div>
                        <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#B85C38] text-[#EDE6D6] font-mono text-[10px] font-bold flex items-center justify-center shadow-md tabular-nums">
                          {i + 1}
                        </span>
                      </div>
                      <p className="font-serif italic text-sm font-semibold truncate text-[#EDE6D6] group-hover:text-[#D97C54] transition-colors">
                        {a.name}
                      </p>
                      <p className="font-mono text-xs text-[#8A7B6C] tabular-nums mt-0.5">{a.listenCount} lượt</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Top genres */}
            {data.topGenres.length > 0 && (
              <div className="indie-panel rounded-2xl p-5 border-dashed-indie">
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2 mb-4 border-b border-dashed-indie pb-3">
                  <TrendUp size={16} weight="duotone" className="text-[#76876F]" /> Thể Loại Dẫn Đầu
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.topGenres.map((g, i) => (
                    <span
                      key={g.genre}
                      className="flex items-center gap-2 font-mono text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-[#26211C] border border-[#EDE6D6]/10 text-[#EDE6D6]"
                    >
                      <span className={`w-2 h-2 rounded-full ${i === 0 ? "bg-[#D97C54]" : "bg-[#76876F]"}`} />
                      {g.genre}
                      <span className="text-[#8A7B6C] tabular-nums font-normal">({g.count} lượt)</span>
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