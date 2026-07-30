import React from 'react';
import { Loader2 } from 'lucide-react';

export default function FullPageLoader({
  message = 'Loading purchase orders...',
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-medium text-slate-500">{message}</span>
      </div>
    </div>
  );
}
