import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { createUseStyles } from 'react-jss';
import type { Theme } from '../theme';

const useStyles = createUseStyles((theme: Theme) => ({
  page: {
    maxWidth: 880,
    margin: '0 auto',
    padding: `${theme.spacing.lg} ${theme.spacing.md} 64px`,
    paddingLeft: `max(${theme.spacing.md}, env(safe-area-inset-left))`,
    paddingRight: `max(${theme.spacing.md}, env(safe-area-inset-right))`,
    '@media (max-width: 600px)': { paddingTop: theme.spacing.md },
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    '& a': { textDecoration: 'none', color: theme.colors.text },
  },
  brand: {
    fontSize: theme.fontSizes.xl,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  brandAccent: { color: theme.colors.primary },
  card: {
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    '@media (max-width: 520px)': { padding: theme.spacing.md },
  },
  cardTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 600,
    marginBottom: theme.spacing.md,
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: 44,
    padding: `0 ${theme.spacing.md}`,
    fontSize: theme.fontSizes.lg,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surfaceHover,
    color: theme.colors.text,
    fontWeight: 600,
    cursor: 'pointer',
    '&:hover:not(:disabled)': { borderColor: theme.colors.textMuted },
    '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
  },
  primary: {
    background: theme.colors.primary,
    borderColor: theme.colors.primary,
    color: '#1A120A',
    '&:hover:not(:disabled)': { background: theme.colors.primaryHover, borderColor: theme.colors.primaryHover },
    '&:active:not(:disabled)': { background: theme.colors.primaryActive },
  },
  danger: {
    background: 'transparent',
    color: theme.colors.error,
    borderColor: theme.colors.error,
  },
  block: { '@media (max-width: 600px)': { width: '100%', minHeight: 48 } },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.md,
    marginTop: theme.spacing.sm,
  },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSizes.md },
}));

export function Page({ children }: { children: ReactNode }) {
  const c = useStyles();
  return (
    <div className={c.page}>
      <header className={c.header}>
        <a href="/" className={c.brand}>
          Dune<span className={c.brandAccent}>Buddy</span>
        </a>
      </header>
      {children}
    </div>
  );
}

export function Card({ title, children, actions }: { title?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  const c = useStyles();
  return (
    <section className={c.card}>
      {(title || actions) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {title && <h2 className={c.cardTitle}>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

type Variant = 'default' | 'primary' | 'danger';

export function Button({
  variant = 'default',
  block = false,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; /** Full width on phones. */ block?: boolean }) {
  const c = useStyles();
  const v = variant === 'primary' ? c.primary : variant === 'danger' ? c.danger : '';
  return (
    <button type="button" className={[c.button, v, block && c.block, className].filter(Boolean).join(' ')} {...rest} />
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const c = useStyles();
  if (!children) return null;
  return (
    <p role="alert" className={c.error}>
      {children}
    </p>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  const c = useStyles();
  return <p className={c.muted}>{children}</p>;
}
