import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-600 bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <AlertTriangle className="h-16 w-16 text-rose-500 mb-4" />
            <h1 className="text-4xl font-extrabold text-slate-800 mb-2">404</h1>
            <h2 className="text-lg font-bold mb-6">Page Not Found</h2>
            <p className="mb-6 text-sm">The route you are looking for does not exist or has been moved.</p>

            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition"
            >
                <Home className="h-4 w-4" />
                Return Home
            </button>
        </div>
    );
}
