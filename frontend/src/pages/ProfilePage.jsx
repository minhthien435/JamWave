import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Heart, ListMusic, Headphones, Clock, Users, Music, Shield, TrendingUp, Sparkles } from "lucide-react";
import { fetchProfile } from "../api/profile";

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="glass-card p-5 rounded-2xl border border-white/10">
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3 shadow-lg`}>
      <Icon size={18} />
    </div>
    <p className="text-3xl font-black text-white">{value}</p>
    <p className="text-xs text-zinc-400 font-semibold mt-1">{label}</p>
  </div>
);

const formatMinutes = (minutes) => {
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
};

export default function ProfilePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-400 font-semibold text-lg mb-2">Không thể tải hồ sơ</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Loader2 size={32} className="animate-spin mb-3" />
        <p className="text-sm">Đang tải hồ sơ...</p>
      </div>
    );
  }

  const avatarText = (data.user.name || data.user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="space-y-6 pb-6 select-none">
      {/* Header hồ sơ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950/70 via-purple-900/40 to-cyan-950/60 p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-violet-500/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-violet-600 via-purple-500 to-cyan-400 text-white font-black text-5xl flex items-center justify-center shadow-2xl border-4 border-white/20 flex-shrink-0">
            {avatarText}
          </div>
          <div className="text-center sm:text-left min-w-0 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight truncate text-white">{data.user.name}</h1>
              {data.user.role === "ADMIN" && (
                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">
                  <Shield size={11} /> Admin
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Heart} label="Bài hát đã thích" value={data.stats.likes} color="from-rose-500 to-pink-600" />
        <StatCard icon={ListMusic} label="Playlist" value={data.stats.playlists} color="from-emerald-500 to-teal-600" />
        <StatCard icon={Users} label="Nghệ sĩ theo dõi" value={data.stats.follows} color="from-violet-500 to-purple-600" />
        <StatCard icon={Headphones} label="Lượt nghe" value={data.stats.listenCount} color="from-cyan-500 to-blue-600" />
        <StatCard icon={Clock} label="Thời gian nghe" value={formatMinutes(data.stats.listenMinutes)} color="from-amber-500 to-orange-600" />
      </div>

      {/* Top thể loại */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-violet-400" />
          Thể loại bạn nghe nhiều
        </h2>
        {data.topGenres.length === 0 ? (
          <p className="text-sm text-zinc-500">Chưa có dữ liệu. Hãy nghe thử vài bài để nhận gợi ý thể loại!</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {data.topGenres.map((g, i) => (
              <span
                key={g.genre}
                className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-zinc-200"
              >
                <span
                  className={`w-2 h-2 rounded-full ${i === 0 ? "bg-violet-400" : i === 1 ? "bg-cyan-400" : "bg-fuchsia-400"}`}
                />
                {g.genre}
                <span className="text-zinc-500 font-semibold">{g.count} lượt</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Liên kết nhanh */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/likes"
          className="flex items-center gap-2 text-xs font-bold px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all active:scale-95"
        >
          <Heart size={14} className="text-rose-400" />
          Bài hát đã thích
        </Link>
        <Link
          to="/wrapped"
          className="flex items-center gap-2 text-xs font-bold px-5 py-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white shadow-lg shadow-violet-500/25 transition-all active:scale-95"
        >
          <Sparkles size={14} />
          JamWave Wrapped
        </Link>
        <Link
          to="/albums"
          className="flex items-center gap-2 text-xs font-bold px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all active:scale-95"
        >
          <Music size={14} className="text-violet-400" />
          Khám phá album
        </Link>
        {data.user.role === "ADMIN" && (
          <Link
            to="/admin"
            className="flex items-center gap-2 text-xs font-bold px-5 py-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-amber-300 transition-all active:scale-95"
          >
            <Shield size={14} />
            Trung tâm quản trị
          </Link>
        )}
      </div>
    </div>
  );
}
