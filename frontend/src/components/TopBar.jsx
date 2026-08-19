import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CaretLeft, CaretRight, SignOut, User, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { useAuthStore } from "../useAuthStore";
import { resolveImageUrl } from "../utils/imageUrl";

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
    <header className="sticky top-0 z-30 bg-[#201A16]/95 backdrop-blur-md px-6 py-3.5 flex items-center justify-between border-b border-dashed-indie rounded-t-2xl font-sans select-none">
      {/* Nút Back / Forward Cổ Điển */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg bg-[#26211C] border border-[#EDE6D6]/15 text-[#EDE6D6] flex items-center justify-center hover:text-[#D97C54] hover:bg-[#2E2721] hover:border-[#D97C54]/30 transition-all duration-150 active:scale-95 shadow-sm"
          title="Quay lại"
        >
          <CaretLeft size={16} weight="bold" />
        </button>
        <button
          onClick={() => navigate(1)}
          className="w-8 h-8 rounded-lg bg-[#26211C] border border-[#EDE6D6]/15 text-[#EDE6D6] flex items-center justify-center hover:text-[#D97C54] hover:bg-[#2E2721] hover:border-[#D97C54]/30 transition-all duration-150 active:scale-95 shadow-sm"
          title="Tiến tới"
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>

      {/* Hành động tài khoản dạng Stamp */}
      <div className="flex items-center gap-3 relative">
        {user ? (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className={`w-9 h-9 rounded-xl bg-[#B85C38] text-[#EDE6D6] font-mono font-bold text-sm flex items-center justify-center hover:bg-[#D97C54] transition-all duration-200 border border-[#EDE6D6]/20 shadow-md ${
                menuOpen ? "ring-2 ring-[#D97C54]" : ""
              }`}
              title={user.name}
            >
              {user.avatarUrl ? (
                <img src={resolveImageUrl(user.avatarUrl)} alt={user.name} className="w-full h-full rounded-xl object-cover" />
              ) : (
                avatarText
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 indie-panel rounded-2xl shadow-2xl w-52 py-2 border border-[#EDE6D6]/20 z-50 font-sans">
                <div className="px-4 py-2.5 border-b border-dashed-indie mb-1">
                  <p className="font-serif italic font-bold text-sm truncate text-[#EDE6D6]">{user.name}</p>
                  <p className="font-mono text-[10px] text-[#A39282] truncate">{user.email}</p>
                </div>
                {user.role === "ADMIN" && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/admin");
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#E0B35C] hover:text-[#EDE6D6] hover:bg-[#2E2721] transition-all font-mono"
                  >
                    <ShieldCheck size={16} weight="duotone" />
                    Quản Trị Hệ Thống
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#EDE6D6] hover:text-[#D97C54] hover:bg-[#2E2721] transition-all font-mono"
                >
                  <User size={16} weight="duotone" />
                  Hồ Sơ Cá Nhân
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#A39282] hover:text-red-400 hover:bg-[#2E2721] transition-all font-mono"
                >
                  <SignOut size={16} weight="duotone" />
                  Đăng Xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="font-mono text-[11px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] transition-all shadow-md active:scale-95"
          >
            Đăng Nhập
          </button>
        )}
      </div>
    </header>
  );
}
