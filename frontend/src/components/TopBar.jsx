import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CaretLeft, CaretRight, SignOut, User, ShieldCheck } from "@phosphor-icons/react";
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
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-300 flex items-center justify-center hover:text-white hover:bg-white/15 transition-all duration-150 active:scale-95 shadow-sm"
          title="Quay lại"
        >
          <CaretLeft size={18} weight="bold" />
        </button>
        <button
          onClick={() => navigate(1)}
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-300 flex items-center justify-center hover:text-white hover:bg-white/15 transition-all duration-150 active:scale-95 shadow-sm"
          title="Tiến tới"
        >
          <CaretRight size={18} weight="bold" />
        </button>
      </div>

      {/* Hành động tài khoản */}
      <div className="flex items-center gap-3 relative">
        {user ? (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className={`w-9 h-9 rounded-full bg-violet-600 text-white font-black text-sm flex items-center justify-center hover:scale-105 transition-all duration-200 border border-white/20 shadow-md shadow-violet-950/60 ${
                menuOpen ? "ring-2 ring-violet-400" : ""
              }`}
              title={user.name}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                avatarText
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 glass-panel rounded-2xl shadow-2xl w-52 py-2 border border-white/15 z-50">
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
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-amber-300 hover:text-amber-200 hover:bg-white/5 transition-all duration-150 font-medium"
                  >
                    <ShieldCheck size={18} weight="duotone" />
                    Quản trị hệ thống
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-all duration-150 font-medium"
                >
                  <User size={18} weight="duotone" />
                  Hồ sơ cá nhân
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:text-rose-400 hover:bg-white/5 transition-all duration-150 font-medium"
                >
                  <SignOut size={18} weight="duotone" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="text-xs font-bold px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-md shadow-violet-950/50 active:scale-95"
          >
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
}
