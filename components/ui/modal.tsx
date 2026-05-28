import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
}) => {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm transition-opacity duration-300">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-transparent" onClick={onClose} />

      {/* Modal Card content */}
      <div
        className={`relative w-full ${sizes[size]} bg-white rounded-xl shadow-xl border border-brand-border flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          {title ? (
            <h3 className="text-base font-bold text-brand-text-primary tracking-tight">
              {title}
            </h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-full text-brand-text-muted hover:bg-brand-bg hover:text-brand-text-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto flex-1 text-sm text-brand-text-secondary">
          {children}
        </div>
      </div>
    </div>
  );
};
export default Modal;
