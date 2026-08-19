import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import PlayerBar from "./PlayerBar";
import ChatBox from "./ChatBox";
import DownloadProgressModal from "./DownloadProgressModal";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";

export default function MainLayout() {
  useKeyboardShortcuts();

  return (
    <div className="relative flex h-screen bg-[#181512] text-[#EDE6D6] overflow-hidden font-sans film-grain select-none">
      {/* Warm Ambient Desk Lamp Glow */}
      <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-[#B85C38]/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-[#D4A24C]/08 blur-[160px] pointer-events-none" />

      {/* Sidebar bên trái: Zine navigation */}
      <Sidebar />

      {/* Vùng nội dung chính bên phải: Giấy zine thủ công */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 pl-1.5 z-10">
        <div className="flex-1 indie-panel rounded-2xl overflow-y-auto flex flex-col relative transition-all duration-300">
          <TopBar />
          <main className="flex-1 p-5 sm:p-7">
            <Outlet />
            {/* Spacer đảm bảo mọi nội dung luôn cuộn lên hoàn toàn trên PlayerBar */}
            <div className="h-32 w-full flex-shrink-0 pointer-events-none" aria-hidden="true" />
          </main>
        </div>
      </div>

      {/* Thanh phát nhạc Cassette nổi cố định ở dưới */}
      <PlayerBar />

      {/* Trợ lý nhạc AI */}
      <ChatBox />

      {/* Modal hiển thị tiến trình tải xuống MP3 / ZIP */}
      <DownloadProgressModal />
    </div>
  );
}
