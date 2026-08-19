import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Sparkle,
  MusicNotes,
  MicrophoneStage,
  Disc,
  ChartBar,
  Playlist,
  Heart,
  SlidersHorizontal,
  Lightbulb,
  CaretRight,
  Lightning,
  Copy,
  Check,
  Globe,
  Robot,
  ChatCircleDots,
  PaperPlaneTilt,
  BookOpen,
  Info,
  ListNumbers,
} from "@phosphor-icons/react";
import { CATEGORY_TABS } from "../data/chatPrompts";

const TOC_ITEMS = [
  { id: "overview", label: "1. Tổng quan & Khởi động", icon: Sparkle },
  { id: "quick-prompts", label: "2. Gợi ý nhanh trong Chat", icon: Lightning },
  { id: "find-music", label: "3. Tìm & Gợi ý âm nhạc", icon: MusicNotes },
  { id: "controls", label: "4. Điều khiển Player tức thì", icon: SlidersHorizontal },
  { id: "playlist-queue", label: "5. Tạo Playlist & Hàng chờ", icon: Playlist },
  { id: "explore-stats", label: "6. Tra cứu Nghệ sĩ & Album", icon: Disc },
  { id: "personal-lang", label: "7. Cá nhân hóa & Song ngữ", icon: Heart },
  { id: "tips-tricks", label: "8. Mẹo sử dụng hiệu quả", icon: Lightbulb },
];

const PLAYER_COMMANDS = [
  { intent: "Tạm dừng", syntax: "“tạm dừng” / “dừng nhạc” / “pause”", desc: "Dừng bài hát đang phát ngay lập tức" },
  { intent: "Tiếp tục", syntax: "“tiếp tục” / “phát tiếp” / “resume”", desc: "Tiếp tục phát bài nhạc đang tạm dừng" },
  { intent: "Chuyển bài", syntax: "“bài tiếp theo” / “chuyển bài” / “next”", desc: "Phát bài tiếp theo trong hàng chờ" },
  { intent: "Bài trước", syntax: "“bài trước” / “quay lại bài” / “previous”", desc: "Quay về bài hát vừa phát trước đó" },
  { intent: "Chỉnh âm lượng", syntax: "“âm lượng 80%” / “tăng âm lượng”", desc: "Điều chỉnh âm lượng tức thì theo %" },
  { intent: "Đang phát", syntax: "“đang phát bài gì?” / “now playing”", desc: "Hỏi tên bài hát và nghệ sĩ đang phát" },
  { intent: "Bật/Tắt ngẫu nhiên", syntax: "“phát ngẫu nhiên” / “tắt shuffle”", desc: "Bật/tắt chế độ phát xáo trộn bài hát" },
];

export default function DocsPage() {
  const [copiedPrompt, setCopiedPrompt] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const isScrollingRef = useRef(false);

  const handleCopyPrompt = (promptText, e) => {
    e?.stopPropagation();
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(promptText);
    setTimeout(() => setCopiedPrompt(null), 1800);
  };

  const handleOpenChat = (promptText = null, e = null) => {
    e?.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("open-ai-chat", {
        detail: promptText ? { prompt: promptText } : undefined,
      })
    );
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      isScrollingRef.current = true;
      setActiveSection(id);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 700);
    }
  };

  // Observe active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: 0.1 }
    );

    TOC_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-6xl mx-auto pb-16 select-none">
      {/* Header Breadcrumb & Version */}
      <div className="flex items-center justify-between gap-4 mb-4 font-mono text-xs text-[#A39282]">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-[#D97C54]" />
          <span>Documentation</span>
          <span>/</span>
          <span className="text-[#EDE6D6] font-bold">AI Assistant Manual</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-[#26211C] border border-[#EDE6D6]/15 text-[#EDE6D6] font-mono text-[10px]">
            v2.4 • Gemini Flash
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= MAIN DOCUMENTATION COLUMN ================= */}
        <main className="lg:col-span-8 space-y-10 min-w-0">
          {/* SECTION 1: OVERVIEW */}
          <section id="overview" className="scroll-mt-24 space-y-5">
            <div className="indie-panel rounded-3xl p-6 sm:p-8 border-dashed-indie relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#B85C38]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-2.5 mb-3 font-mono">
                <span className="text-[9px] font-bold uppercase px-2.5 py-0.5 rounded bg-[#B85C38]/20 text-[#D97C54] border border-[#B85C38]/30">
                  Tài liệu chính thức
                </span>
                <span className="text-[9px] font-bold uppercase px-2.5 py-0.5 rounded bg-[#E0B35C]/15 text-[#E0B35C] border border-[#E0B35C]/30">
                  JamWave AI
                </span>
              </div>

              <h1 className="font-serif italic text-2xl sm:text-3xl font-bold text-[#EDE6D6] tracking-tight">
                Hướng dẫn sử dụng Trợ lý Nhạc AI
              </h1>

              <p className="text-xs sm:text-sm text-[#A39282] mt-3 leading-relaxed font-sans">
                Trợ lý âm nhạc được tích hợp sâu vào toàn bộ hệ sinh thái nghe nhạc, cho phép bạn điều khiển phát nhạc tức thì, tìm kiếm thông minh theo cảm xúc, tự động tạo playlist và tra cứu toàn bộ kho dữ liệu âm nhạc bằng ngôn ngữ tự nhiên.
              </p>

              {/* 4 Feature Pillars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-dashed-indie font-sans">
                <div className="bg-[#26211C] border border-[#EDE6D6]/10 rounded-xl p-3">
                  <Lightning size={18} weight="fill" className="text-[#E0B35C] mb-1.5" />
                  <p className="text-xs font-bold text-[#EDE6D6]">0s Độ trễ Player</p>
                  <p className="font-mono text-[10px] text-[#A39282] mt-0.5">Lệnh phát/dừng tức thì</p>
                </div>
                <div className="bg-[#26211C] border border-[#EDE6D6]/10 rounded-xl p-3">
                  <Globe size={18} weight="bold" className="text-[#76876F] mb-1.5" />
                  <p className="text-xs font-bold text-[#EDE6D6]">Song ngữ Linh hoạt</p>
                  <p className="font-mono text-[10px] text-[#A39282] mt-0.5">Tiếng Việt & Tiếng Anh</p>
                </div>
                <div className="bg-[#26211C] border border-[#EDE6D6]/10 rounded-xl p-3">
                  <Playlist size={18} weight="bold" className="text-[#D97C54] mb-1.5" />
                  <p className="text-xs font-bold text-[#EDE6D6]">Playlist Tự động</p>
                  <p className="font-mono text-[10px] text-[#A39282] mt-0.5">Tạo danh sách qua 1 câu</p>
                </div>
                <div className="bg-[#26211C] border border-[#EDE6D6]/10 rounded-xl p-3">
                  <Robot size={18} weight="fill" className="text-[#E0B35C] mb-1.5" />
                  <p className="text-xs font-bold text-[#EDE6D6]">Google Gemini</p>
                  <p className="font-mono text-[10px] text-[#A39282] mt-0.5">Hiểu sâu ngữ cảnh nhạc</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={(e) => handleOpenChat(null, e)}
                  className="font-mono text-xs font-bold uppercase tracking-wider bg-[#B85C38] hover:bg-[#D97C54] active:scale-95 text-[#EDE6D6] rounded-xl px-4 py-2.5 transition-all shadow-md flex items-center gap-2 border border-[#EDE6D6]/20"
                >
                  <ChatCircleDots size={16} weight="fill" />
                  Mở Sổ Tay Chat AI
                </button>
                <span className="font-mono text-xs text-[#8A7B6C] flex items-center gap-1">
                  hoặc bấm nút tròn <span className="text-[#D97C54] font-bold">🎵</span> ở góc phải
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 2: QUICK PROMPTS IN CHAT */}
          <section id="quick-prompts" className="scroll-mt-24 space-y-4 font-sans">
            <div className="border-b border-dashed-indie pb-3">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2.5">
                <Lightning size={18} weight="fill" className="text-[#E0B35C]" />
                2. CÁC MỤC GỢI Ý NHANH TRONG CHAT
              </h2>
              <p className="font-sans text-xs text-[#A39282] mt-1">
                Khi mở hộp thoại chat, bạn sẽ thấy 4 Tab danh mục được chia sẵn. Bạn có thể bấm để sao chép câu lệnh hoặc bấm nút máy bay để gửi trực tiếp.
              </p>
            </div>

            <div className="space-y-3">
              {CATEGORY_TABS.map((cat) => (
                <div key={cat.id} className="indie-panel rounded-2xl p-4 border-dashed-indie">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#B85C38]/20 border border-[#B85C38]/40 flex items-center justify-center text-[#D97C54]">
                      <cat.icon size={15} weight="bold" />
                    </div>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#EDE6D6]">{cat.name}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.prompts.map((p) => {
                      const isCopied = copiedPrompt === p;
                      return (
                        <div
                          key={p}
                          className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                            isCopied
                              ? "bg-[#76876F]/20 text-[#76876F] border-[#76876F]/40"
                              : "bg-[#26211C] hover:bg-[#2E2721] text-[#EDE6D6] border-[#EDE6D6]/10 hover:border-[#D97C54]/40"
                          }`}
                        >
                          <button
                            onClick={(e) => handleCopyPrompt(p, e)}
                            className="flex items-center gap-2 text-left truncate flex-1 font-mono text-[11px]"
                            title="Sao chép câu lệnh"
                          >
                            {isCopied ? <Check size={13} weight="bold" /> : <Copy size={12} className="opacity-60 group-hover:opacity-100" />}
                            <span className="truncate">{p}</span>
                          </button>
                          <button
                            onClick={(e) => handleOpenChat(p, e)}
                            className="p-1 rounded-lg text-[#8A7B6C] hover:text-[#D97C54] hover:bg-[#2E2721] transition-all active:scale-90"
                            title="Gửi câu này vào chat ngay"
                          >
                            <PaperPlaneTilt size={12} weight="fill" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 3: FIND MUSIC & RECOMMENDATIONS */}
          <section id="find-music" className="scroll-mt-24 space-y-4 font-sans">
            <div className="border-b border-dashed-indie pb-3">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2.5">
                <MusicNotes size={18} weight="duotone" className="text-[#D97C54]" />
                3. TÌM KIẾM & GỢI Ý ÂM NHẠC THEO NGỮ CẢNH
              </h2>
              <p className="text-xs text-[#A39282] mt-1 leading-relaxed">
                Trợ lý AI có thể hiểu được cảm xúc, thời điểm, hoạt động hàng ngày hoặc các yêu cầu cụ thể về thể loại và nhịp điệu.
              </p>
            </div>

            <div className="space-y-4 text-xs text-[#EDE6D6] leading-relaxed">
              <p className="text-[#A39282]">
                Bạn không cần nhớ chính xác tên bài hát hay ca sĩ. Hãy mô tả bất kỳ điều gì bạn muốn nghe, ví dụ:
              </p>

              <div className="space-y-2">
                {[
                  "Gợi ý nhạc lofi thư giãn để đọc sách",
                  "Tìm nhạc indie chill nhẹ nhàng cho việc học",
                  "Nhạc sôi động, năng lượng cao để tập gym",
                  "Nhạc không lời êm dịu dễ ngủ",
                  "Tìm nhạc có tiết tấu nhanh, vui vẻ ngày cuối tuần",
                ].map((prompt) => (
                  <div
                    key={prompt}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#26211C] border border-[#EDE6D6]/10 hover:border-[#D97C54]/40 hover:bg-[#2E2721] transition-all group"
                  >
                    <span className="font-mono text-xs text-[#EDE6D6]">“{prompt}”</span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <button
                        onClick={(e) => handleCopyPrompt(prompt, e)}
                        className="px-2.5 py-1 rounded-lg bg-[#201A16] hover:bg-[#2E2721] text-[#A39282] hover:text-[#EDE6D6] border border-[#EDE6D6]/10 transition-all flex items-center gap-1"
                      >
                        {copiedPrompt === prompt ? <Check size={12} className="text-[#76876F]" weight="bold" /> : <Copy size={12} />}
                        <span>{copiedPrompt === prompt ? "Đã chép" : "Copy"}</span>
                      </button>
                      <button
                        onClick={(e) => handleOpenChat(prompt, e)}
                        className="px-2.5 py-1 rounded-lg bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] transition-all flex items-center gap-1 shadow-sm active:scale-95"
                      >
                        <PaperPlaneTilt size={12} weight="fill" />
                        <span>Thử ngay</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-[#B85C38]/10 border border-[#B85C38]/25 text-[#EDE6D6]">
                <p className="font-bold flex items-center gap-1.5 text-[#D97C54]">
                  <Info size={16} weight="bold" />
                  Mẹo phát nhạc:
                </p>
                <p className="mt-1 text-xs text-[#A39282]">
                  Khi AI trả về danh sách bài hát trong tin nhắn, bạn chỉ cần bấm vào thẻ bài hát là nhạc sẽ lập tức được phát ngay trên Player bar bên dưới.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 4: PLAYER CONTROLS CHEAT SHEET */}
          <section id="controls" className="scroll-mt-24 space-y-4 font-sans">
            <div className="border-b border-dashed-indie pb-3">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2.5">
                <SlidersHorizontal size={18} weight="duotone" className="text-[#E0B35C]" />
                4. BẢNG TRA CỨU LỆNH ĐIỀU KHIỂN PLAYER (0S ĐỘ TRỄ)
              </h2>
              <p className="text-xs text-[#A39282] mt-1">
                Các lệnh dưới đây được hệ thống xử lý ngay lập tức trên trình duyệt của bạn (Fast-path local intent) mà không cần chờ gửi lên máy chủ AI.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border-dashed-indie indie-panel">
              <table className="w-full text-left text-xs text-[#EDE6D6]">
                <thead className="bg-[#26211C] border-b border-dashed-indie text-[#EDE6D6] font-mono font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Hành động</th>
                    <th className="p-3.5">Câu lệnh mẫu (Tiếng Việt / Anh)</th>
                    <th className="p-3.5">Mô tả chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE6D6]/10">
                  {PLAYER_COMMANDS.map((cmd) => (
                    <tr key={cmd.intent} className="hover:bg-[#26211C]/50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#D97C54] whitespace-nowrap">{cmd.intent}</td>
                      <td className="p-3.5 font-mono text-xs text-[#EDE6D6]">{cmd.syntax}</td>
                      <td className="p-3.5 text-[#A39282]">{cmd.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 5: PLAYLIST & QUEUE */}
          <section id="playlist-queue" className="scroll-mt-24 space-y-4 font-sans">
            <div className="border-b border-dashed-indie pb-3">
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2.5">
                  <Playlist size={18} weight="duotone" className="text-[#76876F]" />
                  5. TẠO PLAYLIST & QUẢN LÝ HÀNG CHỜ
                </h2>
                <span className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E0B35C]/15 text-[#E0B35C] border border-[#E0B35C]/30">
                  Cần đăng nhập
                </span>
              </div>
              <p className="text-xs text-[#A39282] mt-1">
                Tự động gom bài hát thành danh sách phát cá nhân và lưu vào Thư viện của bạn chỉ bằng một câu lệnh chat.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  title: "Tạo playlist theo chủ đề & số lượng bài:",
                  prompt: "Tạo playlist nhạc lofi 10 bài tên là LofiStudy",
                  desc: "AI sẽ tự động chọn 10 bài hát lofi hay nhất và tạo thành playlist mới trong thư viện của bạn.",
                },
                {
                  title: "Thêm bài hát vào playlist đã có:",
                  prompt: "Thêm bài Breathe vào playlist LofiStudy",
                  desc: "Tìm bài hát và đưa vào đúng playlist đã chỉ định.",
                },
                {
                  title: "Thêm nhạc tương tự vào hàng chờ phát tiếp:",
                  prompt: "Thêm nhạc giống bài này vào hàng chờ",
                  desc: "Xếp thêm các bài cùng thể loại vào danh sách chờ mà không làm gián đoạn bài đang phát.",
                },
              ].map((item, idx) => (
                <div key={idx} className="indie-panel rounded-2xl p-4 border-dashed-indie space-y-2">
                  <p className="text-xs font-bold text-[#EDE6D6]">{item.title}</p>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#26211C] border border-[#EDE6D6]/10">
                    <span className="font-mono text-xs text-[#D97C54]">“{item.prompt}”</span>
                    <button
                      onClick={(e) => handleOpenChat(item.prompt, e)}
                      className="px-2.5 py-1 rounded-lg bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] text-[11px] font-mono font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                    >
                      <PaperPlaneTilt size={11} weight="fill" />
                      <span>Thử ngay</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[#A39282] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 6: ARTISTS, ALBUMS & STATS */}
          <section id="explore-stats" className="scroll-mt-24 space-y-4 font-sans">
            <div className="border-b border-dashed-indie pb-3">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2.5">
                <Disc size={18} weight="duotone" className="text-[#D97C54]" />
                6. TRA CỨU NGHỆ SĨ, ALBUM & THỐNG KÊ THƯ VIỆN
              </h2>
              <p className="text-xs text-[#A39282] mt-1">
                Khám phá kho âm nhạc JamWave đồ sộ thông qua các câu hỏi tra cứu dữ liệu.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="indie-panel rounded-2xl p-4 border-dashed-indie space-y-2">
                <p className="font-mono text-xs font-bold text-[#E0B35C] flex items-center gap-1.5">
                  <MicrophoneStage size={15} /> Tra cứu nghệ sĩ & Album
                </p>
                <div className="space-y-1.5 text-xs">
                  {["Alexander Blu có bao nhiêu bài?", "Thông tin nghệ sĩ Tryad", "Phát album Listen của Tryad"].map((p) => (
                    <button
                      key={p}
                      onClick={(e) => handleOpenChat(p, e)}
                      className="w-full text-left p-2 rounded-xl bg-[#26211C] hover:bg-[#2E2721] text-[#EDE6D6] hover:text-[#D97C54] transition-all font-mono text-[11px] truncate flex items-center justify-between border border-[#EDE6D6]/10"
                    >
                      <span className="truncate">“{p}”</span>
                      <PaperPlaneTilt size={11} className="opacity-70 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="indie-panel rounded-2xl p-4 border-dashed-indie space-y-2">
                <p className="font-mono text-xs font-bold text-[#76876F] flex items-center gap-1.5">
                  <ChartBar size={15} /> Thống kê & Xếp hạng
                </p>
                <div className="space-y-1.5 text-xs">
                  {["Bài hát dài nhất trong thư viện", "Thể loại nhạc nào phổ biến nhất?", "Bài hát đang hot nhất"].map((p) => (
                    <button
                      key={p}
                      onClick={(e) => handleOpenChat(p, e)}
                      className="w-full text-left p-2 rounded-xl bg-[#26211C] hover:bg-[#2E2721] text-[#EDE6D6] hover:text-[#D97C54] transition-all font-mono text-[11px] truncate flex items-center justify-between border border-[#EDE6D6]/10"
                    >
                      <span className="truncate">“{p}”</span>
                      <PaperPlaneTilt size={11} className="opacity-70 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 7: PERSONALIZATION & LANGUAGE */}
          <section id="personal-lang" className="scroll-mt-24 space-y-4 font-sans">
            <div className="border-b border-dashed-indie pb-3">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2.5">
                <Heart size={18} weight="duotone" className="text-[#D97C54]" />
                7. CÁ NHÂN HÓA & KHẢ NĂNG SONG NGỮ
              </h2>
              <p className="text-xs text-[#A39282] mt-1">
                Trải nghiệm nghe nhạc được may đo theo gu âm nhạc riêng của bạn.
              </p>
            </div>

            <div className="indie-panel rounded-2xl p-5 border-dashed-indie space-y-3 text-xs text-[#EDE6D6] leading-relaxed">
              <p>
                • <strong>Gu cá nhân</strong>: Trợ lý có thể đọc lịch sử nghe nhạc và danh sách yêu thích của bạn khi đã đăng nhập:
              </p>
              <div className="flex flex-wrap gap-2">
                {["Bài tôi nghe nhiều nhất", "Bài tôi đã thích gần đây", "Gợi ý bài mới theo gu của tôi"].map((p) => (
                  <button
                    key={p}
                    onClick={(e) => handleOpenChat(p, e)}
                    className="px-3 py-1.5 rounded-xl bg-[#B85C38]/15 hover:bg-[#B85C38]/30 border border-[#B85C38]/40 text-[#D97C54] transition-all font-mono text-[11px] flex items-center gap-1.5"
                  >
                    <span>“{p}”</span>
                    <PaperPlaneTilt size={10} weight="fill" />
                  </button>
                ))}
              </div>

              <p className="pt-2">
                • <strong>Tự nhận diện ngôn ngữ</strong>: Bạn có thể thoải mái hỏi bằng tiếng Anh hoặc tiếng Việt, AI sẽ tự động phản hồi bằng ngôn ngữ tương ứng:
              </p>
              <div className="flex flex-wrap gap-2">
                {["Play some chill acoustic tracks", "How many songs does Alexander Blu have?"].map((p) => (
                  <button
                    key={p}
                    onClick={(e) => handleOpenChat(p, e)}
                    className="px-3 py-1.5 rounded-xl bg-[#26211C] hover:bg-[#2E2721] border border-[#EDE6D6]/15 text-[#EDE6D6] transition-all font-mono text-[11px] flex items-center gap-1.5"
                  >
                    <span>“{p}”</span>
                    <PaperPlaneTilt size={10} weight="fill" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 8: TIPS & TRICKS */}
          <section id="tips-tricks" className="scroll-mt-24 space-y-4 font-sans">
            <div className="border-b border-dashed-indie pb-3">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2.5">
                <Lightbulb size={18} weight="fill" className="text-[#E0B35C]" />
                8. MẸO SỬ DỤNG TRỢ LÝ HIỆU QUẢ
              </h2>
              <p className="text-xs text-[#A39282] mt-1">
                Một số lưu ý nhỏ giúp bạn tận dụng tối đa sức mạnh của JamWave AI.
              </p>
            </div>

            <div className="indie-panel rounded-3xl p-5 sm:p-6 border-dashed-indie space-y-3">
              <ul className="space-y-3 text-xs sm:text-sm text-[#EDE6D6]">
                {[
                  "Bấm trực tiếp vào tên bài hát trong tin nhắn AI để nghe nhạc ngay lập tức.",
                  "Dùng các chip gợi ý màu sắc bên dưới mỗi câu trả lời của AI để hỏi tiếp mà không cần gõ chữ.",
                  "Bấm icon bóng đèn (💡) ở thanh Header của hộp thoại chat để bật/tắt thanh gợi ý theo danh mục.",
                  "Bấm nút sao chép (📋) để lưu lại danh sách bài hát hoặc thông tin nghệ sĩ.",
                  "Đăng nhập tài khoản để sử dụng đầy đủ các tính năng tạo Playlist tự động và đọc lịch sử nghe nhạc cá nhân.",
                ].map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <CaretRight size={16} weight="bold" className="text-[#D97C54] flex-shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Bottom Actions */}
          <div className="pt-6 border-t border-dashed-indie flex flex-wrap items-center justify-between gap-3 font-sans">
            <button
              onClick={(e) => handleOpenChat(null, e)}
              className="font-mono text-xs font-bold uppercase tracking-wider bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] rounded-xl px-5 py-3 transition-all active:scale-95 shadow-md flex items-center gap-2 border border-[#EDE6D6]/20"
            >
              <ChatCircleDots size={18} weight="fill" />
              Mở Trợ lý Chat AI ngay
            </button>
            <div className="flex items-center gap-2 font-mono text-xs">
              <Link
                to="/"
                className="bg-[#26211C] hover:bg-[#2E2721] text-[#EDE6D6] rounded-xl px-4 py-3 transition-all active:scale-95 border border-[#EDE6D6]/15"
              >
                Về Mục Lục
              </Link>
              <Link
                to="/browse"
                className="bg-[#26211C] hover:bg-[#2E2721] text-[#EDE6D6] rounded-xl px-4 py-3 transition-all active:scale-95 border border-[#EDE6D6]/15"
              >
                Khám Phá Âm Nhạc
              </Link>
            </div>
          </div>
        </main>

        {/* ================= STICKY TABLE OF CONTENTS (SIDEBAR) ================= */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4 font-sans">
          <div className="indie-panel rounded-3xl p-5 border-dashed-indie shadow-2xl">
            <div className="flex items-center gap-2 mb-3.5 pb-3 border-b border-dashed-indie">
              <ListNumbers size={18} className="text-[#D97C54]" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6]">Mục lục tài liệu</h3>
            </div>

            <nav className="space-y-1 font-mono text-xs">
              {TOC_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors duration-200 ${
                      isActive
                        ? "bg-[#2E2721] text-[#EDE6D6] border border-[#EDE6D6]/15 font-semibold shadow-sm"
                        : "text-[#A39282] hover:text-[#EDE6D6] hover:bg-[#26211C]"
                    }`}
                  >
                    <Icon
                      size={15}
                      weight={isActive ? "fill" : "regular"}
                      className={`flex-shrink-0 transition-colors duration-200 ${
                        isActive ? "text-[#D97C54]" : "text-[#8A7B6C]"
                      }`}
                    />
                    <span className="truncate flex-1">{item.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#D97C54]" />}
                  </button>
                );
              })}
            </nav>

            <div className="mt-5 pt-4 border-t border-dashed-indie space-y-2">
              <button
                onClick={(e) => handleOpenChat(null, e)}
                className="w-full font-mono text-xs font-bold uppercase tracking-wider bg-[#B85C38]/25 hover:bg-[#B85C38]/40 text-[#D97C54] border border-[#B85C38]/40 rounded-xl py-2.5 transition-colors duration-200 flex items-center justify-center gap-2 active:scale-95"
              >
                <ChatCircleDots size={16} weight="fill" />
                <span>Mở Sổ Tay Chat</span>
              </button>
              <p className="font-mono text-[10px] text-[#8A7B6C] text-center">Bấm vào đề mục để cuộn mượt</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
