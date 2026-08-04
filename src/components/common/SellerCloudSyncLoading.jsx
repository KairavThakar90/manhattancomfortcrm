import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Server,
  Database,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';

const MESSAGES = [
  'Connecting to SellerCloud...',
  'Fetching container data...',
  'Processing records...',
  'Processing records...',
  'Saving to database...',
  'Saving to database...',
  'Finalizing sync...',
];

export default function SellerCloudSyncLoading({ isOpen, onForceClose }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Fake counters for "live" UI feedback
  const [fakeStats, setFakeStats] = useState({
    processed: 0,
    success: 0,
    failed: 0,
  });

  useEffect(() => {
    if (!isOpen) {
      setMsgIndex(0);
      setElapsed(0);
      setFakeStats({ processed: 0, success: 0, failed: 0 });
      return;
    }

    const msgInterval = setInterval(() => {
      setMsgIndex((prev) => (prev < MESSAGES.length - 1 ? prev + 1 : prev));
    }, 2800);

    const timerInterval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    const statsInterval = setInterval(() => {
      setFakeStats((prev) => {
        // Only start showing processed after first few seconds
        if (msgIndex < 2) return prev;

        const added = Math.floor(Math.random() * 5) + 1;
        const failedRnd = Math.random() > 0.95 ? 1 : 0; // Rare failures

        return {
          processed: prev.processed + added,
          success: prev.success + added - failedRnd,
          failed: prev.failed + failedRnd,
        };
      });
    }, 600);

    return () => {
      clearInterval(msgInterval);
      clearInterval(timerInterval);
      clearInterval(statsInterval);
    };
  }, [isOpen, msgIndex]);

  if (!isOpen) return null;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-hidden pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-indigo-100 relative"
      >
        {onForceClose && (
          <button
            onClick={onForceClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Pattern / Graphic */}
        <div className="relative h-40 bg-blue-600 overflow-hidden flex flex-col items-center justify-center pointer-events-none">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

          {/* Orbiting rings */}
          <div className="absolute w-72 h-72 border border-blue-400/30 rounded-full animate-[spin_8s_linear_infinite]" />
          <div className="absolute w-56 h-56 border border-blue-400/40 rounded-full animate-[spin_6s_linear_infinite_reverse]" />

          <div className="relative bg-white p-4 rounded-full shadow-xl mb-2">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
          <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">
            Syncing SellerCloud Data
          </h2>

          {/* Animated Message */}
          <div className="h-6 mb-8 w-full flex justify-center items-center overflow-hidden">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={msgIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="text-sm font-semibold text-blue-600"
              >
                {MESSAGES[msgIndex]}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Progress Bar (Indeterminate shimmer) */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative mb-8 shadow-inner">
            <motion.div
              className="absolute top-0 bottom-0 left-0 w-1/3 bg-blue-500 rounded-full"
              animate={{
                x: ['-100%', '300%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 w-full pt-6 border-t border-slate-100">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 shadow-sm border border-slate-100">
                <Database className="w-5 h-5 text-slate-500" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Processed
              </span>
              <motion.span
                key={fakeStats.processed}
                initial={{ scale: 1.1, color: '#2563eb' }}
                animate={{ scale: 1, color: '#1e293b' }}
                transition={{ duration: 0.2 }}
                className="text-xl font-black text-slate-800 tabular-nums"
              >
                {fakeStats.processed}
              </motion.span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2 shadow-sm border border-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Success
              </span>
              <motion.span
                key={fakeStats.success}
                initial={{ scale: 1.1, color: '#059669' }}
                animate={{ scale: 1, color: '#1e293b' }}
                transition={{ duration: 0.2 }}
                className="text-xl font-black text-slate-800 tabular-nums"
              >
                {fakeStats.success}
              </motion.span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2 shadow-sm border border-blue-100">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Elapsed
              </span>
              <span className="text-xl font-black text-slate-800 tabular-nums">
                {formatTime(elapsed)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
