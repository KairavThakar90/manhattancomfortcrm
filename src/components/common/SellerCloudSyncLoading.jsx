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
    <div className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-900/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-[32px] border border-white bg-white/95 p-8 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] backdrop-blur-2xl"
      >
        {onForceClose && (
          <>
            <button
              onClick={onForceClose}
              data-tooltip-id="force-close-tooltip"
              data-tooltip-content="⚠️ Warning: Do not close if data is still processing"
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
            <Tooltip
              id="force-close-tooltip"
              place="bottom"
              className="z-[999999] text-center tracking-wide shadow-xl"
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
        <div className="absolute -top-24 -right-24 h-48 w-48 animate-[pulse_4s_ease-in-out_infinite] rounded-full bg-indigo-500/10 blur-[40px]" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 animate-[pulse_5s_ease-in-out_infinite] rounded-full bg-emerald-500/10 blur-[40px]" />

        {/* Central Spinner */}
        <div className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-[spin_10s_linear_infinite] rounded-full border-[3px] border-dashed border-indigo-50" />
          <motion.div
            className="absolute inset-2 rounded-full border-[3px] border-indigo-500 border-t-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50/50 text-indigo-600 shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </div>

        {/* Titles & Messages */}
        <div className="z-10 mb-8 flex w-full flex-col items-center text-center">
          <h2 className="font-display mb-2 bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-[19px] font-black tracking-tight text-slate-800 text-transparent">
            {title}
          </h2>

          <div className="flex h-5 w-full items-center justify-center overflow-hidden">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={msgIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center text-[11px] font-bold tracking-widest text-slate-400 uppercase"
              >
                {MESSAGES[msgIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Sleek Progress Bar */}
        <div className="relative z-10 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner">
          <motion.div
            className="absolute top-0 bottom-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 shadow-sm"
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
