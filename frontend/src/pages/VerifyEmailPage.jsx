import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../useAuthStore";
import AuthBackground from "../components/AuthBackground";
import { resendVerification } from "../api/auth";
import { SpinnerGap, CheckCircle, XCircle, EnvelopeSimple } from "@phosphor-icons/react";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const verifyEmail = useAuthStore((s) => s.verifyEmail);

  const [status, setStatus] = useState(() => (token ? "verifying" : "error"));
  const [message, setMessage] = useState(
    () => (token ? "" : "Thiếu token xác thực trong link. Vui lòng kiểm tra lại email.")
  );
  const [resendMsg, setResendMsg] = useState("");
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        setStatus("success");
        setTimeout(() => navigate("/", { replace: true }), 1800);
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(err.message || "Link xác thực không hợp lệ hoặc đã hết hạn.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, verifyEmail, navigate]);

  const handleResend = async () => {
    if (!email.trim()) return;
    setResending(true);
    setResendMsg("");
    try {
      const data = await resendVerification(email.trim());
      setResendMsg(data.message || "Đã gửi lại email xác thực");
    } catch (err) {
      setResendMsg(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#0d0d12] text-white select-none">
      <AuthBackground />

      <div className="min-h-full w-full flex flex-col items-center justify-center px-4 py-10 relative z-10">
        <div className="w-full max-w-md my-auto bg-[#14141c]/95 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/10 text-center">
          {status === "verifying" && (
            <>
              <SpinnerGap size={40} className="animate-spin text-violet-400 mx-auto mb-5" />
              <h1 className="text-2xl font-black tracking-tight mb-2 text-white">Đang xác thực email...</h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-medium">Vui lòng chờ trong giây lát.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle size={48} weight="fill" className="text-emerald-400 mx-auto mb-5" />
              <h1 className="text-2xl font-black tracking-tight mb-2 text-emerald-300">Xác thực thành công! 🎉</h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-medium">Đang đưa bạn vào không gian âm nhạc JamWave...</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle size={48} weight="fill" className="text-rose-400 mx-auto mb-5" />
              <h1 className="text-2xl font-black tracking-tight mb-2 text-rose-300">Xác thực thất bại</h1>
              <p className="text-xs sm:text-sm text-zinc-400 mb-5 font-medium">{message}</p>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email của bạn để gửi lại"
                className="w-full bg-[#14141c] text-white px-4 py-3 rounded-2xl outline-none border border-white/10 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all text-sm placeholder-zinc-500 font-medium mb-3"
              />

              {resendMsg && (
                <p className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-4 py-3 mb-3 shadow-sm">
                  ✅ {resendMsg}
                </p>
              )}

              <button
                onClick={handleResend}
                disabled={resending || !email.trim()}
                className="w-full text-xs font-semibold text-amber-300 hover:text-amber-200 py-3 rounded-xl border border-amber-400/30 hover:bg-amber-500/10 transition-all disabled:opacity-50 mb-3"
              >
                {resending ? "Đang gửi..." : "Gửi lại email xác thực"}
              </button>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-violet-400 font-semibold hover:underline"
              >
                <EnvelopeSimple size={16} /> Đi tới đăng nhập
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}