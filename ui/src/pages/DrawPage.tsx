import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUseStyles } from 'react-jss';
import { DEFAULT_VOTES_PER_PLAYER, type FactionId } from 'common';
import { trpc } from '../trpc';
import type { Theme } from '../theme';
import { Button, Card, ErrorText, Muted, Page } from '../components/ui';
import { DEFAULT_FACTIONS, FactionPicker, orderedFactions } from '../components/FactionPicker';
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
    minHeight: 48,
    width: '100%',
    padding: `0 ${theme.spacing.sm}`,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    // 16px+ stops iOS Safari zooming in on focus.
    fontSize: 17,
    colorScheme: 'dark',
    textTransform: 'none',
    letterSpacing: 'normal',
    color: theme.colors.text,
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


export function DrawPage() {
  const c = useStyles();
  const navigate = useNavigate();
  const games = trpc.game.list.useQuery();
  const create = trpc.game.create.useMutation({ onSuccess: ({ id }) => navigate(`/g/${id}`) });

  const [name, setName] = useState('Dune night');
  const [gameDate, setGameDate] = useState(todayIso());
  const [votesPerPlayer, setVotesPerPlayer] = useState(DEFAULT_VOTES_PER_PLAYER);
  const [selected, setSelected] = useState<Set<FactionId>>(new Set(DEFAULT_FACTIONS));

  const submit = () =>
    create.mutate({
      name,
      gameDate,
      votesPerPlayer,
      factions: orderedFactions(selected),
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
            <FactionPicker selected={selected} onChange={setSelected} />
          </div>

          <div>
            <Button variant="primary" block onClick={submit} disabled={create.isPending || selected.size < 2 || !name.trim()}>
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
