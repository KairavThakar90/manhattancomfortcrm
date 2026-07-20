import React, { useState } from 'react';
import { Layers, Lock, User, ChevronRight, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => void;
  loading?: boolean;
  error?: string;
  initialUsername?: string;
  initialRememberMe?: boolean;
}

export default function LoginPage({
  onLogin,
  loading,
  error,
  initialUsername = '',
  initialRememberMe = false,
}: LoginPageProps) {
  const [username, setUsername] = useState(initialUsername || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(initialRememberMe || false);

  React.useEffect(() => {
    if (initialUsername) {
      setUsername(initialUsername);
    }
  }, [initialUsername]);

  React.useEffect(() => {
    if (initialRememberMe) {
      setRememberMe(initialRememberMe);
    }
  }, [initialRememberMe]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password && !loading) {
      onLogin(username, password, rememberMe);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/30 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] bg-purple-600/20 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 animate-fadeIn">
        <div className="flex flex-col items-center mb-10">
          <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-4 border border-indigo-400/30 relative group">
            <Layers className="h-7 w-7 group-hover:scale-110 transition-transform duration-300" />
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-300 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-display mb-1">
            Welcome Back
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Sign in to Manhattan Comfort CRM
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl mb-4 text-center">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm font-medium"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/50 focus:ring-offset-slate-900 cursor-pointer"
              />
              <span className="text-xs text-slate-400 font-medium group-hover:text-slate-300 transition-colors">
                Remember me
              </span>
            </label>
            <a
              href="#"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors hover:underline"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Authenticating...' : 'Access Portal'}</span>
            {!loading && (
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
