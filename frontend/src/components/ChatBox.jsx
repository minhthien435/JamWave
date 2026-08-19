import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkle,
  MusicNotes,
  PaperPlaneTilt,
  X,
  Play,
  Copy,
  Check,
  ArrowSquareOut,
  MicrophoneStage,
  Disc,
  Lightbulb,
  BookOpenText,
} from "@phosphor-icons/react";
import { sendChatMessageStream } from "../api/ai";
import { usePlayerStore } from "../usePlayerStore";
import { useLibraryStore } from "../useLibraryStore";
import { detectPlayerIntent, executePlayerIntent, detectLanguage } from "../utils/clientIntents";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { CATEGORY_TABS } from "../data/chatPrompts";
import ArtistAvatar from "./ArtistAvatar";

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const renderFormattedText = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const innerText = part.slice(2, -2);
      return (
        <span key={index} className="font-bold text-white">
          {innerText}
        </span>
      );
    }
    return part;
  });
};

// ---- Card nghệ sĩ ----
function ArtistCard({ artist, songs, onPlayAll }) {
  const navigate = useNavigate();
  const hasSongs = Array.isArray(songs) && songs.length > 0;

  return (
    <div className="mt-2.5 bg-[#26211C] hover:bg-[#2E2721] rounded-xl p-3 border border-[#EDE6D6]/10 transition-all select-none">
      <div className="flex items-center gap-3">
        <ArtistAvatar name={artist.name} image={artist.image} />
        <div className="min-w-0 flex-1">
          <p className="font-serif italic text-xs font-bold text-[#EDE6D6] truncate flex items-center gap-1">
            <MicrophoneStage size={14} className="text-[#D97C54]" />
            {artist.name}
          </p>
          {artist.genres?.length > 0 && (
            <p className="font-mono text-[10px] text-[#A39282] truncate mt-0.5">{artist.genres.join(" · ")}</p>
          )}
          <p className="font-mono text-[10px] text-[#8A7B6C]">{artist.songCount} bài hát</p>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
          className="flex-1 font-mono text-[11px] font-semibold bg-[#201A16] hover:bg-[#2E2721] text-[#EDE6D6] rounded-lg py-1.5 transition-all active:scale-95 flex items-center justify-center gap-1 border border-[#EDE6D6]/10"
        >
          <ArrowSquareOut size={13} className="text-[#D97C54]" />
          Xem nghệ sĩ
        </button>
        {hasSongs && (
          <button
            onClick={() => onPlayAll(songs)}
            className="flex-1 font-mono text-[11px] font-bold uppercase tracking-wider bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] rounded-lg py-1.5 transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm"
          >
            <Play size={13} weight="fill" />
            Phát tất cả
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Card album ----
function AlbumCard({ album, songs, onPlayAll }) {
  const navigate = useNavigate();
  const hasSongs = Array.isArray(songs) && songs.length > 0;

  return (
    <div className="mt-2.5 bg-[#26211C] hover:bg-[#2E2721] rounded-xl p-3 border border-[#EDE6D6]/10 transition-all select-none">
      <div className="flex items-center gap-3">
        <img
          src={album.coverImg}
          alt={album.title}
          loading="lazy"
          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow border border-[#EDE6D6]/15 bg-[#181512]"
        />
        <div className="min-w-0 flex-1">
          <p className="font-serif italic text-xs font-bold text-[#EDE6D6] truncate flex items-center gap-1">
            <Disc size={14} className="text-[#D97C54]" />
            {album.title}
          </p>
          <p className="font-mono text-[10px] text-[#A39282] truncate mt-0.5">{album.artist}</p>
          <p className="font-mono text-[10px] text-[#8A7B6C]">
            {album.songCount} bài
            {album.releaseYears?.length > 0 ? ` · ${album.releaseYears.join(", ")}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={() => navigate(`/album/${album.id}`)}
          className="flex-1 font-mono text-[11px] font-semibold bg-[#201A16] hover:bg-[#2E2721] text-[#EDE6D6] rounded-lg py-1.5 transition-all active:scale-95 flex items-center justify-center gap-1 border border-[#EDE6D6]/10"
        >
          <ArrowSquareOut size={13} className="text-[#D97C54]" />
          Xem album
        </button>
        {hasSongs && (
          <button
            onClick={() => onPlayAll(songs)}
            className="flex-1 font-mono text-[11px] font-bold uppercase tracking-wider bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] rounded-lg py-1.5 transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm"
          >
            <Play size={13} weight="fill" />
            Phát album
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChatBox() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("mood");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Chào bạn! Mình là trợ lý nhạc JamWave 🎵\nHỏi mình gợi ý bài hát, tìm nhạc theo tâm trạng, tra cứu nghệ sĩ/album hoặc yêu cầu phát nhạc nhé!",
      songs: [],
      artists: [],
      albums: [],
      action: null,
      suggestions: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const scrollRef = useRef(null);
  const handleSendRef = useRef(null);
  const playerStore = usePlayerStore();
  const { currentSong, setCurrentSong, setQueue } = playerStore;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending, activeTab, showSuggestions]);

  useEffect(() => {
    const handleOpen = (e) => {
      setOpen(true);
      if (e?.detail?.prompt) {
        handleSendRef.current?.(e.detail.prompt);
      }
    };
    window.addEventListener("open-ai-chat", handleOpen);
    return () => window.removeEventListener("open-ai-chat", handleOpen);
  }, []);

  const handlePlaySong = (song, songs) => {
    setQueue(songs);
    setCurrentSong(song);
  };

  const currentCategory = CATEGORY_TABS.find((tab) => tab.id === activeTab) || CATEGORY_TABS[0];

  const handleSend = async (text) => {
    const message = (text || input).trim();
    if (!message || sending) return;

    // Tự thu gọn panel gợi ý sau tin đầu tiên để chat rộng ra (bật lại qua nút đèn)
    if (messages.length <= 1) setShowSuggestions(false);

    setMessages((prev) => {
      const updated = [...prev, { role: "user", text: message, songs: [], artists: [], albums: [], action: null, suggestions: [] }];
      // Giới hạn 100 messages để tránh chậm khi chat lâu
      return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
    });
    setInput("");
    setSending(true);

    try {
      // Fast-path local: lệnh điều khiển player tức thì, không gọi API
      const localIntent = detectPlayerIntent(message);
      if (localIntent) {
        const lang = detectLanguage(message);
        const reply = executePlayerIntent(localIntent, lang, playerStore);
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: reply, songs: [], artists: [], albums: [], action: null, suggestions: [] },
        ]);
        setSending(false);
        return;
      }

      const history = messages
        .filter((m) => m.text)
        .slice(-10)
        .map((m) => ({ role: m.role === "user" ? "user" : "bot", text: m.text }));

      const applyAiActions = (data) => {
        if (data.action === "play" && data.songs?.length) {
          handlePlaySong(data.songs[0], data.songs);
        }
        if (data.action === "playlist_created" || data.action === "playlist_updated" || data.action === "playlist_deleted") {
          useLibraryStore.getState().loadPlaylists();
        }
        if (data.action === "append" && data.songs?.length) {
          data.songs.forEach((song) => playerStore.addToQueue(song));
        }
      };

      let streamed = false;
      let fullReply = "";
      try {
        await sendChatMessageStream(
          message,
          { history, currentSong },
          {
            onResult: (data) => {
              streamed = true;
              fullReply = data.reply || "";
              const displaySongs = data.action === "play" ? [] : (data.songs || []);
              setMessages((prev) => [
                ...prev,
                {
                  role: "bot",
                  text: "",
                  songs: displaySongs,
                  artists: data.artists || [],
                  albums: data.albums || [],
                  action: data.action || null,
                  suggestions: data.suggestions || [],
                },
              ]);
              applyAiActions(data);
            },
            onText: (chunk) => {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "bot") {
                  return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
                }
                return prev;
              });
            },
          }
        );
      } catch (err) {
        if (streamed) {
          // Stream lỗi giữa chừng sau khi đã render → backfill text đầy đủ
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "bot") {
              return [...prev.slice(0, -1), { ...last, text: fullReply || last.text }];
            }
            return prev;
          });
          throw null;
        }
        throw err;
      }
    } catch (err) {
      if (!err) return;
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error;
      const text =
        status === 429
          ? `Bạn đang gửi tin hơi nhanh, JamWave AI nghỉ 1 phút nhé ⏳ (${serverMsg || "giới hạn 30 tin/phút"}). Hãy thử lại sau!`
          : serverMsg
            ? serverMsg
            : `Có lỗi xảy ra: ${err.message}. Thử lại nhé!`;
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text,
          songs: [],
          artists: [],
          albums: [],
          action: null,
          suggestions: [],
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  const { listening: voiceListening, start: startVoice, stop: stopVoice, supported: voiceSupported } = useSpeechRecognition({
    lang: "vi-VN",
    onResult: (transcript) => {
      setInput(transcript);
      handleSend(transcript);
    },
  });

  const handleCopyText = (text, index) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <>
      {/* Nút mở chat dạng Tem nhãn Indie */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`group fixed bottom-28 right-6 z-50 w-[52px] h-[52px] rounded-2xl shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 border border-[#EDE6D6]/20 ${
          open
            ? "bg-[#26211C] text-[#EDE6D6] shadow-black/80"
            : "bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] shadow-black/50 hover:scale-105"
        }`}
        title="Trợ lý âm nhạc JamWave AI"
      >
        {open ? (
          <X size={20} weight="bold" />
        ) : (
          <div className="relative flex items-center justify-center">
            <MusicNotes size={22} weight="duotone" className="text-[#EDE6D6]" />
            <span className="absolute -top-1 -right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#E0B35C] text-[#2B2620] shadow-sm">
              <Sparkle size={9} weight="fill" />
            </span>
          </div>
        )}
      </button>

      {/* Panel chat Sổ tay ghi chú Zine */}
      {open && (
        <div className="fixed bottom-44 right-5 z-50 w-[470px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-200px)] indie-panel rounded-3xl shadow-2xl border-dashed-indie flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#26211C] border-b border-dashed-indie">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#B85C38] text-[#EDE6D6] flex items-center justify-center flex-shrink-0 shadow-md relative border border-[#EDE6D6]/20">
                <MusicNotes size={20} weight="duotone" />
                <Sparkle size={10} weight="fill" className="absolute top-1 right-1 text-[#E0B35C]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-serif italic font-bold text-sm text-[#EDE6D6]">Sổ Tay Trợ Lý AI</p>
                  <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#E0B35C]/20 text-[#E0B35C] border border-[#E0B35C]/30">
                    GEMINI
                  </span>
                </div>
                <p className="font-mono text-[10px] text-[#A39282]">Gợi ý nhạc • Tra cứu • Điều khiển</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate("/docs")}
                className="p-1.5 rounded-xl hover:bg-[#2E2721] text-[#A39282] hover:text-[#EDE6D6] transition-all"
                title="Hướng dẫn sử dụng"
              >
                <BookOpenText size={17} />
              </button>
              <button
                onClick={() => setShowSuggestions((prev) => !prev)}
                className={`p-1.5 rounded-xl transition-all ${
                  showSuggestions
                    ? "bg-[#B85C38]/25 text-[#D97C54] border border-[#B85C38]/30"
                    : "hover:bg-[#2E2721] text-[#A39282] hover:text-[#EDE6D6]"
                }`}
                title={showSuggestions ? "Ẩn danh mục gợi ý" : "Hiện danh mục gợi ý"}
              >
                <Lightbulb size={17} weight={showSuggestions ? "fill" : "regular"} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#2E2721] text-[#A39282] hover:text-[#EDE6D6] transition-all"
                title="Đóng"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 select-text cursor-text">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs whitespace-pre-line shadow-sm transition-all ${
                    msg.role === "user"
                      ? "bg-[#B85C38] text-[#EDE6D6] font-medium rounded-br-none"
                      : "bg-[#26211C] text-[#EDE6D6] rounded-bl-none border border-[#EDE6D6]/10"
                  }`}
                >
                  {renderFormattedText(msg.text)}

                  {/* Card nghệ sĩ */}
                  {msg.artists?.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {msg.artists.map((artist) => (
                        <ArtistCard
                          key={`${artist.name}-${artist.songCount}`}
                          artist={artist}
                          songs={msg.songs}
                          onPlayAll={(songs) => handlePlaySong(songs[0], songs)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Card album */}
                  {msg.albums?.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {msg.albums.map((album) => (
                        <AlbumCard
                          key={`${album.id}-${album.title}`}
                          album={album}
                          songs={msg.songs}
                          onPlayAll={(songs) => handlePlaySong(songs[0], songs)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Bài hát được gợi ý dạng cuống vé */}
                  {msg.songs.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 select-none">
                      {msg.songs.map((song) => (
                        <button
                          key={`${song.id}-${song.title}`}
                          onClick={() => handlePlaySong(song, msg.songs)}
                          className="w-full flex items-center gap-2.5 bg-[#201A16] hover:bg-[#2E2721] rounded-xl px-2.5 py-2 text-left transition-all duration-150 border border-[#EDE6D6]/10 group"
                        >
                          <img src={song.albumCover} alt={song.title} loading="lazy" className="w-8 h-8 rounded object-cover flex-shrink-0 shadow-sm" />
                          <div className="truncate flex-1 min-w-0">
                            <p className="font-serif italic text-xs truncate text-[#EDE6D6] group-hover:text-[#D97C54]">{song.title}</p>
                            <p className="font-mono text-[10px] text-[#A39282] truncate">{song.artist}</p>
                          </div>
                          <span className="font-mono text-[10px] text-[#8A7B6C] tabular-nums">{formatDuration(song.duration)}</span>
                          <Play size={13} weight="fill" className="text-[#D97C54] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Câu gợi ý tiếp theo (follow-up chips) */}
                  {msg.suggestions?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 select-none">
                      {msg.suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSend(s)}
                          className="font-mono text-[10px] bg-[#B85C38]/20 hover:bg-[#B85C38]/40 text-[#D97C54] rounded-full px-2.5 py-1 transition-all border border-[#B85C38]/30 active:scale-95"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nút 1-click Copy tin nhắn AI */}
                {msg.role === "bot" && (
                  <button
                    onClick={() => handleCopyText(msg.text, i)}
                    className="p-1.5 rounded-lg bg-[#26211C] hover:bg-[#2E2721] text-[#8A7B6C] hover:text-[#EDE6D6] transition-all flex-shrink-0 mt-1 select-none border border-[#EDE6D6]/10"
                    title={copiedIndex === i ? "Đã sao chép!" : "Sao chép tin nhắn"}
                  >
                    {copiedIndex === i ? <Check size={12} weight="bold" className="text-[#D97C54]" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-[#26211C] text-[#A39282] rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-2 border border-[#EDE6D6]/10 shadow-sm font-mono">
                  <div className="w-3.5 h-3.5 rounded-full border border-[#D97C54] flex items-center justify-center reel-spinning">
                    <div className="w-1 h-1 rounded-full bg-[#D97C54]" />
                  </div>
                  <span>JamWave AI đang tra cứu...</span>
                </div>
              </div>
            )}
          </div>

          {/* Category Tabs & Quick Suggestions */}
          {showSuggestions && (
            <div className="px-4 pb-2.5 pt-2 border-t border-dashed-indie bg-[#26211C]/60">
              <div className="grid grid-cols-4 gap-1.5 pb-1">
                {CATEGORY_TABS.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeTab === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl font-mono text-[10px] font-bold transition-all select-none border ${
                        isActive
                          ? "bg-[#B85C38] text-[#EDE6D6] border-[#D97C54] shadow-sm"
                          : "bg-[#26211C] hover:bg-[#2E2721] text-[#A39282] hover:text-[#EDE6D6] border-[#EDE6D6]/10"
                      }`}
                    >
                      <Icon size={13} weight={isActive ? "fill" : "bold"} className="flex-shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-1.5 mt-1.5 max-h-[82px] overflow-y-auto no-scrollbar">
                {currentCategory.prompts.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-left font-mono text-[10px] leading-snug bg-[#201A16] hover:bg-[#2E2721] hover:border-[#D97C54]/40 text-[#A39282] hover:text-[#EDE6D6] rounded-xl px-2.5 py-1.5 transition-all border border-[#EDE6D6]/10 active:scale-95 truncate"
                    title={s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-dashed-indie bg-[#26211C]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Hỏi gợi ý nhạc hoặc điều khiển..."
                className="flex-1 bg-[#201A16] border border-[#EDE6D6]/15 text-[#EDE6D6] font-serif text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-[#D97C54] transition-all placeholder-[#8A7B6C]"
              />
              <button
                onClick={voiceListening ? stopVoice : () => startVoice()}
                disabled={!voiceSupported || sending}
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-md active:scale-95 border border-[#EDE6D6]/15 ${
                  voiceListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-[#201A16] hover:bg-[#2E2721] text-[#A39282] hover:text-[#EDE6D6] disabled:opacity-40"
                }`}
                title={voiceSupported ? "Nhập bằng giọng nói" : "Trình duyệt chưa hỗ trợ giọng nói"}
              >
                <MicrophoneStage size={16} weight={voiceListening ? "fill" : "bold"} />
              </button>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || sending}
                className="w-9 h-9 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0 shadow-md active:scale-95 border border-[#EDE6D6]/20"
                title="Gửi"
              >
                <PaperPlaneTilt size={16} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}