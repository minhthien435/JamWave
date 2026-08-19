import { memo } from "react";
import { CassetteTape } from "@phosphor-icons/react";

const FLOATING_POLAROIDS = [
  {
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&auto=format&fit=crop&q=80",
    title: "Cyber Waves",
    artist: "Alexander Blu",
    pos: "top-14 left-8 md:left-20",
    tilt: "-rotate-3",
  },
  {
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
    title: "Synth Horizon",
    artist: "Project Divinity",
    pos: "top-16 right-8 md:right-20",
    tilt: "rotate-2",
  },
  {
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80",
    title: "Midnight Lofi",
    artist: "Manuzik",
    pos: "bottom-16 left-10 md:left-24",
    tilt: "rotate-3",
  },
  {
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80",
    title: "Indie Reverie",
    artist: "Tryad",
    pos: "bottom-20 right-10 md:right-24",
    tilt: "-rotate-2",
  },
];

const AuthBackground = memo(() => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* 1. Vintage Dark Desk Background */}
      <div className="absolute inset-0 bg-[#181512]" />

      {/* 2. Warm Ambient Desk Lamp Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#B85C38]/12 rounded-full blur-[140px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#D4A24C]/10 rounded-full blur-[140px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#76876F]/8 rounded-full blur-[160px]" />

      {/* 3. Floating Polaroids with Washi Tape */}
      <div className="hidden lg:block absolute inset-0">
        {FLOATING_POLAROIDS.map((item, idx) => (
          <div
            key={idx}
            className={`absolute ${item.pos} ${item.tilt} transition-all duration-700 opacity-60 hover:opacity-100 scale-90 hover:scale-100`}
          >
            <div className="polaroid-frame rounded-lg p-2 max-w-[170px] relative">
              <div className="washi-tape absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 rounded-sm rotate-2 z-10" />
              <img src={item.cover} alt={item.title} className="w-full aspect-square rounded object-cover shadow-inner mb-1.5" />
              <p className="font-serif italic font-semibold text-[11px] truncate text-[#EDE6D6] text-center">{item.title}</p>
              <p className="font-mono text-[9px] text-[#A39282] truncate text-center">{item.artist}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Decorative Cassette Reel Outline at Bottom */}
      <div className="absolute -bottom-10 -right-10 w-64 h-64 border border-[#EDE6D6]/5 rounded-full flex items-center justify-center pointer-events-none opacity-40">
        <div className="w-48 h-48 border border-[#EDE6D6]/5 rounded-full reel-spinning" />
      </div>
      <div className="absolute -top-10 -left-10 w-64 h-64 border border-[#EDE6D6]/5 rounded-full flex items-center justify-center pointer-events-none opacity-40">
        <div className="w-48 h-48 border border-[#EDE6D6]/5 rounded-full reel-spinning" />
      </div>
    </div>
  );
});

AuthBackground.displayName = "AuthBackground";
export default AuthBackground;
