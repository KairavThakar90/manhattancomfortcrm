import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function ImagePreviewModal({
  isOpen,
  imageSrc,
  onClose,
  altText = 'Product Image',
}: any) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !imageSrc) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-scaleUp relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 rounded-full bg-slate-900/40 p-2 text-white opacity-70 transition hover:bg-slate-900/80 hover:opacity-100"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={imageSrc}
          alt={altText}
          className="max-h-[85vh] w-auto max-w-full rounded-xl bg-white object-contain"
        />
      </div>
    </div>,
    document.body,
  );
}
