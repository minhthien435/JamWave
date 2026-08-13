import { memo } from "react";

const FLOATING_ALBUMS = [
  {
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&auto=format&fit=crop&q=80",
    title: "Cyber Waves",
    artist: "Alexander Blu",
    pos: "top-16 left-10 md:left-24",
    anim: "animate-album-float-1",
  },
  {
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
    title: "Synth Horizon",
    artist: "Project Divinity",
    pos: "top-20 right-10 md:right-24",
    anim: "animate-album-float-2",
  },
  {
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80",
    title: "Midnight Lofi",
    artist: "Manuzik",
    pos: "bottom-24 left-12 md:left-28",
    anim: "animate-album-float-2",
  },
  {
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80",
    title: "Indie Reverie",
    artist: "Tryad",
    pos: "bottom-28 right-12 md:right-28",
    anim: "animate-album-float-1",
  },
];

const AuthBackground = memo(() => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* 1. Slow Moving Mesh Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#06050e] via-[#160d2e] to-[#041220] animate-gradient-shift opacity-95" />

      {/* 2. Ambient Video Loop Layer */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-screen filter saturate-150 blur-[1px]"
      >
        <source src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-blue-and-purple-waves-41549-large.mp4" type="video/mp4" />
      </video>

      {/* 3. Glowing Motion Orbs */}
      <div className="absolute top-1/4 -left-32 w-[550px] h-[550px] bg-violet-600/30 rounded-full blur-[150px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-32 w-[550px] h-[550px] bg-cyan-500/25 rounded-full blur-[150px] animate-pulse-glow" style={{ animationDelay: "3s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-900/20 rounded-full blur-[170px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />

      {/* 4. Floating Light Particles */}
      <div className="absolute inset-0">
        <span className="absolute top-3/4 left-1/5 w-2 h-2 rounded-full bg-cyan-400 blur-[1px] animate-particle-1 shadow-[0_0_12px_#38bdf8]" />
        <span className="absolute top-2/3 left-2/3 w-3 h-3 rounded-full bg-violet-400 blur-[1px] animate-particle-2 shadow-[0_0_15px_#c084fc]" />
        <span className="absolute top-1/2 left-4/5 w-2 h-2 rounded-full bg-purple-300 blur-[1px] animate-particle-3 shadow-[0_0_10px_#e9d5ff]" />
        <span className="absolute top-4/5 left-1/3 w-2.5 h-2.5 rounded-full bg-cyan-300 blur-[1px] animate-particle-2 shadow-[0_0_12px_#38bdf8]" />
        <span className="absolute top-1/3 left-1/4 w-1.5 h-1.5 rounded-full bg-violet-300 blur-[1px] animate-particle-1 shadow-[0_0_8px_#c084fc]" />
      </div>

      {/* 5. Floating Abstract Album Artwork Cards */}
      <div className="hidden lg:block absolute inset-0">
        {FLOATING_ALBUMS.map((item, idx) => (
          <div
            key={idx}
            className={`absolute ${item.pos} ${item.anim} transition-all duration-700 opacity-60 hover:opacity-100 scale-90 hover:scale-100`}
          >
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 shadow-2xl shadow-violet-950/60 max-w-[200px]">
              <img src={item.cover} alt={item.title} className="w-11 h-11 rounded-xl object-cover shadow-md" />
              <div className="truncate">
                <p className="text-xs font-extrabold text-white truncate">{item.title}</p>
                <p className="text-[10px] font-semibold text-cyan-300 truncate">{item.artist}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 6. Jumping Audio Waveform Equalizer at Bottom */}
      <div className="absolute bottom-0 inset-x-0 h-16 flex items-end justify-center gap-1.5 opacity-40 px-6 pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className={`w-1 rounded-t-full bg-gradient-to-t from-violet-600 via-purple-500 to-cyan-400 equalizer-bar-${(i % 4) + 1}`}
            style={{ height: `${8 + (i % 5) * 4}px` }}
          />
        ))}
      </div>
    </div>
  );
});

AuthBackground.displayName = "AuthBackground";
export default AuthBackground;
