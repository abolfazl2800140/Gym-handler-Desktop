import { useEffect, useRef, useState } from "react";

export type ToastKind = "success" | "error" | "info";

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

let emitToast: ((t: Omit<Toast, "id">) => void) | null = null;

export function toast(kind: ToastKind, message: string) {
  if (emitToast) emitToast({ kind, message });
}

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    emitToast = ({ kind, message }) => {
      const id = `${Date.now()}_${counter.current++}`;
      setToasts((prev) => [...prev, { id, kind, message }]);
      // Auto dismiss after 3.5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };
    return () => {
      emitToast = null;
    };
  }, []);

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:w-[360px] z-[1100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            `flex items-center gap-3 p-3 rounded-lg shadow-md border ` +
            (t.kind === "success"
              ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800"
              : t.kind === "error"
              ? "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-100 border-red-200 dark:border-red-800"
              : "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-100 border-blue-200 dark:border-blue-800")
          }
          role="status"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-black/5 dark:bg-white/10">
            {t.kind === "success" && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {t.kind === "error" && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v6m6-6v6M5 12h14" />
              </svg>
            )}
            {t.kind === "info" && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            )}
          </span>
          <p className="text-sm flex-1">{t.message}</p>
          <button
            className="text-xs opacity-60 hover:opacity-100"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            title="بستن"
          >
            بستن
          </button>
        </div>
      ))}
    </div>
  );
}