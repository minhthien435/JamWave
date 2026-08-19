import { useEffect, useState } from "react";
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

  // Tải playlists khi đăng nhập, xóa khi đăng xuất
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
    { to: "/", label: "Trang chủ", icon: House, end: true },
    { to: "/search", label: "Tìm kiếm", icon: MagnifyingGlass },
    { to: "/browse", label: "Khám phá", icon: Compass },
    { to: "/charts", label: "Bảng xếp hạng", icon: TrendUp },
    { to: "/albums", label: "Album", icon: Disc },
    { to: "/artists", label: "Nghệ sĩ", icon: MicrophoneStage },
    { to: "/docs", label: "Hướng dẫn", icon: Books },
  ];

  return (
    <aside className="w-64 flex flex-col gap-3 p-2 h-full select-none z-20">
      {/* Box 1: Brand & Main Navigation */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3.5 shadow-lg border border-white/10">
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-3 px-1 py-1 group cursor-pointer"
        >
          <img
            src="/logo.png"
            alt="JamWave"
            className="h-10 w-auto rounded-xl object-contain shadow-lg shadow-violet-950/50 group-hover:scale-105 transition-transform duration-200 border border-white/10 bg-black/40 p-1"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-base font-black tracking-tight text-white group-hover:text-violet-300 transition-colors">
              JamWave
            </span>
            <span className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase">
              Indie Music
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 mt-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-white bg-white/10 font-semibold border border-white/10 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-violet-500 rounded-r-full shadow-[0_0_8px_#8b5cf6]" />
                  )}
                  <Icon
                    size={20}
                    weight={isActive ? "fill" : "regular"}
                    className={isActive ? "text-violet-400" : "text-zinc-400"}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Box 2: Library & Playlists */}
      <div className="glass-panel rounded-2xl p-4 pb-28 flex-1 flex flex-col gap-3 overflow-y-auto shadow-lg border border-white/10">
        <div className="flex items-center justify-between text-zinc-400 px-1 py-0.5">
          <div className="flex items-center gap-2.5 text-zinc-200">
            <Books size={20} weight="duotone" className="text-violet-400" />
            <span className="font-bold text-sm tracking-tight text-white">Thư viện</span>
          </div>
          {user && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all active:scale-95"
              title="Tạo playlist mới"
            >
              <Plus size={18} weight="bold" />
            </button>
          )}
        </div>

        {!user ? (
          <div className="text-center py-6 px-3 bg-white/5 rounded-xl border border-white/5 my-auto">
            <p className="text-xs text-zinc-400 mb-3 font-medium leading-relaxed">
              Đăng nhập để lưu và quản lý bộ sưu tập nhạc của riêng bạn
            </p>
            <button
              onClick={() => navigate("/login")}
              className="text-xs font-bold px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-md shadow-violet-950/50 active:scale-95"
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : (
          <nav className="flex flex-col gap-1 mt-1">
            <NavLink
              to="/likes"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-white bg-white/10 font-semibold border border-white/10"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              {() => (
                <>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700 flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-rose-950/40">
                    <Heart size={16} weight="fill" />
                  </div>
                  <span className="truncate flex-1">Bài hát đã thích</span>
                  {likedCount !== null && (
                    <span className="text-[11px] font-semibold tabular-nums bg-rose-500/15 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/20">
                      {likedCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>

            {loading && playlists.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-violet-400">
                <SpinnerGap size={20} className="animate-spin" />
              </div>
            ) : (
              playlists.map((playlist) => (
                <NavLink
                  key={playlist.id}
                  to={`/playlist/${playlist.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-white bg-white/10 font-semibold border border-white/10"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 flex-shrink-0">
                    <MusicNotes size={16} weight="duotone" />
                  </div>
                  <span className="truncate flex-1">{playlist.title}</span>
                  <span className="text-[11px] font-medium tabular-nums text-zinc-500">
                    {playlist.songCount}
                  </span>
                </NavLink>
              ))
            )}

            {!loading && playlists.length === 0 && (
              <p className="text-xs text-zinc-500 px-3 py-3 text-center bg-white/5 rounded-xl border border-white/5 mt-2">
                Chưa có playlist nào. Nhấn + để tạo.
              </p>
            )}
          </nav>
        )}
      </div>

      {/* Modal tạo playlist */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-200"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="glass-panel rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-white">Tạo playlist mới</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
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
                placeholder="Nhập tên playlist..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-sm placeholder-zinc-500 mb-5"
              />
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-violet-950/50 active:scale-95 text-sm flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <SpinnerGap size={18} className="animate-spin" />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  "Tạo playlist ngay"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
