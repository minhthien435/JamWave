import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../useAuthStore";
import { Loader2 } from "lucide-react";

// Bảo vệ route: chỉ ADMIN mới được vào
export default function RequireAdmin({ children }) {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return children;
}
