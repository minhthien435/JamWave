import { useEffect, useState } from "react";
import {
  Compass,
  Sparkle,
  Funnel,
  ArrowCounterClockwise,
  SpinnerGap,
  CassetteTape,
  Tag,
} from "@phosphor-icons/react";
import { fetchSongs, fetchFacets, fetchMoodSongs } from "../api/songs";
import { usePlayerStore } from "../usePlayerStore";
import SongTable from "../components/SongTable";

const PAGE_SIZE = 100;

const MOODS = [
  { key: "chill", label: "Thư giãn (Chill)", query: "thư giãn chill nhẹ nhàng calm" },
  { key: "focus", label: "Tập trung (Study)", query: "tập trung focus study coding deep work" },
  { key: "gym", label: "Năng lượng (Energy)", query: "gym tập luyện workout running energy mạnh mẽ" },
  { key: "rain", label: "Mưa đêm (Nostalgia)", query: "mưa đêm buồn cô đơn melancholic nostalgic" },
  { key: "party", label: "Sôi động (Dance)", query: "party club dance quẩy sôi động" },
  { key: "love", label: "Lãng mạn (Romance)", query: "yêu lãng mạn romantic love" },
  { key: "sleep", label: "Dễ ngủ (Sleep)", query: "ngủ ngủ ngon dễ ngủ sleep" },
  { key: "happy", label: "Vui tươi (Upbeat)", query: "vui sảng khoái happy upbeat fun" },
];

const GENRE_BG_COLORS = [
  "bg-[#382D24] border-[#D97C54]/40 text-[#EDE6D6]",
  "bg-[#2A3326] border-[#76876F]/40 text-[#EDE6D6]",
  "bg-[#3B3426] border-[#E0B35C]/40 text-[#EDE6D6]",
  "bg-[#382622] border-[#D97C54]/40 text-[#EDE6D6]",
  "bg-[#2B2B38] border-[#A39282]/40 text-[#EDE6D6]",
  "bg-[#332530] border-[#D97C54]/40 text-[#EDE6D6]",
  "bg-[#223330] border-[#76876F]/40 text-[#EDE6D6]",
  "bg-[#302B25] border-[#E0B35C]/40 text-[#EDE6D6]",
];

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

const countryLabel = (code) => {
  if (!code) return "Quốc gia: Tất cả";
  const upper = code.toUpperCase();
  const info = COUNTRY_MAP[upper];
  return info ? `${info.flag} ${info.name} (${upper})` : code.toUpperCase();
};

export default function BrowsePage() {
  const [facets, setFacets] = useState({ genres: [], years: [], countries: [] });
  const [activeGenre, setActiveGenre] = useState("");
  const [year, setYear] = useState("");
  const [country, setCountry] = useState("");
  const [sort, setSort] = useState("");
  const [mood, setMood] = useState(null);
  const [songs, setSongs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const setQueue = usePlayerStore((s) => s.setQueue);
  const setCurrentSong = usePlayerStore((s) => s.setCurrentSong);

  useEffect(() => {
    let cancelled = false;
    fetchFacets()
      .then((data) => {
        if (!cancelled) setFacets(data);
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasFilter = Boolean(activeGenre || year || country);

  useEffect(() => {
    let cancelled = false;
    if (mood) return;

    fetchSongs({
      genre: activeGenre,
      year,
      country,
      sort,
      limit: PAGE_SIZE,
      offset: 0,
    })
      .then((data) => {
        if (cancelled) return;
        setSongs(data.songs);
        setTotal(data.total);
        setQueue(data.songs);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeGenre, year, country, sort, mood, setQueue]);

  const handleMoodClick = async (m) => {
    if (mood?.key === m.key) {
      setMood(null);
      setLoading(true);
      return;
    }

    setMood(m);
    setActiveGenre("");
    setYear("");
    setCountry("");
    setLoading(true);
    setError(null);

    try {
      const data = await fetchMoodSongs(m.query, 60);
      setSongs(data.songs || []);
      setTotal(data.total || 0);
      if (data.songs?.length > 0) {
        setQueue(data.songs);
      }
    } catch (err) {
      setError(err.message);
      setSongs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveGenre("");
    setYear("");
    setCountry("");
    setSort("");
    setMood(null);
    setLoading(true);
  };

  const selectFilter = (setter, value) => {
    setMood(null);
    setter(value);
    setLoading(true);
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchSongs({
        genre: activeGenre,
        year,
        country,
        sort,
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

  const selectClass =
    "bg-[#26211C] border border-[#EDE6D6]/15 text-[#EDE6D6] px-3.5 py-2.5 rounded-xl outline-none focus:border-[#D97C54] transition-all font-mono text-xs cursor-pointer";

  return (
    <div className="space-y-8 pb-6 font-sans select-none">
      {/* Header Stamp */}
      <div className="flex items-center gap-3 border-b border-dashed-indie pb-4">
        <div className="w-12 h-12 rounded-xl bg-[#2E2721] border border-[#EDE6D6]/20 flex items-center justify-center text-[#D97C54] shadow-md">
          <Compass size={24} weight="duotone" />
        </div>
        <div>
          <h1 className="font-serif italic font-bold text-2xl sm:text-3xl text-[#EDE6D6]">Góc Khám Phá</h1>
          <p className="font-mono text-xs text-[#A39282]">Lọc bài hát theo thể loại, tâm trạng, năm & quốc gia</p>
        </div>
      </div>

      {/* Khám phá theo tâm trạng (Mood Chips) */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2">
          <Sparkle size={15} weight="fill" className="text-[#D97C54]" />
          CHỌN THEO TÂM TRẠNG (MOOD)
        </h3>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => handleMoodClick(m)}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold border transition-all duration-150 active:scale-95 ${
                mood?.key === m.key
                  ? "bg-[#B85C38] text-[#EDE6D6] border-[#D97C54] shadow-md"
                  : "bg-[#26211C] border-[#EDE6D6]/15 text-[#A39282] hover:bg-[#2E2721] hover:text-[#EDE6D6]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* Lưới thể loại */}
      {!hasFilter && !mood && (
        <section className="space-y-3">
          <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6] flex items-center gap-2">
            <CassetteTape size={16} weight="duotone" className="text-[#D97C54]" />
            THỂ LOẠI PHỔ BIẾN
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {facets.genres.map((g, i) => (
              <button
                key={g.value}
                onClick={() => selectFilter(setActiveGenre, g.value)}
                className={`relative overflow-hidden rounded-xl p-4 text-left border ${
                  GENRE_BG_COLORS[i % GENRE_BG_COLORS.length]
                } hover:-translate-y-1 active:scale-95 transition-all duration-200 shadow-md group`}
              >
                <p className="font-serif italic font-bold text-sm truncate pr-2 group-hover:text-[#D97C54] transition-colors">
                  {g.value}
                </p>
                <p className="font-mono text-[10px] text-[#A39282] mt-1">{g.count} bài hát</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Bộ lọc chi tiết */}
      <section className="indie-panel rounded-2xl border-dashed-indie p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-dashed-indie pb-2.5">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#EDE6D6] flex items-center gap-2">
            <Funnel size={14} weight="duotone" className="text-[#D97C54]" />
            BỘ LỌC CHI TIẾT
          </h3>
          {(hasFilter || mood) && (
            <button
              onClick={handleReset}
              className="font-mono text-[11px] text-[#A39282] hover:text-[#D97C54] flex items-center gap-1.5 transition-colors"
            >
              <ArrowCounterClockwise size={12} weight="bold" /> Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <select value={activeGenre} onChange={(e) => selectFilter(setActiveGenre, e.target.value)} className={selectClass}>
            <option value="">Thể loại: Tất cả</option>
            {facets.genres.map((g) => (
              <option key={g.value} value={g.value}>{g.value}</option>
            ))}
          </select>

          <select value={year} onChange={(e) => selectFilter(setYear, e.target.value)} className={selectClass}>
            <option value="">Năm: Tất cả</option>
            {facets.years.map((y) => (
              <option key={y.value} value={y.value}>{y.value}</option>
            ))}
          </select>

          <select value={country} onChange={(e) => selectFilter(setCountry, e.target.value)} className={selectClass}>
            <option value="">Quốc gia: Tất cả</option>
            {facets.countries.map((c) => (
              <option key={c.value} value={c.value}>{countryLabel(c.value)}</option>
            ))}
          </select>

          <select value={sort} onChange={(e) => selectFilter(setSort, e.target.value)} className={selectClass}>
            <option value="">Sắp xếp: Mặc định</option>
            <option value="year_desc">Năm mới nhất</option>
            <option value="year_asc">Năm cũ nhất</option>
            <option value="title">Tên bài (A-Z)</option>
          </select>
        </div>
      </section>

      {/* Kết quả */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#D97C54]">
          <SpinnerGap size={30} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-mono text-sm text-red-400 mb-2">Không thể tải danh sách bài hát</p>
          <p className="font-mono text-xs text-[#A39282]">{error}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-dashed-indie pb-2">
            <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EDE6D6]">
              {mood
                ? `TÂM TRẠNG: ${mood.label.toUpperCase()}`
                : hasFilter
                  ? [activeGenre, year, country].filter(Boolean).join(" • ").toUpperCase()
                  : "TẤT CẢ BÀI HÁT"}
              <span className="font-mono text-[11px] text-[#A39282] ml-2">({total} bài)</span>
            </h3>
          </div>
          <SongTable songs={songs} emptyText="Không có bài hát nào khớp với bộ lọc" />
          {songs.length < total && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl bg-[#26211C] hover:bg-[#2E2721] text-[#EDE6D6] font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2 border border-[#EDE6D6]/15 shadow-sm"
              >
                {loadingMore ? <SpinnerGap size={14} className="animate-spin" /> : null}
                Tải thêm ({total - songs.length} bài còn lại)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
