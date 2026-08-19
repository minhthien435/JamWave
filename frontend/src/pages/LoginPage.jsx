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
    <div className="fixed inset-0 overflow-y-auto bg-[#181512] text-[#EDE6D6] select-none font-sans">
      <AuthBackground />

      <div className="min-h-full w-full flex flex-col items-center justify-center px-4 py-6 sm:py-10 relative z-10">
        <div className="w-full max-w-md my-auto">
          <div className="indie-panel rounded-3xl p-6 sm:p-8 shadow-2xl border-dashed-indie relative">
            {/* Header Stamp */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B85C38]/15 border border-[#B85C38]/30 text-[#D97C54] font-mono text-[10px] uppercase font-bold tracking-[0.18em] mb-2.5">
                JAMWAVE MUSIC
              </div>
              <h1 className="font-serif italic text-2xl sm:text-3xl font-bold tracking-tight text-[#EDE6D6]">
                Đăng Nhập Tài Khoản
              </h1>
              <p className="font-mono text-xs text-[#A39282] mt-1.5">
                Đăng nhập để lắng nghe playlist và kho nhạc cá nhân
              </p>
            </div>

            {notVerified && (
              <div className="font-mono text-xs text-[#E0B35C] bg-[#E0B35C]/15 border border-[#E0B35C]/30 rounded-xl px-4 py-3 mb-5 shadow-sm">
                ⚠️ Email chưa được xác thực. Kiểm tra hộp thư của bạn hoặc gửi lại email xác thực.
              </div>
            )}

            {(formError || error) && !notVerified && (
              <p className="font-mono text-xs text-red-400 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 mb-5 shadow-sm">
                ⚠️ {formError || error}
              </p>
            )}

            {resendMsg && (
              <p className="font-mono text-xs text-[#76876F] bg-[#76876F]/15 border border-[#76876F]/30 rounded-xl px-4 py-3 mb-5 shadow-sm">
                ✅ {resendMsg}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#EDE6D6] mb-1.5" htmlFor="email">
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
                  placeholder="name@example.com"
                  autoComplete="email"
                  className={`w-full bg-[#26211C] text-[#EDE6D6] px-4 py-3 rounded-xl outline-none border transition-all font-serif text-sm placeholder-[#8A7B6C] ${
                    fieldErrors.email
                      ? "border-red-500/60 focus:border-red-400"
                      : "border-[#EDE6D6]/15 focus:border-[#D97C54]"
                  }`}
                />
                {fieldErrors.email && <p className="font-mono text-xs text-red-400 mt-1 ml-1">{fieldErrors.email}</p>}
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
                className="mt-1 w-full bg-[#B85C38] hover:bg-[#D97C54] active:scale-95 text-[#EDE6D6] font-mono text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl transition-all duration-150 shadow-md border border-[#EDE6D6]/20 disabled:opacity-50"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập ngay"}
              </button>
            </form>

            {notVerified && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-3 w-full font-mono text-xs text-[#E0B35C] hover:text-[#EDE6D6] py-2 rounded-xl border border-[#E0B35C]/30 hover:bg-[#E0B35C]/10 transition-all disabled:opacity-50"
              >
                {resending ? "Đang gửi..." : "Gửi lại email xác thực"}
              </button>
            )}

            {GOOGLE_CLIENT_ID && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <span className="flex-1 h-px bg-[#EDE6D6]/10" />
                  <span className="font-mono text-[10px] font-bold text-[#8A7B6C] uppercase tracking-wider">hoặc</span>
                  <span className="flex-1 h-px bg-[#EDE6D6]/10" />
                </div>
                <GoogleButton clientId={GOOGLE_CLIENT_ID} onCredential={handleGoogle} />
              </>
            )}

            <div className="mt-6 pt-5 border-t border-dashed-indie text-center">
              <p className="font-mono text-xs text-[#A39282]">
                Chưa có tài khoản?{" "}
                <Link to="/register" className="text-[#D97C54] font-bold hover:text-[#EDE6D6] transition-colors">
                  Đăng ký tài khoản mới
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}