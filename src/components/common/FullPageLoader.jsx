import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

export default function FullPageLoader({
  message = 'Loading purchase orders...',
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="bg-mc-white/95 fixed inset-0 z-[9999] flex flex-col items-center justify-center backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="text-mc-gold h-8 w-8 animate-spin" />
        <span className="text-mc-black text-sm font-semibold">{message}</span>
      </div>
    </div>,
    document.body,
  );
}
