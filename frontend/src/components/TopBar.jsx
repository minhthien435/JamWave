import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, User, Shield } from "lucide-react";
import { useAuthStore } from "../useAuthStore";

export default function TopBar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/");
  };

  const avatarText = user ? (user.name || user.email || "?").charAt(0).toUpperCase() : "?";

  return (
    <header className="sticky top-0 z-30 glass-header px-6 py-3.5 flex items-center justify-between border-b border-white/10 rounded-t-2xl">
      {/* Nút Back / Forward */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-zinc-300 flex items-center justify-center hover:text-white hover:bg-white/15 transition-all duration-200 active:scale-95 shadow-md"
          title="Quay lại"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => navigate(1)}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-zinc-300 flex items-center justify-center hover:text-white hover:bg-white/15 transition-all duration-200 active:scale-95 shadow-md"
          title="Tiến tới"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Hành động tài khoản / Khám phá */}
      <div className="flex items-center gap-3 relative">
        <button className="hidden sm:block text-xs font-bold px-4 py-2 rounded-full border border-white/15 bg-white/5 text-zinc-200 hover:text-white hover:bg-white/10 transition-all duration-200 backdrop-blur-md active:scale-95 shadow-sm">
          Khám phá Premium
        </button>

        {user ? (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className={`w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 via-purple-500 to-cyan-400 text-white font-extrabold text-sm flex items-center justify-center hover:scale-105 transition-all duration-200 border-2 shadow-lg shadow-violet-500/30 ${menuOpen ? "border-white ring-4 ring-violet-500/40" : "border-violet-300/40"
                }`}
              title={user.name}
            >
              {avatarText}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 glass-panel rounded-2xl shadow-2xl w-52 py-2 border border-white/15 animate-float-slow z-50">
                <div className="px-4 py-2.5 border-b border-white/10 mb-1">
                  <p className="text-sm font-bold truncate text-white">{user.name}</p>
                  <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                </div>
                {user.role === "ADMIN" && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/admin");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-300 hover:text-amber-200 hover:bg-white/5 transition-all duration-200 font-medium"
                  >
                    <Shield size={16} />
                    Trung tâm quản trị
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-all duration-200 font-medium"
                >
                  <User size={16} />
                  Hồ sơ cá nhân
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:text-red-400 hover:bg-white/5 transition-all duration-200 font-medium"
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="text-xs font-bold px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white hover:scale-105 transition-all duration-200 shadow-lg shadow-violet-500/25"
          >
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
}
