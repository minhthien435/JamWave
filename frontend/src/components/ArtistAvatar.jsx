const GRADIENTS = [
  "from-violet-600 to-cyan-400",
  "from-fuchsia-600 to-violet-400",
  "from-cyan-500 to-blue-500",
  "from-purple-600 to-pink-500",
  "from-emerald-500 to-cyan-400",
  "from-indigo-600 to-fuchsia-500",
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

// Ảnh chân dung nghệ sĩ; không có ảnh -> avatar chữ cái đầu + gradient
export default function ArtistAvatar({ name, image, className = "w-12 h-12 rounded-xl text-base" }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        loading="lazy"
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