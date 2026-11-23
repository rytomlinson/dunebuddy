import { useEffect, type ReactNode } from 'react';
import { createUseStyles } from 'react-jss';
import type { Theme } from '../theme';

const useStyles = createUseStyles((theme: Theme) => ({
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85vh',
    overflowY: 'auto',
    background: theme.colors.surface,
    borderTop: `1px solid ${theme.colors.border}`,
    borderRadius: `${theme.borderRadius.lg} ${theme.borderRadius.lg} 0 0`,
    padding: theme.spacing.md,
    paddingBottom: `max(${theme.spacing.md}, env(safe-area-inset-bottom))`,
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  title: { fontSize: theme.fontSizes.lg, fontWeight: 700, display: 'flex', alignItems: 'center', gap: theme.spacing.sm },
  close: {
    minWidth: 44,
    minHeight: 44,
    border: 'none',
    background: 'transparent',
    fontSize: 24,
    color: theme.colors.textSecondary,
    cursor: 'pointer',
  },
}));

/** A bottom sheet for phones: tap outside or ✕ to close. */
export function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  const c = useStyles();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={c.backdrop} onClick={onClose}>
      <div className={c.panel} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={c.head}>
          <div className={c.title}>{title}</div>
          <button type="button" className={c.close} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
