import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Search, Library, Heart, Plus, Music, X, Loader2, Disc3, Mic2 } from "lucide-react";
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

  return (
    <aside className="w-64 flex flex-col gap-3 p-2 h-full select-none z-20">
      {/* Box 1: Brand & Main Navigation */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col gap-4 shadow-lg border border-white/10">
        <div className="flex items-center gap-3 text-white px-1 py-1 group cursor-pointer">
          <img src="/logo.png" alt="JamWave Logo" className="h-11 w-auto max-w-[130px] rounded-xl object-contain shadow-xl shadow-violet-500/40 group-hover:scale-105 transition-transform duration-300 border border-white/20 bg-black/60 p-1" />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              INDIE MUSIC PLATFORM
            </span>
            <p className="text-[10px] font-medium text-zinc-300 leading-tight mt-0.5">
              Where Independent Music <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent font-extrabold italic">Finds Its Wave.</span>
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 mt-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `relative flex items-center gap-4 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${isActive
                ? "text-white bg-white/10 shadow-inner border border-white/10 font-semibold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-violet-500 to-cyan-400 rounded-r-full shadow-[0_0_10px_#a855f7]" />}
                <Home size={20} className={isActive ? "text-violet-400" : ""} />
                <span>Trang chủ</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/search"
            className={({ isActive }) =>
              `relative flex items-center gap-4 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${isActive
                ? "text-white bg-white/10 shadow-inner border border-white/10 font-semibold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-violet-500 to-cyan-400 rounded-r-full shadow-[0_0_10px_#a855f7]" />}
                <Search size={20} className={isActive ? "text-violet-400" : ""} />
                <span>Tìm kiếm</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/albums"
            className={({ isActive }) =>
              `relative flex items-center gap-4 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${isActive
                ? "text-white bg-white/10 shadow-inner border border-white/10 font-semibold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-violet-500 to-cyan-400 rounded-r-full shadow-[0_0_10px_#a855f7]" />}
                <Disc3 size={20} className={isActive ? "text-violet-400" : ""} />
                <span>Album</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/artists"
            className={({ isActive }) =>
              `relative flex items-center gap-4 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${isActive
                ? "text-white bg-white/10 shadow-inner border border-white/10 font-semibold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-violet-500 to-cyan-400 rounded-r-full shadow-[0_0_10px_#a855f7]" />}
                <Mic2 size={20} className={isActive ? "text-violet-400" : ""} />
                <span>Nghệ sĩ</span>
              </>
            )}
          </NavLink>
        </nav>
      </div>

      {/* Box 2: Library & Playlists */}
      <div className="glass-panel rounded-2xl p-4 flex-1 flex flex-col gap-3 overflow-y-auto shadow-lg border border-white/10">
        <div className="flex items-center justify-between text-zinc-400 px-1 py-1">
          <div className="flex items-center gap-2.5 hover:text-white transition-colors cursor-pointer group">
            <Library size={20} className="group-hover:text-violet-400 transition-colors" />
            <span className="font-semibold text-sm tracking-wide">Thư viện</span>
          </div>
          {user && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-all duration-200 active:scale-95"
              title="Tạo playlist mới"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {!user ? (
          <div className="text-center py-6 px-3 bg-white/5 rounded-xl border border-white/5 my-auto">
            <p className="text-xs text-zinc-400 mb-3 font-medium">Đăng nhập để lưu và quản lý thư viện riêng của bạn</p>
            <button
              onClick={() => navigate("/login")}
              className="text-xs font-bold px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white hover:scale-105 transition-all duration-200 shadow-lg shadow-violet-500/25"
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : (
          <nav className="flex flex-col gap-1 mt-1">
            <NavLink
              to="/likes"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? "text-white bg-white/10 font-semibold border border-white/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-purple-500/20">
                <Heart size={16} fill="white" />
              </div>
              <span className="truncate flex-1">Bài hát đã thích</span>
              {likedCount !== null && (
                <span className="text-[11px] font-semibold bg-white/10 px-2 py-0.5 rounded-full text-zinc-400">{likedCount}</span>
              )}
            </NavLink>

            {loading && playlists.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-emerald-400">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : (
              playlists.map((playlist) => (
                <NavLink
                  key={playlist.id}
                  to={`/playlist/${playlist.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? "text-white bg-white/10 font-semibold border border-white/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/5 flex items-center justify-center text-zinc-300 flex-shrink-0">
                    <Music size={16} />
                  </div>
                  <span className="truncate flex-1">{playlist.title}</span>
                  <span className="text-[11px] font-medium text-zinc-500">{playlist.songCount}</span>
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

      {/* Modal tạo playlist dạng Kính mờ (Glassmorphism Modal) */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="glass-panel rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/15 animate-float-slow"
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
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all text-sm placeholder-zinc-500 mb-5"
              />
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/25 active:scale-95 text-sm"
              >
                {creating ? "Đang tạo..." : "Tạo playlist ngay"}
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
