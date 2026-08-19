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
        <label className="block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#EDE6D6] mb-1.5" htmlFor={id}>
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
          className={`w-full bg-[#26211C] text-[#EDE6D6] px-4 py-3 pr-11 rounded-xl outline-none border transition-all font-serif text-sm placeholder-[#8A7B6C] ${
            error
              ? "border-red-500/60 focus:border-red-400"
              : "border-[#EDE6D6]/15 focus:border-[#D97C54]"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A39282] hover:text-[#EDE6D6] transition-colors p-1"
        >
          {show ? <EyeSlash size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <p className="font-mono text-xs text-red-400 mt-1 ml-1">{error}</p>}
    </div>
  );
}