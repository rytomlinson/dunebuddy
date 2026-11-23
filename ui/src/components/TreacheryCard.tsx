import { createUseStyles } from 'react-jss';
import { getCardKind, type CardGroup } from 'common';
import type { Theme } from '../theme';

export const GROUP_COLORS: Record<CardGroup, string> = {
  weapon: '#D0453A',
  defense: '#3F82D1',
  special: '#A36BD1',
  worthless: '#8A7B66',
  unknown: '#8F7D66',
};

const useStyles = createUseStyles((theme: Theme) => ({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    minHeight: 30,
    minWidth: 30,
    padding: '0 6px',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    border: '1.5px solid',
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    color: theme.colors.text,
  },
  large: { minHeight: 44, minWidth: 44, padding: '0 10px', fontSize: 15 },
  glyph: { fontSize: 17 },
  largeGlyph: { fontSize: 22 },
  unknown: { borderStyle: 'dashed', color: theme.colors.textSecondary },
}));

/** A treachery card drawn as its symbol, plus a short name for named cards. */
export function TreacheryCard({ kind, large = false, showName = false }: { kind: string; large?: boolean; showName?: boolean }) {
  const c = useStyles();
  const k = getCardKind(kind);
  const color = GROUP_COLORS[k.group];
  const text = showName ? k.name : k.short;
  return (
    <span
      className={[c.chip, large && c.large, k.group === 'unknown' && c.unknown].filter(Boolean).join(' ')}
      style={{ borderColor: color, background: `${color}2E` }}
      title={k.name}
      aria-label={k.name}
    >
      <span className={large ? c.largeGlyph : c.glyph} aria-hidden>
        {k.glyph}
      </span>
      {text && <span aria-hidden>{text}</span>}
    </span>
  );
}
