import { Link } from "react-router-dom";
import { WarningCircle } from "@phosphor-icons/react";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center mb-4 border border-violet-500/20 shadow-md">
        <WarningCircle size={36} weight="duotone" />
      </div>
      <p className="text-6xl font-black text-white mb-2 tabular-nums">
        404
      </p>
      <h1 className="text-xl font-bold text-white mb-1.5">Không tìm thấy trang</h1>
      <p className="text-zinc-400 text-xs sm:text-sm mb-6 max-w-sm font-medium">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển khỏi không gian JamWave.
      </p>
      <Link
        to="/"
        className="px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-violet-950/60 active:scale-95"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
