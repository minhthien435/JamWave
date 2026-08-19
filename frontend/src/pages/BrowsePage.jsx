import { useEffect, useState } from "react";
import {
  Compass,
  Sparkle,
  Funnel,
  ArrowCounterClockwise,
  SpinnerGap,
} from "@phosphor-icons/react";
import { fetchSongs, fetchFacets, fetchMoodSongs } from "../api/songs";
import { usePlayerStore } from "../usePlayerStore";
import SongTable from "../components/SongTable";

const PAGE_SIZE = 100;

const MOODS = [
  { key: "chill", label: "Thư giãn", query: "thư giãn chill nhẹ nhàng calm" },
  { key: "focus", label: "Tập trung", query: "tập trung focus study coding deep work" },
  { key: "gym", label: "Tập luyện", query: "gym tập luyện workout running energy mạnh mẽ" },
  { key: "rain", label: "Mưa đêm buồn", query: "mưa đêm buồn cô đơn melancholic nostalgic" },
  { key: "party", label: "Tiệc tùng", query: "party club dance quẩy sôi động" },
  { key: "love", label: "Lãng mạn", query: "yêu lãng mạn romantic love" },
  { key: "sleep", label: "Dễ ngủ", query: "ngủ ngủ ngon dễ ngủ sleep" },
  { key: "happy", label: "Sảng khoái", query: "vui sảng khoái happy upbeat fun" },
];

const GENRE_COLORS = [
  "from-violet-600/80 via-purple-900/40 to-[#14141c]",
  "from-rose-600/80 via-pink-900/40 to-[#14141c]",
  "from-cyan-600/80 via-blue-900/40 to-[#14141c]",
  "from-emerald-600/80 via-teal-900/40 to-[#14141c]",
  "from-amber-600/80 via-orange-900/40 to-[#14141c]",
  "from-fuchsia-600/80 via-purple-900/40 to-[#14141c]",
  "from-sky-600/80 via-indigo-900/40 to-[#14141c]",
  "from-teal-600/80 via-emerald-950/40 to-[#14141c]",
];

const COUNTRY_FLAGS = {
  US: "🇺🇸", FR: "🇫🇷", ES: "🇪🇸", GB: "🇬🇧", IT: "🇮🇹", DE: "🇩🇪",
  RU: "🇷🇺", UA: "🇺🇦", CA: "🇨🇦", JP: "🇯🇵", BE: "🇧🇪", FI: "🇫🇮",
  NL: "🇳🇱", SE: "🇸🇪", NO: "🇳🇴", PL: "🇵🇱", BR: "🇧🇷", AU: "🇦🇺",
  AT: "🇦🇹", CH: "🇨🇭", MX: "🇲🇽", AR: "🇦🇷", IE: "🇮🇪", PT: "🇵🇹",
  DK: "🇩🇰", GR: "🇬🇷", IL: "🇮🇱", IN: "🇮🇳", KR: "🇰🇷", CN: "🇨🇳",
};

const countryLabel = (code) => {
  const flag = COUNTRY_FLAGS[code.toUpperCase()];
  return flag ? `${flag} ${code.toUpperCase()}` : code.toUpperCase();
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
    if (mood) return; // chế độ tâm trạng: fetch riêng trong handleMoodClick

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
        setSongs([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeGenre, year, country, sort, mood, setQueue]);

  // Reset trạng thái tải khi thay đổi bộ lọc (gọi trong event handler để tránh setState trong effect)
  const selectFilter = (setter, value) => {
    setLoading(true);
    setError(null);
    setter(value);
  };

  const handleReset = () => {
    setLoading(true);
    setError(null);
    setMood(null);
    setActiveGenre("");
    setYear("");
    setCountry("");
    setSort("");
  };

  // Chọn tâm trạng: fetch nhạc theo vibe + phát liền
  const handleMoodClick = async (m) => {
    if (mood?.key === m.key) {
      setMood(null);
      setLoading(true);
      setError(null);
      return;
    }

    setMood(m);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMoodSongs(m.query, 30);
      const moodSongs = data.songs || [];
      setSongs(moodSongs);
      setTotal(moodSongs.length);
      setQueue(moodSongs);
      if (moodSongs.length > 0) setCurrentSong(moodSongs[0]);
    } catch (err) {
      setError(err.message);
      setSongs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
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
    "bg-white/5 border border-white/10 text-white px-3.5 py-2.5 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm cursor-pointer";

  return (
    <div className="space-y-8 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-white">
          <Compass size={24} weight="duotone" />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Khám phá</h2>
          <p className="text-sm text-zinc-400 font-medium">Lọc nhạc theo thể loại, năm, quốc gia</p>
        </div>
      </div>

      {/* Khám phá theo tâm trạng */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold tracking-tight text-zinc-300 uppercase flex items-center gap-2">
          <Sparkle size={16} weight="fill" className="text-violet-400" />
          Khám phá theo tâm trạng
        </h3>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => handleMoodClick(m)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 active:scale-95 ${
                mood?.key === m.key
                  ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-950/60"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* Lưới thể loại (không active filter) */}
      {!hasFilter && !mood && (
        <section>
          <h3 className="text-sm font-bold tracking-tight text-zinc-300 uppercase mb-4 flex items-center gap-2">
            <Funnel size={16} weight="duotone" className="text-violet-400" />
            Thể loại phổ biến
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {facets.genres.map((g, i) => (
              <button
                key={g.value}
                onClick={() => selectFilter(setActiveGenre, g.value)}
                className={`relative overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br ${
                  GENRE_COLORS[i % GENRE_COLORS.length]
                } border border-white/10 hover:border-violet-500/40 hover:-translate-y-1 active:scale-95 transition-all duration-200 shadow-md group`}
              >
                <p className="font-bold text-sm text-white truncate pr-2 group-hover:text-violet-300 transition-colors">
                  {g.value}
                </p>
                <p className="text-[11px] text-zinc-400 font-medium tabular-nums mt-1">{g.count} bài</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Bộ lọc */}
      <section className="glass-card rounded-2xl border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Funnel size={15} weight="duotone" className="text-violet-400" />
            Bộ lọc chi tiết
          </h3>
          {(hasFilter || mood) && (
            <button
              onClick={handleReset}
              className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowCounterClockwise size={13} weight="bold" /> Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <select value={activeGenre} onChange={(e) => selectFilter(setActiveGenre, e.target.value)} className={selectClass}>
            <option value="" className="bg-[#14141a]">Thể loại: Tất cả</option>
            {facets.genres.map((g) => (
              <option key={g.value} value={g.value} className="bg-[#14141a]">{g.value}</option>
            ))}
          </select>

          <select value={year} onChange={(e) => selectFilter(setYear, e.target.value)} className={selectClass}>
            <option value="" className="bg-[#14141a]">Năm: Tất cả</option>
            {facets.years.map((y) => (
              <option key={y.value} value={y.value} className="bg-[#14141a]">{y.value}</option>
            ))}
          </select>

          <select value={country} onChange={(e) => selectFilter(setCountry, e.target.value)} className={selectClass}>
            <option value="" className="bg-[#14141a]">Quốc gia: Tất cả</option>
            {facets.countries.map((c) => (
              <option key={c.value} value={c.value} className="bg-[#14141a]">{countryLabel(c.value)}</option>
            ))}
          </select>

          <select value={sort} onChange={(e) => selectFilter(setSort, e.target.value)} className={selectClass}>
            <option value="" className="bg-[#14141a]">Sắp xếp: Mặc định</option>
            <option value="year_desc" className="bg-[#14141a]">Mới nhất</option>
            <option value="year_asc" className="bg-[#14141a]">Cũ nhất</option>
            <option value="title" className="bg-[#14141a]">A-Z</option>
          </select>
        </div>
      </section>

      {/* Kết quả */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-violet-400">
          <SpinnerGap size={32} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-rose-400 font-semibold mb-2">Không thể tải danh sách bài hát</p>
          <p className="text-zinc-500 text-sm">{error}</p>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-bold tracking-tight text-white">
            {mood
              ? `Tâm trạng: ${mood.label}`
              : hasFilter
                ? [activeGenre, year, country].filter(Boolean).join(" • ")
                : "Tất cả bài hát"}
            <span className="text-sm font-medium tabular-nums text-zinc-400 ml-2">({total} bài)</span>
          </h3>
          <SongTable songs={songs} emptyText="Không có bài hát nào khớp với bộ lọc" />
          {songs.length < total && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2 border border-white/10"
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
