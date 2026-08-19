import { useEffect, useState } from "react";
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
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  // Observe active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
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
      <div className="flex items-center justify-between gap-4 mb-4 text-xs font-semibold text-zinc-400">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-violet-400" />
          <span>Documentation</span>
          <span>/</span>
          <span className="text-white">AI Assistant Manual</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300 font-mono text-[11px]">
            v2.4 • Gemini Flash
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= MAIN DOCUMENTATION COLUMN ================= */}
        <main className="lg:col-span-8 space-y-10 min-w-0">
          {/* SECTION 1: OVERVIEW */}
          <section id="overview" className="scroll-mt-24 space-y-5">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Tài liệu chính thức
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  JamWave AI
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Hướng dẫn sử dụng Trợ lý Nhạc AI
              </h1>

              <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
                Trợ lý âm nhạc JamWave được tích hợp sâu vào toàn bộ hệ sinh thái nghe nhạc, cho phép bạn điều khiển phát nhạc tức thì, tìm kiếm thông minh theo cảm xúc, tự động tạo playlist và tra cứu toàn bộ kho dữ liệu âm nhạc bằng ngôn ngữ tự nhiên.
              </p>

              {/* 4 Feature Pillars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-white/10">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <Lightning size={20} weight="fill" className="text-amber-400 mb-1.5" />
                  <p className="text-xs font-bold text-white">0s Độ trễ Player</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Lệnh phát/dừng xử lý tức thì</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <Globe size={20} weight="bold" className="text-cyan-400 mb-1.5" />
                  <p className="text-xs font-bold text-white">Song ngữ Linh hoạt</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Tiếng Việt & Tiếng Anh</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <Playlist size={20} weight="bold" className="text-emerald-400 mb-1.5" />
                  <p className="text-xs font-bold text-white">Playlist Tự động</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Tạo danh sách nhạc qua 1 câu</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <Robot size={20} weight="fill" className="text-violet-400 mb-1.5" />
                  <p className="text-xs font-bold text-white">Google Gemini</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Hiểu sâu ngữ cảnh âm nhạc</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={(e) => handleOpenChat(null, e)}
                  className="text-xs font-bold bg-violet-600 hover:bg-violet-500 active:scale-95 text-white rounded-xl px-4 py-2.5 transition-all shadow-md shadow-violet-950/70 flex items-center gap-2"
                >
                  <ChatCircleDots size={16} weight="fill" />
                  Mở hộp thoại Chat AI ngay
                </button>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  hoặc bấm nút tròn <span className="text-violet-300 font-bold">🎵</span> ở góc phải màn hình
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 2: QUICK PROMPTS IN CHAT */}
          <section id="quick-prompts" className="scroll-mt-24 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
                <Lightning size={22} weight="fill" className="text-amber-400" />
                2. Các mục Gợi ý nhanh có sẵn trong Chat
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Khi mở hộp thoại chat, bạn sẽ thấy 4 Tab danh mục được chia sẵn. Bạn có thể bấm để sao chép câu lệnh hoặc bấm nút máy bay để gửi trực tiếp.
              </p>
            </div>

            <div className="space-y-3">
              {CATEGORY_TABS.map((cat) => (
                <div key={cat.id} className="glass-panel rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-xl bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-violet-300">
                      <cat.icon size={16} weight="bold" />
                    </div>
                    <span className="text-sm font-bold text-white">{cat.name}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.prompts.map((p) => {
                      const isCopied = copiedPrompt === p;
                      return (
                        <div
                          key={p}
                          className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                            isCopied
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
                              : "bg-white/5 hover:bg-violet-600/20 text-zinc-300 hover:text-white border-white/10 hover:border-violet-500/30"
                          }`}
                        >
                          <button
                            onClick={(e) => handleCopyPrompt(p, e)}
                            className="flex items-center gap-2 text-left truncate flex-1"
                            title="Sao chép câu lệnh"
                          >
                            {isCopied ? <Check size={14} weight="bold" /> : <Copy size={13} className="opacity-60 group-hover:opacity-100" />}
                            <span className="truncate">{p}</span>
                          </button>
                          <button
                            onClick={(e) => handleOpenChat(p, e)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-violet-300 hover:bg-violet-500/30 transition-all active:scale-90"
                            title="Gửi câu này vào chat ngay"
                          >
                            <PaperPlaneTilt size={13} weight="fill" />
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
          <section id="find-music" className="scroll-mt-24 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
                <MusicNotes size={22} weight="duotone" className="text-violet-400" />
                3. Tìm kiếm & Gợi ý âm nhạc theo Ngữ cảnh
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Trợ lý AI có thể hiểu được cảm xúc, thời điểm, hoạt động hàng ngày hoặc các yêu cầu cụ thể về nhạc không lời (instrumental), năng lượng bài hát.
              </p>
            </div>

            <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
              <p>
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
                    className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 hover:border-violet-500/40 transition-all group"
                  >
                    <span className="font-mono text-zinc-200">“{prompt}”</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleCopyPrompt(prompt, e)}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all flex items-center gap-1"
                      >
                        {copiedPrompt === prompt ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedPrompt === prompt ? "Đã chép" : "Copy"}</span>
                      </button>
                      <button
                        onClick={(e) => handleOpenChat(prompt, e)}
                        className="px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all flex items-center gap-1 shadow-sm"
                      >
                        <PaperPlaneTilt size={12} weight="fill" />
                        <span>Thử ngay</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <Info size={16} weight="bold" />
                  Mẹo phát nhạc:
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Khi AI trả về danh sách bài hát trong tin nhắn, bạn chỉ cần bấm vào thẻ bài hát là nhạc sẽ lập tức được phát ngay trên Player bar bên dưới.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 4: PLAYER CONTROLS CHEAT SHEET */}
          <section id="controls" className="scroll-mt-24 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
                <SlidersHorizontal size={22} weight="duotone" className="text-amber-400" />
                4. Bảng tra cứu Lệnh Điều Khiển Player (0s Độ trễ)
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Các lệnh dưới đây được hệ thống xử lý ngay lập tức trên trình duyệt của bạn (Fast-path local intent) mà không cần chờ gửi lên máy chủ AI.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-white/5 border-b border-white/10 text-white font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Hành động</th>
                    <th className="p-3.5">Câu lệnh mẫu (Tiếng Việt / Anh)</th>
                    <th className="p-3.5">Mô tả chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {PLAYER_COMMANDS.map((cmd) => (
                    <tr key={cmd.intent} className="hover:bg-white/[0.03] transition-colors">
                      <td className="p-3.5 font-bold text-amber-300 whitespace-nowrap">{cmd.intent}</td>
                      <td className="p-3.5 font-mono text-zinc-200">{cmd.syntax}</td>
                      <td className="p-3.5 text-zinc-400">{cmd.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 5: PLAYLIST & QUEUE */}
          <section id="playlist-queue" className="scroll-mt-24 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
                  <Playlist size={22} weight="duotone" className="text-emerald-400" />
                  5. Tạo Playlist & Quản lý Hàng chờ (Queue)
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  Cần đăng nhập
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
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
                <div key={idx} className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2">
                  <p className="text-xs font-bold text-white">{item.title}</p>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <span className="font-mono text-xs text-emerald-300">“{item.prompt}”</span>
                    <button
                      onClick={(e) => handleOpenChat(item.prompt, e)}
                      className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-[11px] font-semibold transition-all active:scale-95 flex items-center gap-1"
                    >
                      <PaperPlaneTilt size={11} weight="fill" />
                      <span>Thử ngay</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 6: ARTISTS, ALBUMS & STATS */}
          <section id="explore-stats" className="scroll-mt-24 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
                <Disc size={22} weight="duotone" className="text-cyan-400" />
                6. Tra cứu Nghệ sĩ, Album & Thống kê Thư viện
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Khám phá kho âm nhạc JamWave đồ sộ thông qua các câu hỏi tra cứu dữ liệu.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2">
                <p className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <MicrophoneStage size={15} /> Tra cứu nghệ sĩ & Album
                </p>
                <div className="space-y-1.5 text-xs">
                  {["Alexander Blu có bao nhiêu bài?", "Thông tin nghệ sĩ Tryad", "Phát album Listen của Tryad"].map((p) => (
                    <button
                      key={p}
                      onClick={(e) => handleOpenChat(p, e)}
                      className="w-full text-left p-2 rounded-xl bg-white/5 hover:bg-cyan-600/20 text-zinc-300 hover:text-white transition-all font-mono text-[11px] truncate flex items-center justify-between border border-white/5"
                    >
                      <span className="truncate">“{p}”</span>
                      <PaperPlaneTilt size={11} className="opacity-70 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2">
                <p className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <ChartBar size={15} /> Thống kê & Xếp hạng
                </p>
                <div className="space-y-1.5 text-xs">
                  {["Bài hát dài nhất trong thư viện", "Thể loại nhạc nào phổ biến nhất?", "Bài hát đang hot nhất"].map((p) => (
                    <button
                      key={p}
                      onClick={(e) => handleOpenChat(p, e)}
                      className="w-full text-left p-2 rounded-xl bg-white/5 hover:bg-indigo-600/20 text-zinc-300 hover:text-white transition-all font-mono text-[11px] truncate flex items-center justify-between border border-white/5"
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
          <section id="personal-lang" className="scroll-mt-24 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
                <Heart size={22} weight="duotone" className="text-rose-400" />
                7. Cá nhân hóa & Khả năng Song ngữ
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Trải nghiệm nghe nhạc được may đo theo gu âm nhạc riêng của bạn.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3 text-xs text-zinc-300 leading-relaxed">
              <p>
                • <strong>Gu cá nhân</strong>: Trợ lý có thể đọc lịch sử nghe nhạc và danh sách yêu thích của bạn khi đã đăng nhập:
              </p>
              <div className="flex flex-wrap gap-2">
                {["Bài tôi nghe nhiều nhất", "Bài tôi đã thích gần đây", "Gợi ý bài mới theo gu của tôi"].map((p) => (
                  <button
                    key={p}
                    onClick={(e) => handleOpenChat(p, e)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 transition-all font-mono text-[11px] flex items-center gap-1.5"
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
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-200 transition-all font-mono text-[11px] flex items-center gap-1.5"
                  >
                    <span>“{p}”</span>
                    <PaperPlaneTilt size={10} weight="fill" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 8: TIPS & TRICKS */}
          <section id="tips-tricks" className="scroll-mt-24 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
                <Lightbulb size={22} weight="fill" className="text-amber-300" />
                8. Mẹo sử dụng Trợ lý Hiệu quả
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Một số lưu ý nhỏ giúp bạn tận dụng tối đa sức mạnh của JamWave AI.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 space-y-3">
              <ul className="space-y-3 text-xs sm:text-sm text-zinc-300">
                {[
                  "Bấm trực tiếp vào tên bài hát trong tin nhắn AI để nghe nhạc ngay lập tức.",
                  "Dùng các chip gợi ý màu tím bên dưới mỗi câu trả lời của AI để hỏi tiếp mà không cần gõ chữ.",
                  "Bấm icon bóng đèn (💡) ở thanh Header của hộp thoại chat để bật/tắt thanh gợi ý theo danh mục.",
                  "Bấm nút sao chép (📋) để lưu lại danh sách bài hát hoặc thông tin nghệ sĩ.",
                  "Đăng nhập tài khoản để sử dụng đầy đủ các tính năng tạo Playlist tự động và đọc lịch sử nghe nhạc cá nhân.",
                ].map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <CaretRight size={16} weight="bold" className="text-violet-400 flex-shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Bottom Actions */}
          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={(e) => handleOpenChat(null, e)}
              className="text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-5 py-3 transition-all active:scale-95 shadow-lg shadow-violet-950/70 flex items-center gap-2"
            >
              <ChatCircleDots size={18} weight="fill" />
              Mở Trợ lý Chat AI ngay
            </button>
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="text-xs font-semibold bg-white/10 hover:bg-white/15 text-zinc-200 rounded-xl px-4 py-3 transition-all active:scale-95"
              >
                Về Trang chủ
              </Link>
              <Link
                to="/browse"
                className="text-xs font-semibold bg-white/10 hover:bg-white/15 text-zinc-200 rounded-xl px-4 py-3 transition-all active:scale-95"
              >
                Khám phá âm nhạc
              </Link>
            </div>
          </div>
        </main>

        {/* ================= STICKY TABLE OF CONTENTS (SIDEBAR) ================= */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4">
          <div className="glass-panel rounded-3xl p-5 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 mb-3.5 pb-3 border-b border-white/10">
              <ListNumbers size={18} className="text-violet-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Mục lục tài liệu</h3>
            </div>

            <nav className="space-y-1">
              {TOC_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                      isActive
                        ? "bg-violet-600 text-white shadow-md shadow-violet-950/60 font-bold translate-x-1"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon size={14} weight={isActive ? "fill" : "regular"} className="flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
              <button
                onClick={(e) => handleOpenChat(null, e)}
                className="w-full text-xs font-bold bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 rounded-xl py-2.5 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <ChatCircleDots size={16} weight="fill" />
                <span>Trải nghiệm Chatbot</span>
              </button>
              <p className="text-[10px] text-zinc-500 text-center">Bấm vào đề mục để cuộn nhanh</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
