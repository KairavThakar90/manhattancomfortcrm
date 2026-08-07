import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

export default function FullPageLoader({
  message = 'Loading purchase orders...',
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="text-sm font-medium text-slate-500">{message}</span>
      </div>
    </div>,
    document.body,
  );
}
