import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({
  message = 'Just a moment...',
  className = '',
}) {
  return (
    <div
      className={`absolute inset-0 bg-white/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 ${className}`}
    >
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 opacity-90" />
      <span className="text-sm font-semibold text-slate-600 animate-pulse">
        {message}
      </span>
    </div>
  );
}
