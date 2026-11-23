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

const PHONE = '@media (max-width: 600px)';

const useStyles = createUseStyles((theme: Theme) => ({
  label: {
    display: 'grid',
    gap: theme.spacing.xs,
    margin: `${theme.spacing.md} 0`,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    minHeight: 48,
    padding: `0 ${theme.spacing.md}`,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    // 16px+ stops iOS Safari zooming in on focus.
    fontSize: 17,
    textTransform: 'none',
    letterSpacing: 'normal',
    color: theme.colors.text,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: theme.spacing.sm,
    [PHONE]: { gridTemplateColumns: '1fr' },
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
    transition: 'border-color 120ms, background 120ms',
    [PHONE]: {
      flexDirection: 'row',
      padding: `${theme.spacing.sm} ${theme.spacing.sm} ${theme.spacing.sm} ${theme.spacing.md}`,
      gap: theme.spacing.md,
    },
  },
  factionVoted: { borderColor: theme.colors.primary, background: theme.colors.surfaceHover },
  // Tapping the emblem or name adds a vote: a big, easy target on phones.
  factionTap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.sm,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    '&:disabled': { cursor: 'default' },
    [PHONE]: { flexDirection: 'row', flex: 1, minWidth: 0, gap: theme.spacing.md, minHeight: 48 },
  },
  factionName: {
    fontWeight: 600,
    textAlign: 'center',
    fontSize: theme.fontSizes.lg,
    [PHONE]: { textAlign: 'left' },
  },
  stepper: { display: 'flex', alignItems: 'center', gap: theme.spacing.xs },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surfaceHover,
    fontSize: 22,
    lineHeight: 1,
    cursor: 'pointer',
    '&:disabled': { opacity: 0.25, cursor: 'not-allowed' },
  },
  count: { minWidth: 24, textAlign: 'center', fontSize: theme.fontSizes.xl, fontWeight: 700 },
  // Votes-left and submit stay in reach at the bottom of the screen.
  bar: {
    position: 'sticky',
    bottom: 0,
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    margin: `${theme.spacing.md} -${theme.spacing.lg} -${theme.spacing.lg}`,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    paddingBottom: `calc(${theme.spacing.md} + env(safe-area-inset-bottom))`,
    background: theme.colors.surface,
    borderTop: `1px solid ${theme.colors.border}`,
    borderRadius: `0 0 ${theme.borderRadius.lg} ${theme.borderRadius.lg}`,
    [PHONE]: {
      margin: `${theme.spacing.md} -${theme.spacing.md} -${theme.spacing.md}`,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      paddingBottom: `calc(${theme.spacing.sm} + env(safe-area-inset-bottom))`,
      borderRadius: 0,
      boxShadow: '0 -8px 16px rgba(0,0,0,0.35)',
    },
  },
  pips: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', flex: '0 1 auto' },
  pip: { width: 12, height: 12, borderRadius: '50%', border: `2px solid ${theme.colors.primary}` },
  pipFull: { background: theme.colors.primary },
  left: { fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 4 },
  barButtons: { display: 'flex', gap: theme.spacing.sm, marginLeft: 'auto' },
  submit: { minHeight: 48, padding: '0 20px', fontSize: theme.fontSizes.lg },
  status: { marginTop: theme.spacing.md, fontSize: theme.fontSizes.md },
  saved: { color: theme.colors.success },
  withdraw: {
    background: 'none',
    border: 'none',
    padding: `${theme.spacing.sm} 0`,
    color: theme.colors.error,
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: theme.fontSizes.md,
  },
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

  const trimmed = name.trim();
  const canSubmit = remaining === 0 && trimmed.length > 0 && !submit.isPending && (dirty || !hasBallot);
  const hint = !trimmed ? 'Enter your name' : remaining > 0 ? `${remaining} left` : 'Ready';

  return (
    <Card title={hasBallot ? 'Your ballot' : 'Cast your votes'}>
      <Muted>
        Spend all {game.votesPerPlayer} votes on one faction or split them. Nobody sees anyone's votes until the
        draw.
      </Muted>

      <label className={c.label}>
        Your name
        <input
          className={c.input}
          value={name}
          maxLength={40}
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="done"
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
        />
      </label>

      <div className={c.grid}>
        {(game.factions as FactionId[]).map((f) => {
          const n = votes[f] ?? 0;
          return (
            <div key={f} className={`${c.faction} ${n > 0 ? c.factionVoted : ''}`}>
              <button
                type="button"
                className={c.factionTap}
                disabled={remaining === 0}
                aria-label={`Add a vote to ${factionName(f)}`}
                onClick={() => change(f, 1)}
              >
                <FactionEmblem faction={f} size={52} />
                <span className={c.factionName}>{factionName(f)}</span>
              </button>
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
                <span className={c.count} aria-label={`${n} votes on ${factionName(f)}`}>
                  {n}
                </span>
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

      {(hasBallot || submit.error || withdraw.error) && (
        <div className={c.status}>
          {hasBallot && !dirty && <span className={c.saved}>✓ Saved as {mine.data!.playerName}. </span>}
          {hasBallot && (
            <button
              type="button"
              className={c.withdraw}
              disabled={withdraw.isPending}
              onClick={() => {
                if (confirm('Withdraw your ballot? You will no longer be in this draw.')) {
                  withdraw.mutate({ gameId: game.id, editToken: editToken! });
                }
              }}
            >
              Withdraw my ballot
            </button>
          )}
          <ErrorText>
            {(submit.error && errorMessage(submit.error)) || (withdraw.error && errorMessage(withdraw.error))}
          </ErrorText>
        </div>
      )}

      <div className={c.bar}>
        <div className={c.pips} aria-live="polite">
          {Array.from({ length: game.votesPerPlayer }, (_, i) => (
            <span key={i} className={`${c.pip} ${i < spent ? c.pipFull : ''}`} />
          ))}
          <span className={c.left}>{hint}</span>
        </div>
        <div className={c.barButtons}>
          <Button
            variant="primary"
            className={c.submit}
            disabled={!canSubmit}
            onClick={() =>
              submit.mutate({ gameId: game.id, playerName: name, votes, editToken: editToken ?? undefined })
            }
          >
            {submit.isPending ? 'Saving…' : hasBallot ? (dirty ? 'Update' : 'Saved ✓') : 'Submit'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
