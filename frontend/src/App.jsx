import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import BrowsePage from "./pages/BrowsePage";
import ChartsPage from "./pages/ChartsPage";
import PlaylistPage from "./pages/PlaylistPage";
import LikesPage from "./pages/LikesPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import AlbumsPage from "./pages/AlbumsPage";
import AlbumPage from "./pages/AlbumPage";
import ArtistsPage from "./pages/ArtistsPage";
import ArtistPage from "./pages/ArtistPage";
import DocsPage from "./pages/DocsPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import WrappedPage from "./pages/WrappedPage";
import AdminPage from "./pages/AdminPage";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";
import { useAuthStore } from "./useAuthStore";

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const forceLogout = useAuthStore((s) => s.forceLogout);

  // Xác thực token lúc khởi động (nếu token hết hạn -> tự đăng xuất)
  useEffect(() => {
    bootstrap();
    // API trả 401 (token hết hạn) -> tự đăng xuất ngay
    const onUnauthorized = () => forceLogout();
    window.addEventListener("jamwave:unauthorized", onUnauthorized);
    return () => window.removeEventListener("jamwave:unauthorized", onUnauthorized);
  }, [bootstrap, forceLogout]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="browse" element={<BrowsePage />} />
        <Route path="charts" element={<ChartsPage />} />
        {/* Playlist có thể là playlist được chia sẻ công khai (không cần đăng nhập) */}
        <Route path="playlist/:id" element={<PlaylistPage />} />
        <Route
          path="likes"
          element={
            <RequireAuth>
              <LikesPage />
            </RequireAuth>
          }
        />
        <Route
          path="profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="wrapped"
          element={
            <RequireAuth>
              <WrappedPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route path="albums" element={<AlbumsPage />} />
        <Route path="album/:id" element={<AlbumPage />} />
        <Route path="artists" element={<ArtistsPage />} />
        <Route path="artist/:name" element={<ArtistPage />} />
        <Route path="docs" element={<DocsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
