import React, { useEffect } from 'react';
import { ShieldAlert, AlertTriangle, X } from 'lucide-react';

export interface DuplicateNotification {
  id?: string;
  title: string;
  count?: number;
  items?: string[];
  message?: string;
  durationMs?: number;
}

interface DuplicateToastProps {
  toast: DuplicateNotification | null;
  onClose: () => void;
}

export const DuplicateToast: React.FC<DuplicateToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.durationMs || 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed top-5 left-5 z-[9999] max-w-md w-full shadow-2xl rounded-2xl overflow-hidden border-2 border-amber-400 bg-slate-900 text-white transition-all transform duration-300 ease-out">
      {/* Top Banner Header */}
      <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              {toast.title || 'Duplicate Entry Blocked'}
            </h4>
            {toast.count !== undefined && toast.count > 0 && (
              <span className="text-[11px] text-amber-200/90 font-medium">
                {toast.count} Duplicate{toast.count > 1 ? 's' : ''} Detected & Skipped
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Dismiss Alert"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-2 text-xs text-slate-200">
        {toast.message && (
          <p className="font-semibold text-amber-100 leading-relaxed">
            {toast.message}
          </p>
        )}

        {toast.items && toast.items.length > 0 && (
          <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 max-h-40 overflow-y-auto space-y-1.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Prevented Record(s):
            </p>
            <ul className="space-y-1.5">
              {toast.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-amber-200 text-[11px] font-medium">
                  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="break-words">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
          <span>Zero Duplication Enforcement Policy</span>
          <span className="text-amber-400 font-semibold">Auto-closing in 5s</span>
        </div>
      </div>

      {/* Bottom Visual Bar */}
      <div className="h-1 bg-amber-500 w-full animate-pulse" />
    </div>
  );
};
