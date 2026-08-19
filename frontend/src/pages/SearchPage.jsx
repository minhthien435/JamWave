import { useEffect, useState } from "react";
import {
  MagnifyingGlass,
  Sliders,
  X,
  SpinnerGap,
  Globe,
  CalendarBlank,
  MusicNotes,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { fetchSongs, fetchFacets } from "../api/songs";
import { usePlayerStore } from "../usePlayerStore";
import SongTable from "../components/SongTable";

const PAGE_SIZE = 100;

const COUNTRY_MAP = {
  US: { name: "Hoa Kỳ", flag: "🇺🇸" },
  VN: { name: "Việt Nam", flag: "🇻🇳" },
  GB: { name: "Anh Quốc", flag: "🇬🇧" },
  UK: { name: "Anh Quốc", flag: "🇬🇧" },
  FR: { name: "Pháp", flag: "🇫🇷" },
  DE: { name: "Đức", flag: "🇩🇪" },
  JP: { name: "Nhật Bản", flag: "🇯🇵" },
  KR: { name: "Hàn Quốc", flag: "🇰🇷" },
  CA: { name: "Canada", flag: "🇨🇦" },
  AU: { name: "Úc", flag: "🇦🇺" },
  ES: { name: "Tây Ban Nha", flag: "🇪🇸" },
  IT: { name: "Ý", flag: "🇮🇹" },
  RU: { name: "Nga", flag: "🇷🇺" },
  UA: { name: "Ukraina", flag: "🇺🇦" },
  SE: { name: "Thụy Điển", flag: "🇸🇪" },
  NO: { name: "Na Uy", flag: "🇳🇴" },
  NL: { name: "Hà Lan", flag: "🇳🇱" },
  BE: { name: "Bỉ", flag: "🇧🇪" },
  FI: { name: "Phần Lan", flag: "🇫🇮" },
  PL: { name: "Ba Lan", flag: "🇵🇱" },
  BR: { name: "Brazil", flag: "🇧🇷" },
  CN: { name: "Trung Quốc", flag: "🇨🇳" },
  IN: { name: "Ấn Độ", flag: "🇮🇳" },
  MX: { name: "Mexico", flag: "🇲🇽" },
  AR: { name: "Argentina", flag: "🇦🇷" },
  IE: { name: "Ireland", flag: "🇮🇪" },
  PT: { name: "Bồ Đào Nha", flag: "🇵🇹" },
  DK: { name: "Đan Mạch", flag: "🇩🇰" },
  GR: { name: "Hy Lạp", flag: "🇬🇷" },
  IL: { name: "Israel", flag: "🇮🇱" },
  CH: { name: "Thụy Sĩ", flag: "🇨🇭" },
  AT: { name: "Áo", flag: "🇦🇹" },
};

const formatCountryName = (code) => {
  if (!code) return "Tất cả quốc gia";
  const upper = code.toUpperCase();
  const info = COUNTRY_MAP[upper];
  return info ? `${info.flag} ${info.name} (${upper})` : `${upper}`;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [facets, setFacets] = useState({ genres: [], years: [], countries: [] });
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [country, setCountry] = useState("");
  const [songs, setSongs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const setQueue = usePlayerStore((s) => s.setQueue);

  useEffect(() => {
    fetchFacets()
      .then((data) => setFacets(data))
      .catch(() => { });
  }, []);

  // Debounce: chỉ tìm kiếm sau khi ngừng gõ 350ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const hasFilter = Boolean(genre || year || country);

  useEffect(() => {
    let cancelled = false;

    const search = async () => {
      setLoading(true);
      try {
        const data = await fetchSongs({
          q: debouncedQuery,
          genre,
          year,
          country,
          limit: PAGE_SIZE,
          offset: 0,
        });
        if (!cancelled) {
          setSongs(data.songs);
          setTotal(data.total);
          setQueue(data.songs);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setSongs([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    search();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, genre, year, country, setQueue]);

  // Tải thêm 100 bài tiếp theo
  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchSongs({
        q: debouncedQuery,
        genre,
        year,
        country,
        limit: PAGE_SIZE,
        offset: songs.length,
      });
      setSongs((prev) => [...prev, ...data.songs]);
      setTotal(data.total);
      setQueue((prev) => [...prev, ...data.songs]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleResetFilters = () => {
    setGenre("");
    setYear("");
    setCountry("");
    setOpenDropdown(null);
  };

  const [openDropdown, setOpenDropdown] = useState(null); // "genre" | "country" | "year" | null

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".filter-dropdown-container")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-6 pb-6 select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dashed-indie pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#2E2721] border border-[#EDE6D6]/20 flex items-center justify-center text-[#D97C54] shadow-md">
            <MagnifyingGlass size={22} weight="bold" />
          </div>
          <div>
            <h1 className="font-serif italic font-bold text-2xl sm:text-3xl text-[#EDE6D6]">
              Tìm Kiếm Bài Hát & Nghệ Sĩ
            </h1>
            <p className="font-mono text-xs text-[#A39282]">
              Khám phá thư viện âm nhạc độc lập theo từ khóa hoặc bộ lọc chi tiết
            </p>
          </div>
        </div>
      </div>

      {/* Input Search Box */}
      <div className="relative max-w-2xl">
        <MagnifyingGlass className="absolute left-4 top-3.5 text-[#D97C54]" size={20} weight="bold" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên bài hát, ca sĩ, album..."
          autoFocus
          className="w-full bg-[#26211C] border border-[#EDE6D6]/15 text-[#EDE6D6] pl-12 pr-10 py-3.5 rounded-2xl outline-none focus:border-[#D97C54] transition-all font-serif text-sm placeholder-[#8A7B6C] shadow-inner"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-3.5 text-[#A39282] hover:text-[#EDE6D6] transition-colors p-1"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* THANH BỘ LỌC GỌN GÀNG 1 HÀNG NGANG (COMPACT POPOVER PILLS) */}
      <div className="flex flex-wrap items-center gap-2.5 filter-dropdown-container relative z-20">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#A39282] flex items-center gap-1.5 mr-1">
          <Sliders size={15} weight="duotone" className="text-[#D97C54]" />
          Lọc:
        </span>

        {/* 1. Dropdown Thể Loại */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown((prev) => (prev === "genre" ? null : "genre"))}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs font-semibold border transition-all active:scale-95 ${
              genre
                ? "bg-[#B85C38] text-[#EDE6D6] border-[#D97C54] shadow-sm"
                : "bg-[#26211C] border-[#EDE6D6]/15 text-[#EDE6D6] hover:bg-[#2E2721] hover:border-[#D97C54]/30"
            }`}
          >
            <MusicNotes size={14} weight="duotone" className={genre ? "text-[#EDE6D6]" : "text-[#D97C54]"} />
            <span>{genre ? `Thể loại: ${genre}` : "Thể loại: Tất cả"}</span>
            <span className="text-[10px] opacity-70 ml-0.5">▼</span>
          </button>

          {openDropdown === "genre" && (
            <div className="absolute top-full left-0 mt-2 w-72 max-h-64 overflow-y-auto indie-panel rounded-2xl p-2.5 border-dashed-indie shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => {
                    setGenre("");
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl font-mono text-xs transition-all ${
                    !genre
                      ? "bg-[#B85C38] text-[#EDE6D6] font-bold"
                      : "text-[#EDE6D6] hover:bg-[#26211C] hover:text-[#D97C54]"
                  }`}
                >
                  Tất cả thể loại
                </button>
                {facets.genres.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => {
                      setGenre(g.value);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-mono text-xs flex items-center justify-between transition-all ${
                      genre === g.value
                        ? "bg-[#B85C38] text-[#EDE6D6] font-bold"
                        : "text-[#EDE6D6] hover:bg-[#26211C] hover:text-[#D97C54]"
                    }`}
                  >
                    <span>{g.value}</span>
                    <span className="text-[10px] opacity-60">({g.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Dropdown Quốc Gia */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown((prev) => (prev === "country" ? null : "country"))}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs font-semibold border transition-all active:scale-95 ${
              country
                ? "bg-[#76876F] text-[#EDE6D6] border-[#76876F] shadow-sm"
                : "bg-[#26211C] border-[#EDE6D6]/15 text-[#EDE6D6] hover:bg-[#2E2721] hover:border-[#76876F]/40"
            }`}
          >
            <Globe size={14} weight="duotone" className={country ? "text-[#EDE6D6]" : "text-[#76876F]"} />
            <span>{country ? formatCountryName(country) : "Quốc gia: Tất cả"}</span>
            <span className="text-[10px] opacity-70 ml-0.5">▼</span>
          </button>

          {openDropdown === "country" && (
            <div className="absolute top-full left-0 mt-2 w-80 max-h-64 overflow-y-auto indie-panel rounded-2xl p-2.5 border-dashed-indie shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => {
                    setCountry("");
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl font-mono text-xs transition-all ${
                    !country
                      ? "bg-[#76876F] text-[#EDE6D6] font-bold"
                      : "text-[#EDE6D6] hover:bg-[#26211C] hover:text-[#76876F]"
                  }`}
                >
                  Tất cả quốc gia
                </button>
                {facets.countries.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      setCountry(c.value);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-mono text-xs flex items-center justify-between transition-all ${
                      country === c.value
                        ? "bg-[#76876F] text-[#EDE6D6] font-bold"
                        : "text-[#EDE6D6] hover:bg-[#26211C] hover:text-[#76876F]"
                    }`}
                  >
                    <span>{formatCountryName(c.value)}</span>
                    <span className="text-[10px] opacity-60">({c.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Dropdown Năm */}
        {facets.years.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setOpenDropdown((prev) => (prev === "year" ? null : "year"))}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs font-semibold border transition-all active:scale-95 ${
                year
                  ? "bg-[#E0B35C] text-[#201A16] border-[#E0B35C] font-bold shadow-sm"
                  : "bg-[#26211C] border-[#EDE6D6]/15 text-[#EDE6D6] hover:bg-[#2E2721] hover:border-[#E0B35C]/40"
              }`}
            >
              <CalendarBlank size={14} weight="duotone" className={year ? "text-[#201A16]" : "text-[#E0B35C]"} />
              <span>{year ? `Năm: ${year}` : "Năm: Tất cả"}</span>
              <span className="text-[10px] opacity-70 ml-0.5">▼</span>
            </button>

            {openDropdown === "year" && (
              <div className="absolute top-full left-0 mt-2 w-56 max-h-64 overflow-y-auto indie-panel rounded-2xl p-2.5 border-dashed-indie shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => {
                      setYear("");
                      setOpenDropdown(null);
                    }}
                    className={`col-span-2 text-left px-3 py-2 rounded-xl font-mono text-xs transition-all ${
                      !year
                        ? "bg-[#E0B35C] text-[#201A16] font-bold"
                        : "text-[#EDE6D6] hover:bg-[#26211C] hover:text-[#E0B35C]"
                    }`}
                  >
                    Tất cả năm
                  </button>
                  {facets.years.map((y) => (
                    <button
                      key={y.value}
                      onClick={() => {
                        setYear(y.value);
                        setOpenDropdown(null);
                      }}
                      className={`text-center px-2 py-1.5 rounded-xl font-mono text-xs transition-all ${
                        year === y.value
                          ? "bg-[#E0B35C] text-[#201A16] font-bold"
                          : "text-[#EDE6D6] hover:bg-[#26211C] hover:text-[#E0B35C]"
                      }`}
                    >
                      {y.value}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nút Xóa Lọc */}
        {hasFilter && (
          <button
            onClick={handleResetFilters}
            className="font-mono text-xs text-[#D97C54] hover:text-[#EDE6D6] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#B85C38]/15 border border-[#B85C38]/30 transition-all active:scale-95 ml-auto sm:ml-0"
          >
            <ArrowCounterClockwise size={13} weight="bold" />
            <span>Xóa lọc</span>
          </button>
        )}
      </div>

      {/* Danh sách kết quả */}
      {loading && songs.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[#D97C54]">
          <SpinnerGap size={32} className="animate-spin" />
        </div>
      ) : error && songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-mono text-sm text-red-400 mb-2">Không thể tìm kiếm bài hát</p>
          <p className="font-mono text-xs text-[#A39282]">{error}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-dashed-indie pb-2 pt-2">
            <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6]">
              {debouncedQuery.trim() ? `KẾT QUẢ CHO: "${debouncedQuery.trim()}"` : "TẤT CẢ BÀI HÁT TÌM THẤY"}
              <span className="font-mono text-[11px] text-[#A39282] ml-2">({total} bài)</span>
            </h3>
          </div>
          <SongTable songs={songs} emptyText="Không tìm thấy bài hát nào khớp với từ khóa hoặc bộ lọc" />
          {songs.length < total && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2 border border-[#EDE6D6]/20 shadow-md"
              >
                {loadingMore ? <SpinnerGap size={16} className="animate-spin" /> : null}
                Tải thêm ({total - songs.length} bài còn lại)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
