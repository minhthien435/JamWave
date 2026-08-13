import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import PlayerBar from "./PlayerBar";
import ChatBox from "./ChatBox";

export default function MainLayout() {
  return (
    <div className="relative flex h-screen bg-[#070709] text-white overflow-hidden font-sans">
      {/* Dynamic Ambient Background Glow Blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-violet-600/20 blur-[130px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-cyan-500/20 blur-[150px] pointer-events-none animate-pulse-glow" style={{ animationDelay: "2s" }} />
      <div className="absolute top-[30%] left-[40%] w-[35vw] h-[35vw] rounded-full bg-fuchsia-600/15 blur-[160px] pointer-events-none animate-pulse-glow" style={{ animationDelay: "4s" }} />

      {/* Sidebar bên trái */}
      <Sidebar />

      {/* Vùng nội dung chính bên phải */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 pl-1 z-10">
        <div className="flex-1 glass-panel rounded-2xl overflow-y-auto flex flex-col relative shadow-2xl transition-all duration-300">
          <TopBar />
          <main className="flex-1 p-6 pb-32">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Thanh phát nhạc cố định nổi dưới cùng */}
      <PlayerBar />

      {/* Trợ lý nhạc AI */}
      <ChatBox />
    </div>
  );
}
