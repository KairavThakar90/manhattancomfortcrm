import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Tooltip } from 'react-tooltip';

const MESSAGES = [
  'Connecting to SellerCloud...',
  'Fetching container data...',
  'Processing records...',
  'Processing records...',
  'Saving to database...',
  'Saving to database...',
  'Finalizing sync...',
];

export default function SellerCloudSyncLoading({
  isOpen,
  onForceClose = null,
  title = 'Syncing Container Data',
}) {
  const [msgIndex, setMsgIndex] = useState(0);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setMsgIndex(0);
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const msgInterval = setInterval(() => {
      setMsgIndex((prev) => (prev < MESSAGES.length - 1 ? prev + 1 : prev));
    }, 2800);

    return () => {
      clearInterval(msgInterval);
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-hidden pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] flex flex-col items-center p-8 border border-white relative overflow-hidden"
      >
        {onForceClose && (
          <>
            <button
              onClick={onForceClose}
              data-tooltip-id="force-close-tooltip"
              data-tooltip-content="⚠️ Warning: Do not close if data is still processing"
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <Tooltip
              id="force-close-tooltip"
              place="bottom"
              className="z-[999999] shadow-xl text-center tracking-wide"
              style={{
                backgroundColor: '#6366f1',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '8px 12px',
                fontWeight: '700',
                fontSize: '11px',
              }}
            />
          </>
        )}

        {/* Ambient Glow Effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-[40px] animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[40px] animate-[pulse_5s_ease-in-out_infinite]" />

        {/* Central Spinner */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-6 z-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-indigo-50 border-dashed animate-[spin_10s_linear_infinite]" />
          <motion.div
            className="absolute inset-2 rounded-full border-[3px] border-indigo-500 border-t-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          />
          <div className="bg-indigo-50/50 text-indigo-600 rounded-full w-14 h-14 flex items-center justify-center relative shadow-sm border border-indigo-100">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </div>

        {/* Titles & Messages */}
        <div className="flex flex-col items-center text-center z-10 w-full mb-8">
          <h2 className="text-[19px] font-black text-slate-800 mb-2 font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
            {title}
          </h2>

          <div className="h-5 w-full flex justify-center items-center overflow-hidden">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={msgIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center"
              >
                {MESSAGES[msgIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Sleek Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full overflow-hidden p-0.5 relative shadow-inner z-10">
          <motion.div
            className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full shadow-sm"
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
      </motion.div>
    </div>,
    document.body,
  );
}
