import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUseStyles } from 'react-jss';
import { DEFAULT_VOTES_PER_PLAYER, EXPANSIONS, FACTIONS, type FactionId } from 'common';
import { trpc } from '../trpc';
import type { Theme } from '../theme';
import { Button, Card, ErrorText, Muted, Page } from '../components/ui';
import { FactionEmblem } from '../components/FactionEmblem';
import { errorMessage, formatGameDate, todayIso } from '../utils';

const useStyles = createUseStyles((theme: Theme) => ({
  form: { display: 'grid', gap: theme.spacing.md },
  row: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    gap: theme.spacing.md,
    '@media (max-width: 600px)': { gridTemplateColumns: '1fr 1fr', '& > :first-child': { gridColumn: '1 / -1' } },
  },
  label: {
    display: 'grid',
    gap: theme.spacing.xs,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    minHeight: 40,
    width: '100%',
    padding: `0 ${theme.spacing.sm}`,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSizes.lg,
    colorScheme: 'dark',
  },
  expansion: { marginTop: theme.spacing.sm },
  expansionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontWeight: 600,
    marginBottom: theme.spacing.sm,
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: '4px 12px 4px 4px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.background,
    cursor: 'pointer',
    opacity: 0.5,
    '&[aria-pressed="true"]': { opacity: 1, borderColor: theme.colors.primary },
  },
  games: { listStyle: 'none', display: 'grid', gap: theme.spacing.sm },
  game: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    textDecoration: 'none',
    color: theme.colors.text,
    '&:hover': { borderColor: theme.colors.textMuted },
  },
  gameMeta: { color: theme.colors.textMuted, fontSize: theme.fontSizes.md },
  badge: {
    fontSize: theme.fontSizes.sm,
    padding: '2px 8px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
    border: `1px solid ${theme.colors.border}`,
  },
  badgeOpen: { color: theme.colors.warning, borderColor: theme.colors.warning },
  badgeDone: { color: theme.colors.success, borderColor: theme.colors.success },
}));

const BASE_FACTIONS = FACTIONS.filter((f) => f.expansion === 'base').map((f) => f.id);

export function HomePage() {
  const c = useStyles();
  const navigate = useNavigate();
  const games = trpc.game.list.useQuery();
  const create = trpc.game.create.useMutation({ onSuccess: ({ id }) => navigate(`/g/${id}`) });

  const [name, setName] = useState('Dune night');
  const [gameDate, setGameDate] = useState(todayIso());
  const [votesPerPlayer, setVotesPerPlayer] = useState(DEFAULT_VOTES_PER_PLAYER);
  const [selected, setSelected] = useState<Set<FactionId>>(new Set(BASE_FACTIONS));

  const toggle = (id: FactionId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleExpansion = (expansion: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const f of FACTIONS) if (f.expansion === expansion) on ? next.add(f.id) : next.delete(f.id);
      return next;
    });

  const submit = () =>
    create.mutate({
      name,
      gameDate,
      votesPerPlayer,
      factions: FACTIONS.map((f) => f.id).filter((id) => selected.has(id)),
    });

  return (
    <Page>
      <Card title="Start a faction draw">
        <div className={c.form}>
          <div className={c.row}>
            <label className={c.label}>
              Game name
              <input className={c.input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className={c.label}>
              Date
              <input className={c.input} type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} />
            </label>
            <label className={c.label}>
              Votes each
              <input
                className={c.input}
                type="number"
                min={1}
                max={20}
                value={votesPerPlayer}
                onChange={(e) => setVotesPerPlayer(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              />
            </label>
          </div>

          <div>
            <div className={c.label}>Factions in play ({selected.size})</div>
            {EXPANSIONS.map((exp) => {
              const factions = FACTIONS.filter((f) => f.expansion === exp.id);
              const allOn = factions.every((f) => selected.has(f.id));
              return (
                <div key={exp.id} className={c.expansion}>
                  <label className={c.expansionHead}>
                    <input type="checkbox" checked={allOn} onChange={(e) => toggleExpansion(exp.id, e.target.checked)} />
                    {exp.name}
                  </label>
                  <div className={c.chips}>
                    {factions.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={c.chip}
                        aria-pressed={selected.has(f.id)}
                        onClick={() => toggle(f.id)}
                      >
                        <FactionEmblem faction={f.id} size={28} />
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <Button variant="primary" onClick={submit} disabled={create.isPending || selected.size < 2 || !name.trim()}>
              {create.isPending ? 'Creating…' : 'Create draw & get link'}
            </Button>
            <ErrorText>{create.error && errorMessage(create.error)}</ErrorText>
          </div>
        </div>
      </Card>

      <Card title="Recent draws">
        {games.isLoading && <Muted>Loading…</Muted>}
        {games.error && <ErrorText>{errorMessage(games.error)}</ErrorText>}
        {games.data?.length === 0 && <Muted>No draws yet.</Muted>}
        <ul className={c.games}>
          {games.data?.map((g) => (
            <li key={g.id}>
              <Link to={`/g/${g.id}`} className={c.game}>
                <div>
                  <div>{g.name}</div>
                  <div className={c.gameMeta}>
                    {formatGameDate(g.gameDate)} · {g.playerCount} {g.playerCount === 1 ? 'player' : 'players'}
                  </div>
                </div>
                <span className={`${c.badge} ${g.status === 'open' ? c.badgeOpen : c.badgeDone}`}>
                  {g.status === 'open' ? 'Voting' : 'Drawn'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}
