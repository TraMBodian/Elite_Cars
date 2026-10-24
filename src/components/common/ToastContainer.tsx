import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
          error: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
          warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
          info: <Info className="h-5 w-5 text-blue-600 shrink-0" />,
        };

        const bgBorders = {
          success: 'bg-white border-emerald-200 text-slate-800 shadow-lg shadow-emerald-500/5',
          error: 'bg-white border-rose-200 text-slate-800 shadow-lg shadow-rose-500/5',
          warning: 'bg-white border-amber-200 text-slate-800 shadow-lg shadow-amber-500/5',
          info: 'bg-white border-blue-200 text-slate-800 shadow-lg shadow-blue-500/5',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${bgBorders[toast.type]} shadow-xl transition-all animate-in slide-in-from-right-4 duration-200`}
          >
            {icons[toast.type]}
            <p className="text-sm font-medium leading-5 flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
