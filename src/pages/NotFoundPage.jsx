import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-8 text-slate-600 shadow-sm">
      <AlertTriangle className="mb-4 h-16 w-16 text-rose-500" />
      <h1 className="mb-2 text-4xl font-extrabold text-slate-800">404</h1>
      <h2 className="mb-6 text-lg font-bold">Page Not Found</h2>
      <p className="mb-6 text-sm">
        The route you are looking for does not exist or has been moved.
      </p>

      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
      >
        <Home className="h-4 w-4" />
        Return Home
      </button>
    </div>
  );
}
