import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Delete Item',
  message = "This can't be undone. Are you sure you want to delete this?",
  confirmLabel = 'Delete',
  isDeleting = false,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="bg-mc-black/60 fixed inset-0 z-[10000] flex items-center justify-center p-4 font-sans backdrop-blur-[2px] transition-all"
      onClick={onCancel}
    >
      <div
        className="border-mc-beige-dark bg-mc-white w-full max-w-sm rounded-xl border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-mc-black mb-2 text-lg font-extrabold tracking-tight">
          {title}
        </h3>
        <p className="mb-6 text-sm leading-relaxed font-medium text-slate-500">
          {message}
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="bg-mc-beige-light text-mc-black hover:bg-mc-beige-dark rounded-lg px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="bg-mc-black text-mc-white hover:bg-mc-gray-dark flex min-w-[70px] items-center justify-center rounded-lg px-5 py-2.5 text-xs font-bold tracking-wider uppercase shadow-sm transition-colors hover:text-rose-400 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
