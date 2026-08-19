import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MusicNotes,
  Play,
  Trash,
  Plus,
  X,
  PencilSimple,
  Globe,
  Lock,
  ShareNetwork,
  Check,
  SpinnerGap,
  Queue,
} from "@phosphor-icons/react";
import { usePlayerStore } from "../usePlayerStore";
import { useAuthStore } from "../useAuthStore";
import { useLibraryStore } from "../useLibraryStore";
import SongTable from "../components/SongTable";
import SourceBadge from "../components/SourceBadge";
import { useToast } from "../components/ToastContext";
import {
  fetchPlaylist,
  fetchSharedPlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  renamePlaylist,
  togglePlaylistPublic,
} from "../api/playlists";
import { fetchSongs } from "../api/songs";

export default function PlaylistPage() {
  const { id } = useParams();
  return <PlaylistView key={id} id={id} />;
}

function PlaylistView({ id }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const loadPlaylists = useLibraryStore((s) => s.loadPlaylists);
  const toast = useToast();
  const toastSuccess = toast?.success;
  const toastError = toast?.error;

  const { currentSong, setCurrentSong, setQueue } = usePlayerStore();

  const [playlist, setPlaylist] = useState(null);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [allSongs, setAllSongs] = useState([]);
  const [addingSongId, setAddingSongId] = useState(null);
  const [renameMode, setRenameMode] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadOwn = () =>
      fetchPlaylist(id)
        .then((data) => {
          if (cancelled) return;
          setIsOwner(true);
          setPlaylist(data);
          setQueue(data.songs);
        })
        .catch(() => {
          return loadShared();
        });

    const loadShared = () =>
      fetchSharedPlaylist(id)
        .then((data) => {
          if (cancelled) return;
          setIsOwner(false);
          setPlaylist(data);
          setQueue(data.songs);
        })
        .catch((e2) => {
          if (cancelled) return;
          setError(e2.message);
        });

    if (user) {
      loadOwn();
    } else {
      loadShared();
    }

    return () => {
      cancelled = true;
    };
  }, [id, setQueue, user]);

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/playlist/${playlist.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toastSuccess("Đã sao chép link chia sẻ");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastError("Không thể sao chép link");
    }
  };

  const handleTogglePublic = async () => {
    setTogglingPublic(true);
    try {
      const result = await togglePlaylistPublic(playlist.id, !playlist.isPublic);
      setPlaylist((prev) => ({ ...prev, isPublic: result.playlist.isPublic }));
      toastSuccess(result.message);
    } catch (err) {
      toastError(err.message);
    } finally {
      setTogglingPublic(false);
    }
  };

  const openAddModal = async () => {
    setShowAddModal(true);
    if (allSongs.length === 0) {
      try {
        const data = await fetchSongs({ limit: 300 });
        setAllSongs(data.songs);
      } catch {
        setAllSongs([]);
      }
    }
  };

  const handlePlayAll = () => {
    if (!playlist || playlist.songs.length === 0) return;
    setCurrentSong(playlist.songs[0]);
  };

  const handleRemoveSong = async (song) => {
    try {
      await removeSongFromPlaylist(playlist.id, song.id);
      setPlaylist((prev) => ({
        ...prev,
        songs: prev.songs.filter((s) => s.id !== song.id),
      }));
      toastSuccess("Đã xóa bài hát khỏi playlist");
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleAddSong = async (song) => {
    setAddingSongId(song.id);
    try {
      await addSongToPlaylist(playlist.id, song.id);
      setPlaylist((prev) => ({ ...prev, songs: [...prev.songs, song] }));
      toastSuccess("Đã thêm bài hát vào playlist");
    } catch (err) {
      toastError(err.message);
    } finally {
      setAddingSongId(null);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!window.confirm(`Xóa playlist "${playlist.title}"?`)) return;
    try {
      await deletePlaylist(playlist.id);
      await loadPlaylists();
      navigate("/");
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleRenamePlaylist = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const result = await renamePlaylist(playlist.id, title);
      setPlaylist((prev) => ({ ...prev, title: result.playlist.title }));
      await loadPlaylists();
      setRenameMode(false);
      toastSuccess("Đã đổi tên playlist");
    } catch (err) {
      toastError(err.message);
    }
  };

  if (!playlist && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-violet-400">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="text-sm text-zinc-400 font-medium">Đang tải playlist...</p>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-rose-400 font-semibold mb-2">Không thể tải playlist</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    );
  }

  const playlistSongs = playlist.songs;
  const selectedSongIds = new Set(playlistSongs.map((s) => s.id));
  const isPlayingThis = currentSong && playlistSongs.some((s) => s.id === currentSong.id);
  const ownerName = playlist.ownerName || user?.name || "";

  return (
    <div className="space-y-6 pb-6 select-none">
      {/* Header Playlist Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#14141c] p-6 sm:p-8 border border-white/10 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 relative z-10">
          <div className="w-40 h-40 sm:w-48 sm:h-48 bg-gradient-to-br from-violet-600 to-fuchsia-700 rounded-2xl flex items-center justify-center text-white shadow-xl flex-shrink-0 border border-white/10">
            <MusicNotes size={64} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-bold tracking-widest text-violet-300 px-3.5 py-1 rounded-full bg-violet-900/30 border border-violet-700/30">
                {isOwner ? "Playlist cá nhân" : "Playlist được chia sẻ"}
              </span>
              {playlist.isPublic !== undefined && (
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                    playlist.isPublic
                      ? "text-emerald-300 bg-emerald-500/10 border-emerald-400/30"
                      : "text-zinc-400 bg-white/5 border-white/10"
                  }`}
                >
                  {playlist.isPublic ? <Globe size={13} /> : <Lock size={13} />}
                  {playlist.isPublic ? "Công khai" : "Riêng tư"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isOwner && renameMode ? (
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenamePlaylist();
                    if (e.key === "Escape") setRenameMode(false);
                  }}
                  autoFocus
                  className="bg-white/10 text-2xl sm:text-4xl font-black tracking-tight px-4 py-1 rounded-2xl outline-none border border-violet-500 text-white w-full max-w-md"
                />
              ) : (
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight truncate text-white">{playlist.title}</h1>
              )}
              {isOwner && (
                <button
                  onClick={() => {
                    setNewTitle(playlist.title);
                    setRenameMode((mode) => !mode);
                  }}
                  className="text-zinc-400 hover:text-violet-300 p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                  title="Đổi tên playlist"
                >
                  <PencilSimple size={18} weight="bold" />
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium">
              <span className="tabular-nums">{playlistSongs.length}</span> bài hát • Tạo bởi <span className="text-white font-bold">{ownerName}</span>
            </p>

            <div className="flex items-center gap-3 pt-3 flex-wrap">
              <button
                onClick={handlePlayAll}
                disabled={playlistSongs.length === 0}
                className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-md shadow-violet-950/60 active:scale-95"
                title={isPlayingThis ? "Đang phát" : "Phát tất cả"}
              >
                <Play size={22} weight="fill" className="ml-0.5" />
              </button>

              {isOwner ? (
                <>
                  <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all active:scale-95"
                  >
                    <Plus size={15} weight="bold" />
                    Thêm bài hát
                  </button>

                  <button
                    onClick={handleTogglePublic}
                    disabled={togglingPublic}
                    className={`flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-full border transition-all active:scale-95 disabled:opacity-60 ${
                      playlist.isPublic
                        ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20"
                        : "text-zinc-300 border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                    title={playlist.isPublic ? "Chuyển về riêng tư" : "Chia sẻ công khai"}
                  >
                    {togglingPublic ? (
                      <SpinnerGap size={14} className="animate-spin" />
                    ) : playlist.isPublic ? (
                      <Globe size={14} />
                    ) : (
                      <Lock size={14} />
                    )}
                    {playlist.isPublic ? "Riêng tư" : "Chia sẻ"}
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all active:scale-95"
                    title="Sao chép link chia sẻ"
                  >
                    {copied ? <Check size={14} weight="bold" className="text-emerald-400" /> : <ShareNetwork size={14} />}
                    {copied ? "Đã chép" : "Sao chép link"}
                  </button>

                  <button
                    onClick={handleDeletePlaylist}
                    className="flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-full text-rose-300 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all active:scale-95"
                  >
                    <Trash size={15} />
                    Xóa playlist
                  </button>
                </>
              ) : (
                <p className="text-xs text-zinc-400 font-medium">Chế độ xem chỉ đọc — đăng nhập để tạo và lưu danh sách phát riêng của bạn.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách bài hát */}
      <div className="pt-2">
        <SongTable
          songs={playlistSongs}
          onRemove={isOwner ? handleRemoveSong : undefined}
          emptyText={isOwner ? "Playlist trống. Nhấn 'Thêm bài hát' để thêm nhạc." : "Playlist này chưa có bài hát nào."}
        />
      </div>

      {/* Modal thêm bài hát */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="glass-panel rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl border border-white/15 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Queue size={18} weight="duotone" className="text-violet-400" />
                Thêm bài hát vào "{playlist.title}"
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {allSongs.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-violet-400">
                  <SpinnerGap size={28} className="animate-spin" />
                </div>
              ) : (
                allSongs.map((song) => {
                  const isAdded = selectedSongIds.has(song.id);
                  return (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 px-4 py-2 rounded-2xl hover:bg-white/5 transition-all"
                    >
                      <img src={song.albumCover} alt={song.title} loading="lazy" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-sm" />
                      <div className="truncate flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-xs font-semibold truncate text-white">{song.title}</p>
                          <SourceBadge source={song.source} />
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate font-medium mt-0.5">{song.artist}</p>
                      </div>
                      <button
                        onClick={() => handleAddSong(song)}
                        disabled={isAdded || addingSongId === song.id}
                        className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-all flex-shrink-0 ${
                          isAdded
                            ? "bg-white/5 text-zinc-500 cursor-default border border-white/5"
                            : "bg-violet-600 hover:bg-violet-500 text-white shadow-sm active:scale-95"
                        }`}
                      >
                        {addingSongId === song.id ? (
                          <SpinnerGap size={14} className="animate-spin" />
                        ) : isAdded ? (
                          "Đã thêm"
                        ) : (
                          "Thêm"
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
