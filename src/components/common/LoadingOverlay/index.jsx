import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({
  message = 'Just a moment...',
  className = '',
}) {
  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-xs ${className}`}
    >
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 opacity-90" />
      <span className="animate-pulse text-sm font-semibold text-slate-600">
        {message}
      </span>
    </div>
  );
}
