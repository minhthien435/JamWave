import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import {
  House,
  MagnifyingGlass,
  Compass,
  TrendUp,
  Disc,
  MicrophoneStage,
  Books,
  Heart,
  Plus,
  MusicNotes,
  X,
  SpinnerGap,
  CassetteTape,
  BookmarkSimple,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useAuthStore } from "../useAuthStore";
import { useLibraryStore } from "../useLibraryStore";
import { createPlaylist } from "../api/playlists";
import { fetchLikedSongs } from "../api/likes";

export default function Sidebar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { playlists, loading, loadPlaylists, clear } = useLibraryStore();

  const [likedCount, setLikedCount] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (user) {
      loadPlaylists();
      fetchLikedSongs()
        .then((data) => setLikedCount((data.songs || []).length))
        .catch(() => setLikedCount(null));
    } else {
      clear();
    }
  }, [user, loadPlaylists, clear]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    setCreateError("");

    const title = newTitle.trim();
    if (!title) {
      setCreateError("Tên playlist không được để trống");
      return;
    }

    setCreating(true);
    try {
      const result = await createPlaylist(title);
      setShowCreateModal(false);
      setNewTitle("");
      await loadPlaylists();
      navigate(`/playlist/${result.playlist.id}`);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const navItems = [
    { to: "/", label: "Trang Chủ", icon: House, end: true },
    { to: "/search", label: "Tìm Kiếm", icon: MagnifyingGlass },
    { to: "/browse", label: "Khám Phá", icon: Compass },
    { to: "/charts", label: "Bảng Xếp Hạng", icon: TrendUp },
    { to: "/albums", label: "Album Đặc Sắc", icon: Disc },
    { to: "/artists", label: "Nghệ Sĩ Độc Lập", icon: MicrophoneStage },
    { to: "/docs", label: "Sổ Tay AI", icon: Books },
    ...(user?.role === "ADMIN"
      ? [{ to: "/admin", label: "Quản Trị Hệ Thống", icon: ShieldCheck, highlight: true }]
      : []),
  ];

  return (
    <aside className="w-64 flex flex-col gap-3 p-2 h-full select-none z-20 font-sans">
      {/* Box 1: Brand Header & Zine Navigation */}
      <div className="indie-panel rounded-2xl p-4 flex flex-col gap-3 border-dashed-indie">
        {/* Brand Stamp */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-3 px-1 py-1 group cursor-pointer border-b border-dashed-indie pb-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#2E2721] border border-[#EDE6D6]/20 flex items-center justify-center text-[#D97C54] shadow-md group-hover:scale-105 transition-all">
            <CassetteTape size={24} weight="duotone" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-serif italic font-semibold text-lg tracking-tight text-[#EDE6D6] group-hover:text-[#D97C54] transition-colors leading-tight">
              JamWave
            </span>
            <span className="font-mono text-[9px] font-bold text-[#A39282] uppercase tracking-[0.18em]">
              INDIE MUSIC
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 mt-0.5 font-mono text-xs">
          {navItems.map(({ to, label, icon: Icon, end, highlight }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 ${
                  highlight
                    ? isActive
                      ? "text-amber-300 bg-amber-500/15 font-semibold border border-amber-500/30 shadow-sm"
                      : "text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20"
                    : isActive
                    ? "text-[#EDE6D6] bg-[#2E2721] font-semibold border border-[#EDE6D6]/15 shadow-sm"
                    : "text-[#A39282] hover:text-[#EDE6D6] hover:bg-[#26211C]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={17}
                    weight={isActive ? "fill" : "regular"}
                    className={`transition-colors duration-200 ${
                      highlight
                        ? isActive
                          ? "text-amber-300"
                          : "text-amber-400/80"
                        : isActive
                        ? "text-[#D97C54]"
                        : "text-[#8A7B6C]"
                    }`}
                  />
                  <span className="truncate flex-1">{label}</span>
                  {isActive && (
                    <span className={`w-1.5 h-1.5 rounded-full ${highlight ? "bg-amber-400" : "bg-[#D97C54]"}`} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Box 2: Library / Tape Collection */}
      <div className="indie-panel rounded-2xl p-4 pb-28 flex-1 flex flex-col gap-3 overflow-y-auto border-dashed-indie">
        <div className="flex items-center justify-between text-[#A39282] px-1 py-0.5 border-b border-dashed-indie pb-2">
          <div className="flex items-center gap-2">
            <BookmarkSimple size={18} weight="duotone" className="text-[#D97C54]" />
            <span className="font-mono font-bold text-xs uppercase tracking-wider text-[#EDE6D6]">
              Thư Viện Của Bạn
            </span>
          </div>
          {user && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-[#A39282] hover:text-[#D97C54] p-1 rounded-lg hover:bg-[#2E2721] transition-colors duration-150 active:scale-95"
              title="Tạo playlist mới"
            >
              <Plus size={16} weight="bold" />
            </button>
          )}
        </div>

        {!user ? (
          <div className="text-center py-5 px-3 bg-[#26211C] rounded-xl border border-dashed-indie my-auto">
            <p className="font-sans text-xs text-[#A39282] mb-3 leading-relaxed">
              Đăng nhập để tự tay tạo những danh sách phát riêng của bạn trên JamWave.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="font-mono text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] transition-colors duration-150 shadow-md active:scale-95"
            >
              Đăng nhập
            </button>
          </div>
        ) : (
          <nav className="flex flex-col gap-1 mt-1 font-mono text-xs">
            <NavLink
              to="/likes"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 ${
                  isActive
                    ? "text-[#EDE6D6] bg-[#2E2721] font-semibold border border-[#EDE6D6]/15 shadow-sm"
                    : "text-[#A39282] hover:text-[#EDE6D6] hover:bg-[#26211C]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="w-7 h-7 rounded-lg bg-[#B85C38]/20 border border-[#B85C38]/40 flex items-center justify-center text-[#D97C54] flex-shrink-0">
                    <Heart size={14} weight="fill" />
                  </div>
                  <span className="truncate flex-1 font-sans text-xs">Bài Đã Thích</span>
                  {likedCount !== null && (
                    <span className="text-[10px] font-bold font-mono bg-[#B85C38]/20 text-[#D97C54] px-2 py-0.5 rounded-full border border-[#B85C38]/30">
                      {likedCount}
                    </span>
                  )}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#D97C54] ml-1" />}
                </>
              )}
            </NavLink>

            {loading && playlists.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-[#D97C54]">
                <SpinnerGap size={20} className="animate-spin" />
              </div>
            ) : (
              playlists.map((playlist) => (
                <NavLink
                  key={playlist.id}
                  to={`/playlist/${playlist.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 ${
                      isActive
                        ? "text-[#EDE6D6] bg-[#2E2721] font-semibold border border-[#EDE6D6]/15 shadow-sm"
                        : "text-[#A39282] hover:text-[#EDE6D6] hover:bg-[#26211C]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="w-7 h-7 rounded-lg bg-[#2E2721] border border-[#EDE6D6]/15 flex items-center justify-center text-[#A39282] overflow-hidden flex-shrink-0">
                        {playlist.coverImg ? (
                          <img
                            src={playlist.coverImg}
                            alt={playlist.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MusicNotes size={13} />
                        )}
                      </div>
                      <span className="truncate flex-1 font-sans text-xs">{playlist.title}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#D97C54] ml-1" />}
                    </>
                  )}
                </NavLink>
              ))
            )}

            {!loading && playlists.length === 0 && (
              <p className="text-[11px] font-mono text-[#8A7B6C] px-3 py-3 text-center bg-[#26211C] rounded-xl border border-dashed-indie mt-2">
                Chưa có playlist nào. Bấm + để tạo.
              </p>
            )}
          </nav>
        )}
      </div>

      {/* Modal Tạo Playlist */}
      {showCreateModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/25 backdrop-blur-sm flex items-start justify-center p-4 pt-20 sm:pt-28 pb-32 transition-all duration-200 animate-fade-in font-sans"
            onClick={() => setShowCreateModal(false)}
          >
            <div
              className="indie-panel rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-[#EDE6D6]/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 border-b border-dashed-indie pb-3">
                <h3 className="font-serif italic font-bold text-lg text-[#EDE6D6]">Tạo Playlist Mới</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#A39282] hover:text-[#EDE6D6] p-1.5 rounded-lg hover:bg-[#2E2721] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {createError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 mb-4">
                  {createError}
                </p>
              )}

              <form onSubmit={handleCreatePlaylist}>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Đặt tên playlist..."
                  autoFocus
                  className="w-full bg-[#26211C] border border-[#EDE6D6]/20 text-[#EDE6D6] px-4 py-3 rounded-xl outline-none focus:border-[#D97C54] transition-all font-serif text-sm placeholder-[#8A7B6C] mb-5"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-[#B85C38] hover:bg-[#D97C54] disabled:opacity-50 text-[#EDE6D6] font-mono text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <SpinnerGap size={16} className="animate-spin" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    "Tạo Playlist"
                  )}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
}
