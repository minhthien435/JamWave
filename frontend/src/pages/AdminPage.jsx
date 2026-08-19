import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Users,
  MusicNotes,
  Disc,
  Queue,
  Headphones,
  Heart,
  Trash,
  MagnifyingGlass,
  SpinnerGap,
} from "@phosphor-icons/react";
import {
  fetchAdminStats,
  fetchAdminUsers,
  updateUserRole,
  deleteUser,
  fetchAdminSongs,
  deleteSong,
} from "../api/admin";
import { useToast } from "../components/ToastContext";

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="indie-panel p-4 rounded-2xl border-dashed-indie">
    <div className="w-9 h-9 rounded-xl bg-[#B85C38]/15 text-[#D97C54] flex items-center justify-center mb-2.5 border border-[#B85C38]/30">
      <Icon size={18} weight="duotone" />
    </div>
    <p className="font-serif italic text-2xl sm:text-3xl font-bold text-[#EDE6D6] tabular-nums">{value}</p>
    <p className="font-mono text-xs text-[#A39282] mt-0.5">{label}</p>
  </div>
);

export default function AdminPage() {
  const toast = useToast();
  const toastSuccess = toast?.success;
  const toastError = toast?.error;

  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("users");

  // Người dùng
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userQuery, setUserQuery] = useState("");
  const [userLoading, setUserLoading] = useState(true);

  // Bài hát
  const [songs, setSongs] = useState([]);
  const [songTotal, setSongTotal] = useState(0);
  const [songPage, setSongPage] = useState(1);
  const [songQuery, setSongQuery] = useState("");
  const [songLoading, setSongLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAdminUsers({ q: userQuery, page: userPage })
      .then((data) => {
        setUsers(data.users);
        setUserTotal(data.total);
      })
      .catch((err) => toastError?.(err.message))
      .finally(() => setUserLoading(false));
  }, [userQuery, userPage, toastError]);

  useEffect(() => {
    fetchAdminSongs({ q: songQuery, page: songPage })
      .then((data) => {
        setSongs(data.songs);
        setSongTotal(data.total);
      })
      .catch((err) => toastError?.(err.message))
      .finally(() => setSongLoading(false));
  }, [songQuery, songPage, toastError]);

  const handleRoleChange = async (user) => {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (!window.confirm(`Đổi quyền của ${user.email} thành ${newRole}?`)) return;
    try {
      await updateUserRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
      toastSuccess(`Đã đổi quyền ${user.email} thành ${newRole}`);
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Xóa người dùng ${user.email}? Toàn bộ dữ liệu của họ sẽ bị xóa.`)) return;
    try {
      const result = await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toastSuccess(result.message);
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleDeleteSong = async (song) => {
    if (!window.confirm(`Xóa bài hát "${song.title}" của ${song.artist}?`)) return;
    try {
      const result = await deleteSong(song.id);
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      toastSuccess(result.message);
    } catch (err) {
      toastError(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-6 select-none">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shadow-md">
          <ShieldCheck size={24} weight="bold" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Trung tâm quản trị</h1>
          <p className="text-xs text-zinc-400 font-medium">Quản lý người dùng và nội dung thư viện JamWave</p>
        </div>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard icon={Users} label="Người dùng" value={stats?.users ?? "..."} />
        <StatCard icon={MusicNotes} label="Bài hát" value={stats?.songs ?? "..."} />
        <StatCard icon={Disc} label="Album" value={stats?.albums ?? "..."} />
        <StatCard icon={Queue} label="Playlist" value={stats?.playlists ?? "..."} />
        <StatCard icon={Headphones} label="Lượt nghe" value={stats?.listens ?? "..."} />
        <StatCard icon={Heart} label="Lượt follow" value={stats?.follows ?? "..."} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: "users", label: "Người dùng" },
          { key: "songs", label: "Bài hát" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`font-mono text-xs font-semibold px-5 py-2 rounded-xl border transition-all active:scale-95 ${
              tab === t.key
                ? "bg-[#B85C38] text-[#EDE6D6] border-[#D97C54] shadow-sm font-bold"
                : "bg-[#26211C] hover:bg-[#2E2721] text-[#A39282] hover:text-[#EDE6D6] border-[#EDE6D6]/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab người dùng */}
      {tab === "users" && (
        <div className="indie-panel rounded-2xl border-dashed-indie overflow-hidden font-sans">
          <div className="flex items-center gap-3 p-4 border-b border-dashed-indie bg-[#26211C]">
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlass size={15} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A39282]" />
              <input
                value={userQuery}
                onChange={(e) => {
                  setUserQuery(e.target.value);
                  setUserPage(1);
                }}
                placeholder="Tìm email hoặc tên..."
                className="w-full bg-[#181512] border border-[#EDE6D6]/15 text-[#EDE6D6] text-xs pl-9 pr-3 py-2 rounded-xl outline-none focus:border-[#D97C54] placeholder-[#8A7B6C]"
              />
            </div>
            <span className="font-mono text-xs text-[#A39282] tabular-nums ml-auto">
              {userTotal} người dùng
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-[#A39282] border-b border-dashed-indie bg-[#26211C]">
                  <th className="px-4 py-3 font-bold">Người dùng</th>
                  <th className="px-4 py-3 font-bold">Vai trò</th>
                  <th className="px-4 py-3 font-bold text-center">Playlist</th>
                  <th className="px-4 py-3 font-bold text-center">Thích</th>
                  <th className="px-4 py-3 font-bold text-center">Lượt nghe</th>
                  <th className="px-4 py-3 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE6D6]/5 font-mono text-xs">
                {userLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#D97C54]">
                      <SpinnerGap size={24} className="animate-spin inline-block" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#A39282]">
                      Không tìm thấy người dùng nào
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#26211C]/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-serif italic font-bold text-sm text-[#EDE6D6] truncate max-w-[220px]">{u.name}</p>
                        <p className="text-[11px] text-[#A39282] truncate max-w-[220px]">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            u.role === "ADMIN"
                              ? "bg-[#E0B35C]/15 text-[#E0B35C] border border-[#E0B35C]/30"
                              : "bg-[#26211C] text-[#A39282] border border-[#EDE6D6]/10"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[#EDE6D6] tabular-nums">{u.playlists}</td>
                      <td className="px-4 py-3 text-center text-[#EDE6D6] tabular-nums">{u.likes}</td>
                      <td className="px-4 py-3 text-center text-[#EDE6D6] tabular-nums">{u.listens}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRoleChange(u)}
                            className="text-[11px] font-semibold px-3 py-1 rounded-xl border border-[#EDE6D6]/10 bg-[#26211C] text-[#EDE6D6] hover:bg-[#2E2721] transition-all"
                            title="Đổi vai trò"
                          >
                            {u.role === "ADMIN" ? "Hạ USER" : "Lên ADMIN"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg text-[#A39282] hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Xóa người dùng"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {userTotal > 20 && (
            <div className="flex items-center justify-center gap-3 p-4 border-t border-dashed-indie bg-[#26211C]">
              <button
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={userPage <= 1}
                className="font-mono text-xs font-semibold px-4 py-1.5 rounded-xl bg-[#201A16] border border-[#EDE6D6]/10 text-[#EDE6D6] hover:bg-[#2E2721] disabled:opacity-40"
              >
                Trước
              </button>
              <span className="font-mono text-xs text-[#A39282] tabular-nums">
                Trang {userPage} / {Math.ceil(userTotal / 20)}
              </span>
              <button
                onClick={() => setUserPage((p) => p + 1)}
                disabled={userPage * 20 >= userTotal}
                className="font-mono text-xs font-semibold px-4 py-1.5 rounded-xl bg-[#201A16] border border-[#EDE6D6]/10 text-[#EDE6D6] hover:bg-[#2E2721] disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab bài hát */}
      {tab === "songs" && (
        <div className="indie-panel rounded-2xl border-dashed-indie overflow-hidden font-sans">
          <div className="flex items-center gap-3 p-4 border-b border-dashed-indie bg-[#26211C]">
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlass size={15} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A39282]" />
              <input
                value={songQuery}
                onChange={(e) => {
                  setSongQuery(e.target.value);
                  setSongPage(1);
                }}
                placeholder="Tìm tên bài hoặc nghệ sĩ..."
                className="w-full bg-[#181512] border border-[#EDE6D6]/15 text-[#EDE6D6] text-xs pl-9 pr-3 py-2 rounded-xl outline-none focus:border-[#D97C54] placeholder-[#8A7B6C]"
              />
            </div>
            <span className="font-mono text-xs text-[#A39282] tabular-nums ml-auto">{songTotal} bài hát</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-[#A39282] border-b border-dashed-indie bg-[#26211C]">
                  <th className="px-4 py-3 font-bold">Bài hát</th>
                  <th className="px-4 py-3 font-bold">Nguồn</th>
                  <th className="px-4 py-3 font-bold text-center">Lượt nghe</th>
                  <th className="px-4 py-3 font-bold text-center">Thích</th>
                  <th className="px-4 py-3 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE6D6]/5 font-mono text-xs">
                {songLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#D97C54]">
                      <SpinnerGap size={24} className="animate-spin inline-block" />
                    </td>
                  </tr>
                ) : songs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#A39282]">
                      Không tìm thấy bài hát nào
                    </td>
                  </tr>
                ) : (
                  songs.map((s) => (
                    <tr key={s.id} className="hover:bg-[#26211C]/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white truncate max-w-[280px]">{s.title}</p>
                        <p className="text-xs text-zinc-400 truncate max-w-[280px]">{s.artist}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            s.source === "audius"
                              ? "bg-purple-500/15 text-purple-300 border border-purple-400/30"
                              : "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30"
                          }`}
                        >
                          {s.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-300 font-medium tabular-nums">{s.listenCount}</td>
                      <td className="px-4 py-3 text-center text-zinc-300 font-medium tabular-nums">{s.likeCount}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteSong(s)}
                          className="p-1.5 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Xóa bài hát"
                        >
                          <Trash size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {songTotal > 20 && (
            <div className="flex items-center justify-center gap-3 p-4 border-t border-white/5">
              <button
                onClick={() => setSongPage((p) => Math.max(1, p - 1))}
                disabled={songPage <= 1}
                className="text-xs font-semibold px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-xs text-zinc-400 font-medium tabular-nums">
                Trang {songPage} / {Math.ceil(songTotal / 20)}
              </span>
              <button
                onClick={() => setSongPage((p) => p + 1)}
                disabled={songPage * 20 >= songTotal}
                className="text-xs font-semibold px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
