import React from 'react';
import { LifeBuoy, ArrowLeft } from 'lucide-react';

export default function SupportPage({ error }) {
  const errorMessage = error?.message || 'We encountered an unexpected error.';

  const handleReturnHome = () => {
    window.location.href = '/purchase-orders';
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 via-indigo-500 to-sky-500" />

        <div className="p-10">
          <div className="flex justify-center mb-8">
            <div className="h-20 w-20 bg-rose-50 rounded-full flex items-center justify-center">
              <LifeBuoy className="h-10 w-10 text-rose-500" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-3">
              Oops! Something went wrong
            </h1>
            <p className="text-slate-500 text-lg">
              Please inform the developer team about this issue.
            </p>
            {error && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 inline-block text-left relative max-w-full overflow-hidden w-full">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Error Details
                </span>
                <code className="text-sm text-slate-700 break-all">
                  {errorMessage}
                </code>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleReturnHome}
              className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
              Return to Purchase Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
