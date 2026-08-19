import { useState } from "react";
import { getArtistPlaceholder } from "../utils/artistPlaceholders";

const GRADIENTS = [
  "from-[#B85C38] to-[#D97C54]",
  "from-[#76876F] to-[#5C6E56]",
  "from-[#D9A036] to-[#E0B35C]",
  "from-[#8C5D3A] to-[#B85C38]",
  "from-[#5C6E56] to-[#76876F]",
  "from-[#3D332A] to-[#594B3E]",
];

const getInitials = (name) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0] || "?").slice(0, 2).toUpperCase();
};

const hash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
};

// Ảnh chân dung nghệ sĩ: ảnh thật -> ảnh nhạc placeholder -> avatar chữ cái + gradient
export default function ArtistAvatar({ name, image, className = "w-12 h-12 rounded-xl text-base" }) {
  // Lưu tên nghệ sĩ có ảnh bị lỗi (tự reset khi đổi nghệ sĩ)
  const [failedName, setFailedName] = useState(null);

  const src = image || getArtistPlaceholder(name);
  const imgFailed = failedName === name && src;

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setFailedName(name)}
        className={`object-cover flex-shrink-0 shadow border border-white/10 ${className}`}
      />
    );
  }

  const gradient = GRADIENTS[hash(name || "") % GRADIENTS.length];
  return (
    <div
      className={`bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-black flex-shrink-0 shadow ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}