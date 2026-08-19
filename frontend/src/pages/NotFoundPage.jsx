import { Link } from "react-router-dom";
import { WarningCircle } from "@phosphor-icons/react";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center select-none font-sans">
      <div className="w-16 h-16 rounded-2xl bg-[#B85C38]/20 text-[#D97C54] flex items-center justify-center mb-4 border border-[#B85C38]/30 shadow-md">
        <WarningCircle size={36} weight="duotone" />
      </div>
      <p className="font-serif italic text-6xl font-bold text-[#EDE6D6] mb-2 tabular-nums">
        404
      </p>
      <h1 className="font-serif italic text-xl font-bold text-[#EDE6D6] mb-1.5">Không tìm thấy trang</h1>
      <p className="font-mono text-xs text-[#A39282] mb-6 max-w-sm">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển khỏi không gian âm nhạc JamWave.
      </p>
      <Link
        to="/"
        className="font-mono text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] transition-all shadow-md active:scale-95 border border-[#EDE6D6]/20"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
