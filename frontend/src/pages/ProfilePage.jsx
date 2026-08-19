import { useEffect, useRef, useState } from "react";
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
  PencilSimple,
  UploadSimple,
  Check,
  X,
} from "@phosphor-icons/react";
import { fetchProfile, updateProfile, uploadAvatar } from "../api/profile";
import { fetchRecentListens } from "../api/listens";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import { useToast } from "../components/ToastContext";
import SongTable from "../components/SongTable";

const StatCard = ({ icon: Icon, label, value, colorStyle = "bg-[#B85C38]/15 text-[#D97C54] border-[#B85C38]/30" }) => (
  <div className="indie-panel p-4 rounded-2xl border-dashed-indie transition-all">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 border ${colorStyle}`}>
      <Icon size={18} weight="duotone" />
    </div>
    <p className="font-serif italic text-2xl sm:text-3xl font-bold text-[#EDE6D6] tabular-nums">{value}</p>
    <p className="font-mono text-xs text-[#A39282] mt-0.5">{label}</p>
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
  const setUser = useAuthStore((s) => s.setUser);
  const toast = useToast();

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const handleSaveName = async () => {
    const name = draftName.trim();
    if (!name) return;
    setSavingName(true);
    try {
      const result = await updateProfile({ name });
      setData((prev) => ({ ...prev, user: result.user }));
      setUser(result.user);
      setEditingName(false);
      toast?.success?.("Đã cập nhật tên hiển thị");
    } catch (err) {
      toast?.error?.(err.message);
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast?.error?.("Chỉ hỗ trợ ảnh JPG/PNG/WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast?.error?.("Ảnh tối đa 5MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const result = await uploadAvatar(file);
      setData((prev) => ({ ...prev, user: result.user }));
      setUser(result.user);
      toast?.success?.("Đã cập nhật ảnh đại diện");
    } catch (err) {
      toast?.error?.(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

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
      <div className="flex flex-col items-center justify-center py-20 text-center font-sans">
        <p className="font-mono text-sm text-red-400 mb-2">Không thể tải hồ sơ</p>
        <p className="font-mono text-xs text-[#A39282]">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#D97C54] font-sans">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="font-mono text-xs text-[#A39282]">Đang tải thông tin hồ sơ...</p>
      </div>
    );
  }

  const avatarText = (data.user.name || data.user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="space-y-6 pb-6 select-none font-sans">
      {/* Header hồ sơ */}
      <div className="relative overflow-hidden rounded-3xl indie-panel p-6 sm:p-8 border-dashed-indie shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#2E2721] text-[#EDE6D6] font-serif italic text-4xl flex items-center justify-center shadow-2xl border-2 border-[#EDE6D6]/20 flex-shrink-0 overflow-hidden">
              {data.user.avatarUrl ? (
                <img src={data.user.avatarUrl} alt={data.user.name} className="w-full h-full object-cover" />
              ) : (
                avatarText
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarFile}
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-9 h-9 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] flex items-center justify-center shadow-lg border border-[#EDE6D6]/20 transition-all active:scale-95"
              title="Đổi ảnh đại diện"
            >
              {uploadingAvatar ? (
                <SpinnerGap size={16} className="animate-spin" />
              ) : (
                <UploadSimple size={16} weight="duotone" />
              )}
            </button>
          </div>
          <div className="text-center sm:text-left min-w-0 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              {editingName ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    autoFocus
                    maxLength={50}
                    className="bg-[#201A16] font-serif italic text-xl sm:text-3xl font-bold px-3 py-1 rounded-xl outline-none border border-[#D97C54] text-[#EDE6D6] w-full max-w-sm"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName || !draftName.trim()}
                    className="text-[#76876F] hover:text-[#EDE6D6] p-1.5 rounded-xl hover:bg-[#26211C] transition-colors flex-shrink-0 disabled:opacity-40"
                    title="Lưu tên"
                  >
                    {savingName ? <SpinnerGap size={16} className="animate-spin" /> : <Check size={16} weight="bold" />}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="text-[#A39282] hover:text-[#EDE6D6] p-1.5 rounded-xl hover:bg-[#26211C] transition-colors flex-shrink-0"
                    title="Hủy"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="font-serif italic text-2xl sm:text-4xl font-bold tracking-tight truncate text-[#EDE6D6]">
                    {data.user.name}
                  </h1>
                  <button
                    onClick={() => {
                      setDraftName(data.user.name);
                      setEditingName(true);
                    }}
                    className="text-[#A39282] hover:text-[#D97C54] p-1.5 rounded-xl hover:bg-[#26211C] transition-colors flex-shrink-0"
                    title="Sửa tên hiển thị"
                  >
                    <PencilSimple size={16} weight="bold" />
                  </button>
                </>
              )}
              {!editingName && data.user.role === "ADMIN" && (
                <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E0B35C]/15 text-[#E0B35C] border border-[#E0B35C]/30">
                  <ShieldCheck size={13} weight="bold" /> Quản trị viên
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-[#A39282] mt-1">{data.user.email}</p>
            <p className="font-mono text-[11px] text-[#8A7B6C] mt-1">
              Thành viên từ {new Date(data.user.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          icon={Heart}
          label="Bản thu yêu thích"
          value={data.stats.likes}
          colorStyle="bg-[#B85C38]/15 text-[#D97C54] border-[#B85C38]/30"
        />
        <StatCard
          icon={Queue}
          label="Playlist cá nhân"
          value={data.stats.playlists}
          colorStyle="bg-[#E0B35C]/15 text-[#E0B35C] border-[#E0B35C]/30"
        />
        <StatCard
          icon={Users}
          label="Nghệ sĩ theo dõi"
          value={data.stats.follows}
          colorStyle="bg-[#76876F]/15 text-[#76876F] border-[#76876F]/30"
        />
        <StatCard
          icon={Headphones}
          label="Lượt nghe"
          value={data.stats.listenCount}
          colorStyle="bg-[#A39282]/15 text-[#EDE6D6] border-[#A39282]/30"
        />
        <StatCard
          icon={Clock}
          label="Thời gian thưởng thức"
          value={formatMinutes(data.stats.listenMinutes)}
          colorStyle="bg-[#B85C38]/15 text-[#D97C54] border-[#B85C38]/30"
        />
      </div>

      {/* Top thể loại */}
      <div className="indie-panel rounded-2xl p-5 border-dashed-indie">
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2 mb-3.5">
          <TrendUp size={16} weight="duotone" className="text-[#D97C54]" />
          Thể Loại Bạn Nghe Nhiều Nhất
        </h2>
        {data.topGenres.length === 0 ? (
          <p className="font-mono text-xs text-[#A39282]">Chưa có dữ liệu thể loại. Hãy nghe thử vài bài để nhận gợi ý!</p>
        ) : (
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
        )}
      </div>

      {/* Nghe gần đây */}
      <div className="indie-panel rounded-2xl p-5 border-dashed-indie">
        <div className="flex items-center justify-between mb-4 border-b border-dashed-indie pb-3">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2">
            <Clock size={16} weight="duotone" className="text-[#E0B35C]" />
            Nhật Ký Nghe Gần Đây
          </h2>
          <div className="flex items-center gap-2">
            {recent.length > 0 && (
              <button
                onClick={() => {
                  setQueue(recent);
                  setCurrentSong(recent[0]);
                }}
                className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] shadow-sm transition-all active:scale-95"
              >
                <Play size={13} weight="fill" />
                Phát tất cả
              </button>
            )}
            <button
              onClick={loadRecent}
              className="flex items-center gap-1.5 font-mono text-xs p-2 rounded-xl bg-[#26211C] hover:bg-[#2E2721] text-[#A39282] hover:text-[#EDE6D6] border border-[#EDE6D6]/10 transition-all active:scale-95"
              title="Làm mới"
            >
              <ArrowsClockwise size={14} weight="bold" />
            </button>
          </div>
        </div>
        {recentLoading ? (
          <div className="flex items-center justify-center py-10 text-[#D97C54]">
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
          className="flex items-center gap-2 font-mono text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#26211C] hover:bg-[#2E2721] border border-[#EDE6D6]/15 text-[#EDE6D6] transition-all active:scale-95 shadow-sm"
        >
          <Heart size={14} weight="fill" className="text-[#D97C54]" />
          Bài hát đã thích
        </Link>
        <Link
          to="/wrapped"
          className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] shadow-md transition-all active:scale-95 border border-[#EDE6D6]/20"
        >
          <Sparkle size={14} weight="fill" className="text-[#E0B35C]" />
          JamWave Wrapped
        </Link>
        <Link
          to="/albums"
          className="flex items-center gap-2 font-mono text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#26211C] hover:bg-[#2E2721] border border-[#EDE6D6]/15 text-[#EDE6D6] transition-all active:scale-95 shadow-sm"
        >
          <Disc size={14} weight="duotone" className="text-[#76876F]" />
          Khám phá album
        </Link>
        {data.user.role === "ADMIN" && (
          <Link
            to="/admin"
            className="flex items-center gap-2 font-mono text-xs font-bold uppercase px-4 py-2.5 rounded-xl bg-[#E0B35C]/15 hover:bg-[#E0B35C]/25 border border-[#E0B35C]/30 text-[#E0B35C] transition-all active:scale-95"
          >
            <ShieldCheck size={14} weight="bold" />
            Trung tâm quản trị
          </Link>
        )}
      </div>
    </div>
  );
}
