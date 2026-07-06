'use client';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

/** A bottom-anchored modal sheet with a scrim. Used for purchase confirm etc. */
export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(10,6,18,.55)' }}
        onClick={onClose}
      />
      <div
        className="relative bg-surface"
        style={{
          borderRadius: '28px 28px 0 0',
          padding: '14px 22px 44px',
          boxShadow: '0 -20px 60px rgba(0,0,0,.35)',
        }}
      >
        <div className="bg-track" style={{ width: 40, height: 4, borderRadius: 2, margin: '0 auto 18px' }} />
        {children}
      </div>
    </div>
  );
}

/** A centered dialog modal (dark scrim). Used for the reward moment. */
export function CenterModal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(10,6,18,.72)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />
      <div className="relative z-10 h-full flex flex-col justify-center px-6">{children}</div>
    </div>
  );
}
