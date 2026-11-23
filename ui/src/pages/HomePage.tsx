import { Link } from 'react-router-dom';
import { createUseStyles } from 'react-jss';
import type { FactionId } from 'common';
import type { Theme } from '../theme';
import { FactionEmblem } from '../components/FactionEmblem';
import { Page } from '../components/ui';

const useStyles = createUseStyles((theme: Theme) => ({
  intro: { color: theme.colors.textSecondary, marginBottom: theme.spacing.lg },
  tools: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: theme.spacing.md,
  },
  tool: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 120,
    padding: theme.spacing.lg,
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    textDecoration: 'none',
    color: theme.colors.text,
    '&:hover, &:focus-visible': { borderColor: theme.colors.primary },
    '&:active': { background: theme.colors.surfaceHover },
  },
  name: { fontSize: theme.fontSizes.xl, fontWeight: 700 },
  blurb: { color: theme.colors.textSecondary, fontSize: theme.fontSizes.md, marginTop: theme.spacing.xs },
  arrow: { marginLeft: 'auto', fontSize: 24, color: theme.colors.textMuted },
}));

const TOOLS: { to: string; name: string; blurb: string; emblem: FactionId }[] = [
  {
    to: '/rules',
    name: 'Rules reference',
    blurb: 'Search the rulebooks and official FAQ, with every edit logged.',
    emblem: 'bene-gesserit',
  },
  {
    to: '/draw',
    name: 'Draw for factions',
    blurb: 'Everyone votes for the factions they want, then the app assigns them fairly.',
    emblem: 'emperor',
  },
  {
    to: '/logbook',
    name: 'Atreides logbook',
    blurb: 'Keep track of every treachery card you see go to auction.',
    emblem: 'atreides',
  },
];

export function HomePage() {
  const c = useStyles();
  return (
    <Page>
      <p className={c.intro}>Tools for our Dune nights.</p>
      <nav className={c.tools}>
        {TOOLS.map((t) => (
          <Link key={t.to} to={t.to} className={c.tool}>
            <FactionEmblem faction={t.emblem} size={48} />
            <div>
              <div className={c.name}>{t.name}</div>
              <div className={c.blurb}>{t.blurb}</div>
            </div>
            <span className={c.arrow} aria-hidden>
              ›
            </span>
          </Link>
        ))}
      </nav>
    </Page>
  );
}
