import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import PlayerBar from "./PlayerBar";
import ChatBox from "./ChatBox";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";

export default function MainLayout() {
  useKeyboardShortcuts();

  return (
    <div className="relative flex h-screen bg-[#0d0d12] text-zinc-100 overflow-hidden font-sans">
      {/* Subtle Ambient Background Spotlight */}
      <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-900/15 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-950/10 blur-[180px] pointer-events-none" />

      {/* Sidebar bên trái */}
      <Sidebar />

      {/* Vùng nội dung chính bên phải */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 pl-1.5 z-10">
        <div className="flex-1 glass-panel rounded-2xl overflow-y-auto flex flex-col relative shadow-2xl transition-all duration-300">
          <TopBar />
          <main className="flex-1 p-6 sm:p-8">
            <Outlet />
            {/* Spacer đảm bảo mọi nội dung và nút bấm ở cuối trang luôn cuộn lên hoàn toàn trên PlayerBar */}
            <div className="h-32 w-full flex-shrink-0 pointer-events-none" aria-hidden="true" />
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
