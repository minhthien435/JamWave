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
      <div className="fixed inset-0 overflow-y-auto bg-[#181512] text-[#EDE6D6] select-none font-sans">
        <AuthBackground />
        <div className="min-h-full w-full flex flex-col items-center justify-center px-4 py-10 relative z-10">
          <div className="w-full max-w-md my-auto indie-panel rounded-3xl p-8 shadow-2xl border-dashed-indie text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#B85C38] flex items-center justify-center shadow-lg border border-[#EDE6D6]/20 mb-5 text-[#EDE6D6]">
              <EnvelopeSimple size={28} weight="bold" />
            </div>
            <h1 className="font-serif italic text-2xl font-bold tracking-tight mb-2 text-[#EDE6D6]">
              Kiểm tra hộp thư của bạn ✉️
            </h1>
            <p className="font-mono text-xs text-[#A39282] leading-relaxed">
              Chúng tôi đã gửi thư xác thực đến{" "}
              <span className="text-[#D97C54] font-bold">{registeredEmail}</span>.
              <br />
              Bấm vào liên kết trong thư để kích hoạt tài khoản JamWave.
            </p>

            {resendMsg && (
              <p className="font-mono text-xs text-[#76876F] bg-[#76876F]/15 border border-[#76876F]/30 rounded-xl px-4 py-3 my-4 shadow-sm">
                ✅ {resendMsg}
              </p>
            )}

            <button
              onClick={handleResend}
              disabled={resending}
              className="mt-5 w-full font-mono text-xs font-bold uppercase tracking-wider text-[#E0B35C] hover:text-[#EDE6D6] py-3 rounded-xl border border-[#E0B35C]/30 hover:bg-[#E0B35C]/10 transition-all disabled:opacity-50"
            >
              {resending ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerGap size={14} className="animate-spin" /> Đang gửi...
                </span>
              ) : (
                "Gửi lại email xác thực"
              )}
            </button>

            <p className="font-mono text-xs text-[#A39282] mt-5">
              Đã có tài khoản?{" "}
              <Link to="/login" className="text-[#D97C54] font-bold hover:text-[#EDE6D6] transition-colors">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#181512] text-[#EDE6D6] select-none font-sans">
      <AuthBackground />

      <div className="min-h-full w-full flex flex-col items-center justify-center px-4 py-10 relative z-10">
        <div className="w-full max-w-md my-auto">
          <div className="indie-panel rounded-3xl p-6 sm:p-8 shadow-2xl border-dashed-indie relative">
            {/* Header Stamp */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B85C38]/15 border border-[#B85C38]/30 text-[#D97C54] font-mono text-[10px] uppercase font-bold tracking-[0.18em] mb-2.5">
                JAMWAVE MUSIC
              </div>
              <h1 className="font-serif italic text-2xl sm:text-3xl font-bold tracking-tight text-[#EDE6D6]">
                Đăng Ký Tài Khoản
              </h1>
              <p className="font-mono text-xs text-[#A39282] mt-1.5">
                Tạo tài khoản và lưu giữ gu âm nhạc riêng trên JamWave
              </p>
            </div>

            {(formError || error) && (
              <p className="font-mono text-xs text-red-400 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 mb-5 shadow-sm">
                ⚠️ {formError || error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#EDE6D6] mb-1.5" htmlFor="name">
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
                  className={`w-full bg-[#26211C] text-[#EDE6D6] px-4 py-3 rounded-xl outline-none border transition-all font-serif text-sm placeholder-[#8A7B6C] ${
                    fieldErrors.name
                      ? "border-red-500/60 focus:border-red-400"
                      : "border-[#EDE6D6]/15 focus:border-[#D97C54]"
                  }`}
                />
                {fieldErrors.name && <p className="font-mono text-xs text-red-400 mt-1 ml-1">{fieldErrors.name}</p>}
              </div>

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
                  placeholder="name@mixtape.com"
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
                className="mt-1 w-full bg-[#B85C38] hover:bg-[#D97C54] active:scale-95 text-[#EDE6D6] font-mono text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl transition-all duration-150 shadow-md border border-[#EDE6D6]/20 disabled:opacity-50"
              >
                {loading ? "Đang tạo tài khoản..." : "Đăng ký thành viên"}
              </button>
            </form>

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
                Đã có tài khoản?{" "}
                <Link to="/login" className="text-[#D97C54] font-bold hover:text-[#EDE6D6] transition-colors">
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