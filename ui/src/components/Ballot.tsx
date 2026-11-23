import { useEffect, useState } from 'react';
import { createUseStyles } from 'react-jss';
import { factionName, type FactionId, type GameView, type Votes } from 'common';
import { trpc } from '../trpc';
import type { Theme } from '../theme';
import { useAppDispatch, useAppSelector } from '../hooks';
import { selectPlayerName, setPlayerName } from '../slices';
import { errorMessage, loadEditToken, saveEditToken } from '../utils';
import { FactionEmblem } from './FactionEmblem';
import { Button, Card, ErrorText, Muted } from './ui';

const useStyles = createUseStyles((theme: Theme) => ({
  nameRow: {
    display: 'flex',
    gap: theme.spacing.md,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  label: {
    display: 'grid',
    gap: theme.spacing.xs,
    flex: '1 1 220px',
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    minHeight: 44,
    padding: `0 ${theme.spacing.sm}`,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSizes.lg,
  },
  remaining: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: 44,
    fontWeight: 600,
  },
  pip: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: `2px solid ${theme.colors.primary}`,
  },
  pipFull: { background: theme.colors.primary },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: theme.spacing.sm,
  },
  faction: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    background: theme.colors.background,
    border: `2px solid ${theme.colors.border}`,
    transition: 'border-color 120ms',
  },
  factionVoted: { borderColor: theme.colors.primary },
  factionName: { fontWeight: 600, textAlign: 'center' },
  stepper: { display: 'flex', alignItems: 'center', gap: theme.spacing.sm },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surfaceHover,
    fontSize: 20,
    lineHeight: 1,
    cursor: 'pointer',
    '&:disabled': { opacity: 0.3, cursor: 'not-allowed' },
  },
  count: { minWidth: 20, textAlign: 'center', fontSize: theme.fontSizes.xl, fontWeight: 700 },
  actions: {
    display: 'flex',
    gap: theme.spacing.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: theme.spacing.lg,
  },
  saved: { color: theme.colors.success, fontSize: theme.fontSizes.md },
}));

export function Ballot({ game }: { game: GameView }) {
  const c = useStyles();
  const dispatch = useAppDispatch();
  const utils = trpc.useUtils();
  const rememberedName = useAppSelector(selectPlayerName);

  const [editToken, setEditToken] = useState<string | null>(() => loadEditToken(game.id));
  const mine = trpc.game.myBallot.useQuery(
    { gameId: game.id, editToken: editToken ?? '' },
    { enabled: !!editToken }
  );

  const [name, setName] = useState(rememberedName);
  const [votes, setVotes] = useState<Votes>({});
  const [dirty, setDirty] = useState(false);

  // Load an existing ballot from this device once.
  useEffect(() => {
    if (mine.data) {
      setName(mine.data.playerName);
      setVotes(mine.data.votes);
      setDirty(false);
    } else if (mine.isSuccess && mine.data === null) {
      // Token no longer matches a ballot (withdrawn or reset elsewhere).
      saveEditToken(game.id, null);
      setEditToken(null);
    }
  }, [mine.data, mine.isSuccess, game.id]);

  const submit = trpc.game.submitBallot.useMutation({
    onSuccess: ({ editToken: token }) => {
      saveEditToken(game.id, token);
      setEditToken(token);
      dispatch(setPlayerName(name.trim()));
      setDirty(false);
      utils.game.get.invalidate({ gameId: game.id });
      utils.game.myBallot.invalidate();
    },
  });
  const withdraw = trpc.game.withdrawBallot.useMutation({
    onSuccess: () => {
      saveEditToken(game.id, null);
      setEditToken(null);
      setVotes({});
      setDirty(false);
      utils.game.get.invalidate({ gameId: game.id });
    },
  });

  const spent = Object.values(votes).reduce((a, b) => a + (b ?? 0), 0);
  const remaining = game.votesPerPlayer - spent;
  const hasBallot = !!editToken && !!mine.data;

  const change = (faction: FactionId, delta: number) => {
    setVotes((prev) => {
      const next = { ...prev, [faction]: Math.max(0, (prev[faction] ?? 0) + delta) };
      if (next[faction] === 0) delete next[faction];
      return next;
    });
    setDirty(true);
  };

  const canSubmit = remaining === 0 && name.trim().length > 0 && !submit.isPending && (dirty || !hasBallot);

  return (
    <Card title={hasBallot ? 'Your ballot' : 'Cast your votes'}>
      <Muted>
        Spend all {game.votesPerPlayer} votes. Stack them on one faction or split them. Nobody sees anyone's
        votes until the draw.
      </Muted>

      <div className={c.nameRow} style={{ marginTop: 16 }}>
        <label className={c.label}>
          Your name
          <input
            className={c.input}
            value={name}
            maxLength={40}
            autoComplete="nickname"
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
          />
        </label>
        <div className={c.remaining} aria-live="polite" title={`${remaining} votes left`}>
          {Array.from({ length: game.votesPerPlayer }, (_, i) => (
            <span key={i} className={`${c.pip} ${i < spent ? c.pipFull : ''}`} />
          ))}
          <span style={{ marginLeft: 8 }}>{remaining} left</span>
        </div>
      </div>

      <div className={c.grid}>
        {(game.factions as FactionId[]).map((f) => {
          const n = votes[f] ?? 0;
          return (
            <div key={f} className={`${c.faction} ${n > 0 ? c.factionVoted : ''}`}>
              <FactionEmblem faction={f} size={64} />
              <div className={c.factionName}>{factionName(f)}</div>
              <div className={c.stepper}>
                <button
                  type="button"
                  className={c.stepBtn}
                  aria-label={`Remove a vote from ${factionName(f)}`}
                  disabled={n === 0}
                  onClick={() => change(f, -1)}
                >
                  −
                </button>
                <span className={c.count}>{n}</span>
                <button
                  type="button"
                  className={c.stepBtn}
                  aria-label={`Add a vote to ${factionName(f)}`}
                  disabled={remaining === 0}
                  onClick={() => change(f, 1)}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={c.actions}>
        <Button
          variant="primary"
          disabled={!canSubmit}
          onClick={() => submit.mutate({ gameId: game.id, playerName: name, votes, editToken: editToken ?? undefined })}
        >
          {submit.isPending ? 'Saving…' : hasBallot ? 'Update ballot' : 'Submit ballot'}
        </Button>
        {hasBallot && (
          <Button
            variant="danger"
            disabled={withdraw.isPending}
            onClick={() => {
              if (confirm('Withdraw your ballot? You will no longer be in this draw.')) {
                withdraw.mutate({ gameId: game.id, editToken: editToken! });
              }
            }}
          >
            Withdraw
          </Button>
        )}
        {hasBallot && !dirty && <span className={c.saved}>✓ Ballot saved as {mine.data!.playerName}</span>}
      </div>
      <ErrorText>{(submit.error && errorMessage(submit.error)) || (withdraw.error && errorMessage(withdraw.error))}</ErrorText>
    </Card>
  );
}
