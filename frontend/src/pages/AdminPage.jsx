import { useEffect, useState } from "react";
import { Users, Music, Disc3, ListMusic, Headphones, Heart, Loader2, Shield, Trash2, Search } from "lucide-react";
import {
  fetchAdminStats,
  fetchAdminUsers,
  updateUserRole,
  deleteUser,
  fetchAdminSongs,
  deleteSong,
} from "../api/admin";
import { useToast } from "../components/ToastContext";

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="glass-card p-5 rounded-2xl border border-white/10">
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3 shadow-lg`}>
      <Icon size={18} />
    </div>
    <p className="text-3xl font-black text-white">{value}</p>
    <p className="text-xs text-zinc-400 font-semibold mt-1">{label}</p>
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
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
          <Shield size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Trung tâm quản trị</h1>
          <p className="text-xs text-zinc-400 font-medium">Quản lý người dùng và nội dung thư viện JamWave</p>
        </div>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Người dùng" value={stats?.users ?? "..."} color="from-cyan-500 to-blue-600" />
        <StatCard icon={Music} label="Bài hát" value={stats?.songs ?? "..."} color="from-violet-500 to-purple-600" />
        <StatCard icon={Disc3} label="Album" value={stats?.albums ?? "..."} color="from-fuchsia-500 to-pink-600" />
        <StatCard icon={ListMusic} label="Playlist" value={stats?.playlists ?? "..."} color="from-emerald-500 to-teal-600" />
        <StatCard icon={Headphones} label="Lượt nghe" value={stats?.listens ?? "..."} color="from-amber-500 to-orange-600" />
        <StatCard icon={Heart} label="Lượt follow" value={stats?.follows ?? "..."} color="from-rose-500 to-red-600" />
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
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
              tab === t.key
                ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/25"
                : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab người dùng */}
      {tab === "users" && (
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-white/5">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={userQuery}
                onChange={(e) => {
                  setUserQuery(e.target.value);
                  setUserPage(1);
                }}
                placeholder="Tìm email hoặc tên..."
                className="w-full bg-white/5 border border-white/10 text-white text-sm pl-9 pr-3 py-2 rounded-xl outline-none focus:border-violet-500 placeholder-zinc-500"
              />
            </div>
            <span className="text-xs text-zinc-400 font-semibold ml-auto">
              {userTotal} người dùng
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 border-b border-white/5">
                  <th className="px-4 py-3 font-bold">Người dùng</th>
                  <th className="px-4 py-3 font-bold">Vai trò</th>
                  <th className="px-4 py-3 font-bold text-center">Playlist</th>
                  <th className="px-4 py-3 font-bold text-center">Thích</th>
                  <th className="px-4 py-3 font-bold text-center">Lượt nghe</th>
                  <th className="px-4 py-3 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {userLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-emerald-400">
                      <Loader2 size={24} className="animate-spin inline-block" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                      Không tìm thấy người dùng nào
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-white truncate max-w-[220px]">{u.name}</p>
                        <p className="text-xs text-zinc-500 truncate max-w-[220px]">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                            u.role === "ADMIN"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-400/30"
                              : "bg-white/5 text-zinc-400 border border-white/10"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-300 font-semibold">{u.playlists}</td>
                      <td className="px-4 py-3 text-center text-zinc-300 font-semibold">{u.likes}</td>
                      <td className="px-4 py-3 text-center text-zinc-300 font-semibold">{u.listens}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRoleChange(u)}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
                            title="Đổi vai trò"
                          >
                            {u.role === "ADMIN" ? "Hạ xuống USER" : "Lên ADMIN"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Xóa người dùng"
                          >
                            <Trash2 size={15} />
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
            <div className="flex items-center justify-center gap-3 p-4 border-t border-white/5">
              <button
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={userPage <= 1}
                className="text-xs font-bold px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-xs text-zinc-400 font-semibold">
                Trang {userPage} / {Math.ceil(userTotal / 20)}
              </span>
              <button
                onClick={() => setUserPage((p) => p + 1)}
                disabled={userPage * 20 >= userTotal}
                className="text-xs font-bold px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab bài hát */}
      {tab === "songs" && (
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-white/5">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={songQuery}
                onChange={(e) => {
                  setSongQuery(e.target.value);
                  setSongPage(1);
                }}
                placeholder="Tìm tên bài hoặc nghệ sĩ..."
                className="w-full bg-white/5 border border-white/10 text-white text-sm pl-9 pr-3 py-2 rounded-xl outline-none focus:border-violet-500 placeholder-zinc-500"
              />
            </div>
            <span className="text-xs text-zinc-400 font-semibold ml-auto">{songTotal} bài hát</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 border-b border-white/5">
                  <th className="px-4 py-3 font-bold">Bài hát</th>
                  <th className="px-4 py-3 font-bold">Nguồn</th>
                  <th className="px-4 py-3 font-bold text-center">Lượt nghe</th>
                  <th className="px-4 py-3 font-bold text-center">Thích</th>
                  <th className="px-4 py-3 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {songLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-emerald-400">
                      <Loader2 size={24} className="animate-spin inline-block" />
                    </td>
                  </tr>
                ) : songs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                      Không tìm thấy bài hát nào
                    </td>
                  </tr>
                ) : (
                  songs.map((s) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-white truncate max-w-[280px]">{s.title}</p>
                        <p className="text-xs text-zinc-500 truncate max-w-[280px]">{s.artist}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                            s.source === "audius"
                              ? "bg-purple-500/15 text-purple-300 border border-purple-400/30"
                              : "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30"
                          }`}
                        >
                          {s.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-300 font-semibold">{s.listenCount}</td>
                      <td className="px-4 py-3 text-center text-zinc-300 font-semibold">{s.likeCount}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteSong(s)}
                          className="p-1.5 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Xóa bài hát"
                        >
                          <Trash2 size={15} />
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
                className="text-xs font-bold px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-xs text-zinc-400 font-semibold">
                Trang {songPage} / {Math.ceil(songTotal / 20)}
              </span>
              <button
                onClick={() => setSongPage((p) => p + 1)}
                disabled={songPage * 20 >= songTotal}
                className="text-xs font-bold px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
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
