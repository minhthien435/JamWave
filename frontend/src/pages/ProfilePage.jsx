import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Queue,
  Headphones,
  Clock,
  Users,
  Disc,
  ShieldCheck,
  TrendUp,
  Sparkle,
  Play,
  ArrowsClockwise,
  SpinnerGap,
} from "@phosphor-icons/react";
import { fetchProfile } from "../api/profile";
import { fetchRecentListens } from "../api/listens";
import { usePlayerStore } from "../usePlayerStore";
import SongTable from "../components/SongTable";

const StatCard = ({ icon: Icon, label, value, colorStyle = "bg-violet-600/20 text-violet-400 border-violet-500/20" }) => (
  <div className="glass-card p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 border ${colorStyle}`}>
      <Icon size={18} weight="duotone" />
    </div>
    <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">{value}</p>
    <p className="text-xs text-zinc-400 font-medium mt-0.5">{label}</p>
  </div>
);

const formatMinutes = (minutes) => {
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export default function ProfilePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const setCurrentSong = usePlayerStore((s) => s.setCurrentSong);

  const loadRecent = () => {
    setRecentLoading(true);
    fetchRecentListens(12)
      .then(setRecent)
      .catch(() => { })
      .finally(() => setRecentLoading(false));
  };

  useEffect(() => {
    fetchProfile()
      .then(setData)
      .catch((err) => setError(err.message));
    fetchRecentListens(12)
      .then(setRecent)
      .catch(() => { })
      .finally(() => setRecentLoading(false));
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-rose-400 font-semibold mb-2">Không thể tải hồ sơ</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-violet-400">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="text-sm text-zinc-400 font-medium">Đang tải thông tin hồ sơ...</p>
      </div>
    );
  }

  const avatarText = (data.user.name || data.user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="space-y-6 pb-6 select-none">
      {/* Header hồ sơ */}
      <div className="relative overflow-hidden rounded-3xl bg-[#14141c] p-6 sm:p-8 border border-white/10 shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-violet-600 text-white font-black text-4xl flex items-center justify-center shadow-2xl border-4 border-white/10 flex-shrink-0 overflow-hidden">
            {data.user.avatarUrl ? (
              <img src={data.user.avatarUrl} alt={data.user.name} className="w-full h-full object-cover" />
            ) : (
              avatarText
            )}
          </div>
          <div className="text-center sm:text-left min-w-0 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight truncate text-white">{data.user.name}</h1>
              {data.user.role === "ADMIN" && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <ShieldCheck size={13} weight="bold" /> Admin
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 font-medium mt-1">{data.user.email}</p>
            <p className="text-xs text-zinc-500 mt-1">
              Tham gia từ {new Date(data.user.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          icon={Heart}
          label="Bài hát đã thích"
          value={data.stats.likes}
          colorStyle="bg-rose-500/15 text-rose-400 border-rose-500/20"
        />
        <StatCard
          icon={Queue}
          label="Playlist cá nhân"
          value={data.stats.playlists}
          colorStyle="bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/20"
        />
        <StatCard
          icon={Users}
          label="Nghệ sĩ theo dõi"
          value={data.stats.follows}
          colorStyle="bg-amber-500/15 text-amber-400 border-amber-500/20"
        />
        <StatCard
          icon={Headphones}
          label="Lượt nghe"
          value={data.stats.listenCount}
          colorStyle="bg-cyan-500/15 text-cyan-400 border-cyan-500/20"
        />
        <StatCard
          icon={Clock}
          label="Thời gian nghe"
          value={formatMinutes(data.stats.listenMinutes)}
          colorStyle="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
        />
      </div>

      {/* Top thể loại */}
      <div className="glass-card rounded-2xl p-5 border border-white/10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-3.5">
          <TrendUp size={16} weight="duotone" className="text-violet-400" />
          Thể loại bạn nghe nhiều
        </h2>
        {data.topGenres.length === 0 ? (
          <p className="text-xs text-zinc-500">Chưa có dữ liệu thể loại. Hãy nghe thử vài bài để nhận gợi ý!</p>
        ) : (
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
        )}
      </div>

      {/* Nghe gần đây */}
      <div className="glass-card rounded-2xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Clock size={16} weight="duotone" className="text-violet-400" />
            Nghe gần đây
          </h2>
          <div className="flex items-center gap-2">
            {recent.length > 0 && (
              <button
                onClick={() => {
                  setQueue(recent);
                  setCurrentSong(recent[0]);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-sm transition-all active:scale-95"
              >
                <Play size={13} weight="fill" />
                Phát tất cả
              </button>
            )}
            <button
              onClick={loadRecent}
              className="flex items-center gap-1.5 text-xs font-semibold p-2 rounded-full bg-white/10 hover:bg-white/15 text-zinc-300 transition-all active:scale-95"
              title="Làm mới"
            >
              <ArrowsClockwise size={13} weight="bold" />
            </button>
          </div>
        </div>
        {recentLoading ? (
          <div className="flex items-center justify-center py-10 text-violet-400">
            <SpinnerGap size={24} className="animate-spin" />
          </div>
        ) : (
          <SongTable songs={recent} emptyText="Chưa có bài nào trong lịch sử nghe nhạc gần đây." />
        )}
      </div>

      {/* Liên kết nhanh */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Link
          to="/likes"
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all active:scale-95"
        >
          <Heart size={14} weight="fill" className="text-rose-400" />
          Bài hát đã thích
        </Link>
        <Link
          to="/wrapped"
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-sm transition-all active:scale-95"
        >
          <Sparkle size={14} weight="fill" />
          JamWave Wrapped
        </Link>
        <Link
          to="/albums"
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all active:scale-95"
        >
          <Disc size={14} weight="duotone" className="text-violet-400" />
          Khám phá album
        </Link>
        {data.user.role === "ADMIN" && (
          <Link
            to="/admin"
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all active:scale-95"
          >
            <ShieldCheck size={14} weight="bold" />
            Trung tâm quản trị
          </Link>
        )}
      </div>
    </div>
  );
}
