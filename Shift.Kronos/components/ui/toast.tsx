"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  addToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 200);
    }, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icon =
    toast.type === "success" ? (
      <CheckCircle2 size={18} className="text-success shrink-0" />
    ) : toast.type === "error" ? (
      <AlertCircle size={18} className="text-danger shrink-0" />
    ) : (
      <AlertCircle size={18} className="text-accent-light shrink-0" />
    );

  return (
    <div
      className="glass-strong flex items-center gap-3 px-4 py-3 shadow-lg"
      style={{
        animation: exiting ? "toast-out 0.2s ease forwards" : "toast-in 0.3s ease forwards",
        maxWidth: 360,
      }}
    >
      {icon}
      <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(onDismiss, 200);
        }}
        className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-[calc(var(--tab-bar-height)+var(--safe-area-bottom)+16px)] left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 lg:bottom-6">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
