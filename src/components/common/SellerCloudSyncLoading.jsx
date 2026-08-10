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
    <div className="bg-mc-black/30 pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="border-mc-beige-dark relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-xl border bg-white p-8"
      >
        {onForceClose && (
          <>
            <button
              onClick={onForceClose}
              data-tooltip-id="force-close-tooltip"
              data-tooltip-content="⚠️ Warning: Do not close if data is still processing"
              className="bg-mc-beige-light text-mc-gray-soft hover:bg-mc-beige-dark hover:text-mc-black absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <Tooltip
              id="force-close-tooltip"
              place="bottom"
              className="z-[999999] text-center tracking-wide"
              style={{
                backgroundColor: '#f6efe1',
                color: '#000000',
                borderRadius: '8px',
                padding: '8px 12px',
                fontWeight: '700',
                fontSize: '11px',
              }}
            />
          </>
        )}

        {/* Central Spinner */}
        <div className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center">
          <div className="border-mc-beige-dark/50 absolute inset-0 animate-[spin_10s_linear_infinite] rounded-full border-[3px] border-dashed" />
          <motion.div
            className="border-mc-gold absolute inset-2 rounded-full border-[3px] border-t-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          />
          <div className="border-mc-beige-dark bg-mc-beige-light text-mc-black relative flex h-14 w-14 items-center justify-center rounded-full border">
            <Loader2 className="text-mc-gold h-6 w-6 animate-spin" />
          </div>
        </div>

        {/* Titles & Messages */}
        <div className="z-10 mb-8 flex w-full flex-col items-center text-center">
          <h2 className="font-display text-mc-black mb-2 text-[19px] font-black tracking-tight">
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
                className="text-mc-gray-soft text-center text-[11px] font-bold tracking-widest uppercase"
              >
                {MESSAGES[msgIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Sleek Progress Bar */}
        <div className="bg-mc-beige-light relative z-10 h-1.5 w-full overflow-hidden rounded-full">
          <motion.div
            className="bg-mc-gold absolute top-0 bottom-0 left-0 w-1/3 rounded-full"
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
