import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../useAuthStore";
import AuthBackground from "../components/AuthBackground";
import PasswordInput from "../components/PasswordInput";
import CaptchaWidget from "../components/CaptchaWidget";
import GoogleButton from "../components/GoogleButton";
import { resendVerification } from "../api/auth";
import { EnvelopeSimple, SpinnerGap } from "@phosphor-icons/react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, googleLogin, loading, error } = useAuthStore();
  const captchaRef = useRef(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [registeredEmail, setRegisteredEmail] = useState(null);
  const [resendMsg, setResendMsg] = useState("");
  const [resending, setResending] = useState(false);

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = "Vui lòng nhập tên";
    else if (name.trim().length < 2) errors.name = "Tên phải có ít nhất 2 ký tự";
    if (!email.trim()) errors.email = "Vui lòng nhập email";
    else if (!EMAIL_REGEX.test(email.trim())) errors.email = "Email không hợp lệ";
    if (!password) errors.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 6) errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    if (!confirmPassword) errors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    else if (password !== confirmPassword) errors.confirmPassword = "Mật khẩu xác nhận không khớp";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!validate()) return;
    if (!captchaToken) {
      setFormError("Vui lòng hoàn thành xác thực captcha");
      return;
    }

    try {
      await register(name.trim(), email.trim(), password, confirmPassword, captchaToken);
      setRegisteredEmail(email.trim());
    } catch (err) {
      setCaptchaToken(null);
      captchaRef.current?.reset();
      setFormError(err.message);
    }
  };

  const handleGoogle = async (credential) => {
    setFormError("");
    try {
      await googleLogin(credential);
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg("");
    try {
      const data = await resendVerification(registeredEmail);
      setResendMsg(data.message || "Đã gửi lại email xác thực");
    } catch (err) {
      setResendMsg(err.message);
    } finally {
      setResending(false);
    }
  };

  // Màn hình "kiểm tra email" sau khi đăng ký thành công
  if (registeredEmail) {
    return (
      <div className="fixed inset-0 overflow-y-auto bg-[#0d0d12] text-white select-none">
        <AuthBackground />
        <div className="min-h-full w-full flex flex-col items-center justify-center px-4 py-10 relative z-10">
          <div className="w-full max-w-md my-auto bg-[#14141c]/95 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-950/60 mb-5 text-white">
              <EnvelopeSimple size={28} weight="bold" />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2 text-white">Kiểm tra email của bạn 📧</h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-medium">
              Chúng tôi đã gửi link xác thực đến{" "}
              <span className="text-violet-300 font-bold">{registeredEmail}</span>.
              <br />
              Bấm vào link trong email để kích hoạt tài khoản của bạn.
            </p>

            {resendMsg && (
              <p className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-4 py-3 my-4 shadow-sm">
                ✅ {resendMsg}
              </p>
            )}

            <button
              onClick={handleResend}
              disabled={resending}
              className="mt-5 w-full text-xs font-semibold text-amber-300 hover:text-amber-200 py-3 rounded-xl border border-amber-400/30 hover:bg-amber-500/10 transition-all disabled:opacity-50"
            >
              {resending ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerGap size={14} className="animate-spin" /> Đang gửi...
                </span>
              ) : (
                "Gửi lại email xác thực"
              )}
            </button>

            <p className="text-center text-sm text-zinc-400 mt-5 font-medium">
              Đã có tài khoản?{" "}
              <Link to="/login" className="text-violet-400 font-semibold hover:text-violet-300 hover:underline">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#0d0d12] text-white select-none">
      <AuthBackground />

      <div className="min-h-full w-full flex flex-col items-center justify-center px-4 py-10 relative z-10">
        <div className="w-full max-w-md my-auto">
          <div className="bg-[#14141c]/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
            <h1 className="text-2xl font-black tracking-tight mb-5 text-center text-white">Đăng ký tài khoản</h1>

            {(formError || error) && (
              <p className="text-xs font-semibold text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl px-4 py-3 mb-5 shadow-sm">
                ⚠️ {formError || error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5" htmlFor="name">
                  Tên hiển thị
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  onBlur={() => {
                    if (name.trim() && name.trim().length < 2) {
                      setFieldErrors((prev) => ({ ...prev, name: "Tên phải có ít nhất 2 ký tự" }));
                    }
                  }}
                  placeholder="Tên của bạn"
                  autoComplete="name"
                  className={`w-full bg-[#14141c] text-white px-4 py-3 rounded-2xl outline-none border transition-all text-sm placeholder-zinc-500 font-medium ${
                    fieldErrors.name
                      ? "border-rose-500/60 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20"
                      : "border-white/10 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                  }`}
                />
                {fieldErrors.name && <p className="text-xs font-medium text-rose-400 mt-1 ml-1">{fieldErrors.name}</p>}
              </div>

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
                  if (confirmPassword && v !== confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "Mật khẩu xác nhận không khớp" }));
                  } else if (confirmPassword && v === confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }
                }}
                placeholder="Ít nhất 6 ký tự"
                autoComplete="new-password"
                error={fieldErrors.password}
              />

              <PasswordInput
                id="confirmPassword"
                label="Xác nhận mật khẩu"
                value={confirmPassword}
                onChange={(v) => {
                  setConfirmPassword(v);
                  if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                onBlur={() => {
                  if (confirmPassword && confirmPassword !== password) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "Mật khẩu xác nhận không khớp" }));
                  }
                }}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                error={fieldErrors.confirmPassword}
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
                {loading ? "Đang khởi tạo..." : "Đăng ký ngay"}
              </button>
            </form>

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
                Đã có tài khoản?{" "}
                <Link to="/login" className="text-violet-400 font-semibold hover:text-violet-300 hover:underline transition-colors">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}