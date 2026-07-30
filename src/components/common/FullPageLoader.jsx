import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function FullPageLoader({
  title = 'Syncing',
  message = 'Please wait a moment...',
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full mx-auto animate-in fade-in zoom-in duration-200">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-50 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
            <RefreshCw className="w-8 h-8 animate-spin [animation-duration:3s]" />
          </div>
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-slate-500 font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
}
