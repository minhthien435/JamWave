import { Link } from "react-router-dom";
import { Music } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center mb-5 shadow-2xl shadow-violet-500/30">
        <Music size={36} className="text-white" />
      </div>
      <p className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-3">
        404
      </p>
      <h1 className="text-xl font-extrabold text-white mb-2">Không tìm thấy trang</h1>
      <p className="text-zinc-400 text-sm mb-6 max-w-sm">
        Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển.
      </p>
      <Link
        to="/"
        className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-cyan-400 text-white font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-violet-500/30 active:scale-95"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
