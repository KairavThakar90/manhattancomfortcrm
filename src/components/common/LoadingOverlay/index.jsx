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
      <Loader2 className="text-mc-gold h-8 w-8 animate-spin opacity-90" />
      <span className="text-mc-black animate-pulse text-sm font-semibold">
        {message}
      </span>
    </div>
  );
}
