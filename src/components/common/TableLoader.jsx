import React from 'react';
import { Loader2 } from 'lucide-react';

export default function TableLoader({ message = 'Please wait a moment...' }) {
  return (
    <div className="absolute inset-0 z-30 bg-white/70 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-medium text-slate-500">{message}</span>
      </div>
    </div>
  );
}
