import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../useAuthStore";
import AuthBackground from "../components/AuthBackground";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!email || !password) {
      setFormError("Vui lòng điền đầy đủ email và mật khẩu");
      return;
    }

    try {
      await login(email.trim(), password);
      // Quay lại trang trước khi bị chuyển đến login (nếu có)
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070b] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden select-none">
      {/* 5-Element Motion & Video Loop Background */}
      <AuthBackground />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center justify-center gap-2 mb-8">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 opacity-60 blur-md group-hover:opacity-100 transition duration-500" />
            <img src="/logo.png" alt="JamWave Logo" className="relative h-16 w-auto rounded-2xl object-contain shadow-2xl border border-white/20 bg-black/70 p-2" />
          </div>
          <p className="text-xs font-semibold text-zinc-300 mt-3 text-center">
            Where Independent Music <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent font-extrabold italic">Finds Its Wave.</span>
          </p>
        </div>

        {/* Glassmorphic Obsidian Form Card */}
        <div className="bg-[#12101a]/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-violet-500/30">
          <h1 className="text-2xl font-black tracking-tight mb-6 text-center text-gradient-emerald">Đăng nhập tài khoản</h1>

          {(formError || error) && (
            <p className="text-xs font-bold text-red-300 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 mb-5 shadow-sm">
              ⚠️ {formError || error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-violet-300 mb-2" htmlFor="email">
                Địa chỉ Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-[#181428] text-white px-4 py-3.5 rounded-2xl outline-none border border-violet-500/30 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all text-sm placeholder-zinc-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-violet-300 mb-2" htmlFor="password">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-[#181428] text-white px-4 py-3.5 rounded-2xl outline-none border border-violet-500/30 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all text-sm placeholder-zinc-500 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-400 hover:scale-[1.02] active:scale-95 text-white font-extrabold py-3.5 rounded-2xl transition-all duration-200 shadow-lg shadow-violet-500/35 border border-white/20 disabled:opacity-50"
            >
              {loading ? "Đang kết nối..." : "Đăng nhập ngay"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-400 mt-6 font-medium">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="text-cyan-300 font-bold hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
