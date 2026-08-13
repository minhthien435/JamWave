import { useCallback, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { ToastContext } from "./ToastContext";

let toastId = 0;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message }]);
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), 3500)
      );
    },
    [dismiss]
  );

  const toast = useCallback((message) => push("success", message), [push]);
  const toastError = useCallback((message) => push("error", message), [push]);
  const toastSuccess = useCallback((message) => push("success", message), [push]);

  return (
    <ToastContext.Provider value={{ toast, error: toastError, success: toastSuccess }}>
      {children}
      {/* Container hiển thị toast */}
      <div className="fixed bottom-24 right-6 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md animate-float-slow text-sm font-medium ${
              t.type === "error"
                ? "bg-red-950/90 border-red-500/40 text-red-100"
                : "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
            }`}
          >
            {t.type === "error" ? (
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            )}
            <span className="flex-1 break-words">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-white/50 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
              title="Đóng"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
