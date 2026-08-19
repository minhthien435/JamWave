import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

export default function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  error,
  label,
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full bg-[#14141c] text-white px-4 py-3 pr-11 rounded-2xl outline-none border transition-all text-sm placeholder-zinc-500 font-medium ${
            error
              ? "border-rose-500/60 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20"
              : "border-white/10 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
        >
          {show ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="text-xs font-medium text-rose-400 mt-1 ml-1">{error}</p>}
    </div>
  );
}