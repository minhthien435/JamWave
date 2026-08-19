import { useEffect, useRef, useState } from "react";
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
  DownloadSimple,
  UploadSimple,
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
  updatePlaylistCover,
  downloadPlaylist,
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
  const [uploadingCover, setUploadingCover] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const coverInputRef = useRef(null);

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

  const handleCoverFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toastError("Chỉ hỗ trợ ảnh JPG/PNG/WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError("Ảnh tối đa 5MB");
      return;
    }
    setUploadingCover(true);
    try {
      const result = await updatePlaylistCover(playlist.id, file);
      setPlaylist((prev) => ({ ...prev, coverImg: result.playlist.coverImg }));
      await loadPlaylists();
      toastSuccess("Đã cập nhật ảnh bìa playlist");
    } catch (err) {
      toastError(err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDownloadZip = async () => {
    if (downloadingZip) return;
    setDownloadingZip(true);
    try {
      await downloadPlaylist(playlist.id, `${playlist.title}.zip`);
    } catch (err) {
      toastError(err.message);
    } finally {
      setDownloadingZip(false);
    }
  };

  if (!playlist && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#D97C54] font-sans">
        <SpinnerGap size={32} className="animate-spin mb-3" />
        <p className="font-mono text-xs text-[#A39282]">Đang tải playlist...</p>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center font-sans">
        <p className="font-mono text-sm text-red-400 mb-2">Không thể tải playlist</p>
        <p className="font-mono text-xs text-[#A39282]">{error}</p>
      </div>
    );
  }

  const playlistSongs = playlist.songs;
  const selectedSongIds = new Set(playlistSongs.map((s) => s.id));
  const isPlayingThis = currentSong && playlistSongs.some((s) => s.id === currentSong.id);
  const ownerName = playlist.ownerName || user?.name || "";

  return (
    <div className="space-y-6 pb-6 font-sans select-none">
      {/* Header Playlist Banner */}
      <div className="relative overflow-hidden rounded-2xl indie-panel p-6 sm:p-8 border-dashed-indie shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 relative z-10">
          {/* Cover */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 bg-[#26211C] border border-[#EDE6D6]/20 rounded-xl flex items-center justify-center text-[#D97C54] shadow-xl flex-shrink-0 relative overflow-hidden">
            <div className="washi-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-3.5 rounded-sm rotate-2 z-10" />
            {playlist.coverImg ? (
              <img src={playlist.coverImg} alt={playlist.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <MusicNotes size={56} weight="duotone" />
            )}
            {isOwner && (
              <>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleCoverFile}
                />
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 opacity-0 hover:opacity-100 transition-opacity text-[#EDE6D6]"
                  title="Đổi ảnh bìa playlist"
                >
                  {uploadingCover ? (
                    <SpinnerGap size={22} className="animate-spin" />
                  ) : (
                    <>
                      <UploadSimple size={22} weight="duotone" />
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Đổi ảnh</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap font-mono">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#D97C54] px-3 py-0.5 rounded-full bg-[#B85C38]/20 border border-[#B85C38]/30">
                {isOwner ? "PLAYLIST CỦA TÔI" : "PLAYLIST CHIA SẺ"}
              </span>
              {playlist.isPublic !== undefined && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                    playlist.isPublic
                      ? "text-[#76876F] bg-[#76876F]/15 border-[#76876F]/30"
                      : "text-[#A39282] bg-[#26211C] border-[#EDE6D6]/10"
                  }`}
                >
                  {playlist.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                  {playlist.isPublic ? "Công Khai" : "Riêng Tư"}
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
                  className="bg-[#201A16] font-serif italic text-2xl sm:text-3xl font-bold px-3 py-1 rounded-xl outline-none border border-[#D97C54] text-[#EDE6D6] w-full max-w-md"
                />
              ) : (
                <h1 className="font-serif italic text-2xl sm:text-4xl font-bold tracking-tight truncate text-[#EDE6D6]">
                  {playlist.title}
                </h1>
              )}
              {isOwner && (
                <button
                  onClick={() => {
                    setNewTitle(playlist.title);
                    setRenameMode((mode) => !mode);
                  }}
                  className="text-[#A39282] hover:text-[#D97C54] p-1.5 rounded-xl hover:bg-[#26211C] transition-colors flex-shrink-0"
                  title="Đổi tên playlist"
                >
                  <PencilSimple size={16} weight="bold" />
                </button>
              )}
            </div>

            <p className="font-mono text-xs text-[#A39282]">
              <span>{playlistSongs.length}</span> bài hát • Tạo bởi <span className="text-[#EDE6D6] font-bold">{ownerName}</span>
            </p>

            {/* Action Bar */}
            <div className="flex items-center gap-2.5 pt-2 flex-wrap font-mono text-xs">
              <button
                onClick={handlePlayAll}
                disabled={playlistSongs.length === 0}
                className="w-11 h-11 rounded-xl bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] flex items-center justify-center disabled:opacity-40 transition-all shadow-md active:scale-95 border border-[#EDE6D6]/20"
                title={isPlayingThis ? "Đang phát" : "Phát playlist"}
              >
                <Play size={18} weight="fill" className="ml-0.5" />
              </button>

              <button
                onClick={handleDownloadZip}
                disabled={downloadingZip || playlistSongs.length === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#26211C] hover:bg-[#2E2721] border border-[#EDE6D6]/15 text-[#EDE6D6] transition-all active:scale-95 disabled:opacity-50"
                title="Tải playlist dạng ZIP"
              >
                {downloadingZip ? (
                  <SpinnerGap size={13} className="animate-spin" />
                ) : (
                  <DownloadSimple size={13} weight="duotone" />
                )}
                Tải ZIP
              </button>

              {isOwner ? (
                <>
                  <button
                    onClick={openAddModal}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#26211C] hover:bg-[#2E2721] border border-[#EDE6D6]/15 text-[#EDE6D6] transition-all active:scale-95"
                  >
                    <Plus size={14} weight="bold" />
                    Thêm bài hát
                  </button>

                  <button
                    onClick={handleTogglePublic}
                    disabled={togglingPublic}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border transition-all active:scale-95 disabled:opacity-60 ${
                      playlist.isPublic
                        ? "text-[#76876F] border-[#76876F]/30 bg-[#76876F]/10 hover:bg-[#76876F]/20"
                        : "text-[#A39282] border-[#EDE6D6]/15 bg-[#26211C] hover:bg-[#2E2721]"
                    }`}
                    title={playlist.isPublic ? "Chuyển về riêng tư" : "Chia sẻ công khai"}
                  >
                    {togglingPublic ? (
                      <SpinnerGap size={13} className="animate-spin" />
                    ) : playlist.isPublic ? (
                      <Globe size={13} />
                    ) : (
                      <Lock size={13} />
                    )}
                    {playlist.isPublic ? "Riêng tư" : "Chia sẻ"}
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#26211C] hover:bg-[#2E2721] border border-[#EDE6D6]/15 text-[#EDE6D6] transition-all active:scale-95"
                    title="Sao chép link chia sẻ"
                  >
                    {copied ? <Check size={13} weight="bold" className="text-[#76876F]" /> : <ShareNetwork size={13} />}
                    {copied ? "Đã chép" : "Chép link"}
                  </button>

                  <button
                    onClick={handleDeletePlaylist}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-red-300 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all active:scale-95"
                  >
                    <Trash size={14} />
                    Xóa
                  </button>
                </>
              ) : (
                <p className="text-xs text-[#A39282]">Chế độ xem chỉ đọc — đăng nhập để tạo playlist riêng của bạn.</p>
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
          emptyText={isOwner ? "Playlist chưa có bài nào. Bấm 'Thêm bài hát' để thêm vào danh sách." : "Playlist này hiện chưa có bài hát."}
        />
      </div>

      {/* Modal thêm bài hát */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="indie-panel rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl border-dashed-indie overflow-hidden font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-dashed-indie bg-[#26211C]">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#EDE6D6] flex items-center gap-2">
                <Queue size={16} weight="duotone" className="text-[#D97C54]" />
                Thêm bản thu vào "{playlist.title}"
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#A39282] hover:text-[#EDE6D6] p-1 rounded-lg hover:bg-[#2E2721] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {allSongs.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-[#D97C54]">
                  <SpinnerGap size={24} className="animate-spin" />
                </div>
              ) : (
                allSongs.map((song) => {
                  const isAdded = selectedSongIds.has(song.id);
                  return (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#26211C] transition-all"
                    >
                      <img src={song.albumCover} alt={song.title} loading="lazy" className="w-9 h-9 rounded object-cover flex-shrink-0 shadow-sm" />
                      <div className="truncate flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-serif italic text-xs font-semibold truncate text-[#EDE6D6]">{song.title}</p>
                          <SourceBadge source={song.source} />
                        </div>
                        <p className="font-mono text-[10px] text-[#A39282] truncate mt-0.5">{song.artist}</p>
                      </div>
                      <button
                        onClick={() => handleAddSong(song)}
                        disabled={isAdded || addingSongId === song.id}
                        className={`font-mono text-xs px-3.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                          isAdded
                            ? "bg-[#26211C] text-[#8A7B6C] cursor-default border border-[#EDE6D6]/10"
                            : "bg-[#B85C38] hover:bg-[#D97C54] text-[#EDE6D6] shadow-sm active:scale-95"
                        }`}
                      >
                        {addingSongId === song.id ? (
                          <SpinnerGap size={12} className="animate-spin" />
                        ) : isAdded ? (
                          "Đã ghi"
                        ) : (
                          "Ghi nhạc"
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
