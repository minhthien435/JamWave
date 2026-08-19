import { useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../useAuthStore";
import AuthBackground from "../components/AuthBackground";
import PasswordInput from "../components/PasswordInput";
import CaptchaWidget from "../components/CaptchaWidget";
import GoogleButton from "../components/GoogleButton";
import { resendVerification } from "../api/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, loading, error } = useAuthStore();
  const captchaRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [notVerified, setNotVerified] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [resending, setResending] = useState(false);

  const validate = () => {
    const errors = {};
    if (!email.trim()) errors.email = "Vui lòng nhập email";
    else if (!EMAIL_REGEX.test(email.trim())) errors.email = "Email không hợp lệ";
    if (!password) errors.password = "Vui lòng nhập mật khẩu";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setNotVerified(false);
    setResendMsg("");

    if (!validate()) return;
    if (!captchaToken) {
      setFormError("Vui lòng hoàn thành xác thực captcha");
      return;
    }

    try {
      await login(email.trim(), password, captchaToken);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setCaptchaToken(null);
      captchaRef.current?.reset();
      if (err.message && err.message.includes("email_not_verified")) {
        setNotVerified(true);
        setFormError("");
      } else {
        setFormError(err.message);
      }
    }
  };

  const handleGoogle = async (credential) => {
    setFormError("");
    setNotVerified(false);
    try {
      await googleLogin(credential);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      setFieldErrors((prev) => ({ ...prev, email: "Nhập email hợp lệ để gửi lại" }));
      return;
    }
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

      <div className="min-h-full w-full flex flex-col items-center justify-center px-4 py-6 sm:py-10 relative z-10">
        <div className="w-full max-w-md my-auto">
          <div className="bg-[#14141c]/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
            <h1 className="text-2xl font-black tracking-tight mb-5 text-center text-white">Đăng nhập tài khoản</h1>

            {notVerified && (
              <div className="text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-400/30 rounded-xl px-4 py-3 mb-5 shadow-sm">
                ⚠️ Email chưa được xác thực. Kiểm tra hộp thư của bạn hoặc gửi lại email xác thực.
              </div>
            )}

            {(formError || error) && !notVerified && (
              <p className="text-xs font-semibold text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl px-4 py-3 mb-5 shadow-sm">
                ⚠️ {formError || error}
              </p>
            )}

            {resendMsg && (
              <p className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-4 py-3 mb-5 shadow-sm">
                ✅ {resendMsg}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5" htmlFor="email">
                  Địa chỉ Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  onBlur={() => {
                    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
                      setFieldErrors((prev) => ({ ...prev, email: "Email không hợp lệ" }));
                    }
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`w-full bg-[#14141c] text-white px-4 py-3 rounded-2xl outline-none border transition-all text-sm placeholder-zinc-500 font-medium ${
                    fieldErrors.email
                      ? "border-rose-500/60 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20"
                      : "border-white/10 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                  }`}
                />
                {fieldErrors.email && <p className="text-xs font-medium text-rose-400 mt-1 ml-1">{fieldErrors.email}</p>}
              </div>

              <PasswordInput
                id="password"
                label="Mật khẩu"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                error={fieldErrors.password}
              />

              {TURNSTILE_SITE_KEY && (
                <CaptchaWidget
                  ref={captchaRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onToken={(tok) => {
                    setCaptchaToken(tok);
                    if (tok) setFormError("");
                  }}
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold py-3.5 rounded-2xl transition-all duration-150 shadow-md shadow-violet-950/60 disabled:opacity-50"
              >
                {loading ? "Đang kết nối..." : "Đăng nhập ngay"}
              </button>
            </form>

            {notVerified && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-3 w-full text-xs font-semibold text-amber-300 hover:text-amber-200 py-2 rounded-xl border border-amber-400/30 hover:bg-amber-500/10 transition-all disabled:opacity-50"
              >
                {resending ? "Đang gửi..." : "Gửi lại email xác thực"}
              </button>
            )}

            {GOOGLE_CLIENT_ID && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <span className="flex-1 h-px bg-white/10" />
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">hoặc</span>
                  <span className="flex-1 h-px bg-white/10" />
                </div>
                <GoogleButton clientId={GOOGLE_CLIENT_ID} onCredential={handleGoogle} />
              </>
            )}

            <div className="mt-6 pt-5 border-t border-white/10 text-center">
              <p className="text-sm text-zinc-400 font-medium">
                Chưa có tài khoản?{" "}
                <Link to="/register" className="text-violet-400 font-semibold hover:text-violet-300 hover:underline transition-colors">
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}