import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { createUseStyles } from 'react-jss';
import { MAX_PLAYERS, MIN_PLAYERS } from 'common';
import { trpc } from '../trpc';
import type { Theme } from '../theme';
import { Ballot } from '../components/Ballot';
import { DrawResults, PreviousDraws } from '../components/DrawResults';
import { Button, Card, ErrorText, Muted, Page } from '../components/ui';
import { errorMessage, formatGameDate } from '../utils';

const useStyles = createUseStyles((theme: Theme) => ({
  title: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: 700,
    lineHeight: 1.2,
    '@media (max-width: 600px)': { fontSize: 24 },
  },
  meta: { color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  intro: { marginBottom: theme.spacing.lg },
  share: { display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap', marginTop: theme.spacing.md },
  url: {
    flex: '1 1 240px',
    minWidth: 0,
    minHeight: 40,
    padding: `0 ${theme.spacing.sm}`,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
    '@media (max-width: 600px)': { display: 'none' },
  },
  players: { display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm, margin: `${theme.spacing.sm} 0 ${theme.spacing.md}` },
  player: {
    padding: '4px 12px',
    borderRadius: 999,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
  },
  rules: {
    marginTop: theme.spacing.md,
    paddingLeft: 20,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.md,
    display: 'grid',
    gap: theme.spacing.xs,
  },
}));

export function GamePage() {
  const c = useStyles();
  const { gameId = '' } = useParams();
  const utils = trpc.useUtils();
  const game = trpc.game.get.useQuery(
    { gameId },
    { refetchInterval: (q) => (q.state.data?.status === 'open' ? 4000 : 15000) }
  );
  const calculate = trpc.game.calculate.useMutation({ onSuccess: () => utils.game.get.invalidate({ gameId }) });
  const reset = trpc.game.reset.useMutation({ onSuccess: () => utils.game.get.invalidate({ gameId }) });
  const [copied, setCopied] = useState(false);

  if (game.isLoading) {
    return (
      <Page>
        <Muted>Loading…</Muted>
      </Page>
    );
  }
  if (!game.data) {
    return (
      <Page>
        <Card title="Draw not found">
          <ErrorText>{game.error ? errorMessage(game.error) : 'This link does not match a draw.'}</ErrorText>
        </Card>
      </Page>
    );
  }

  const g = game.data;
  const maxPlayers = Math.min(MAX_PLAYERS, g.factions.length);
  const canCalculate = g.players.length >= MIN_PLAYERS && g.players.length <= g.factions.length;
  const shareUrl = window.location.href;

  const canShare = typeof navigator.share === 'function';
  const share = async () => {
    try {
      if (canShare) {
        await navigator.share({ title: `${g.name} faction draw`, text: 'Cast your faction votes', url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* share cancelled or clipboard blocked; the URL is selectable in the field on larger screens */
    }
  };

  return (
    <Page>
      <div className={c.intro}>
        <h1 className={c.title}>{g.name}</h1>
        <div className={c.meta}>
          {formatGameDate(g.gameDate)} · {g.votesPerPlayer} votes each · {g.factions.length} factions in play
        </div>
        {g.status === 'open' && (
          <div className={c.share}>
            <input className={c.url} readOnly value={shareUrl} onFocus={(e) => e.target.select()} aria-label="Share link" />
            <Button block onClick={share}>
              {copied ? 'Link copied ✓' : canShare ? 'Share link with the table' : 'Copy link'}
            </Button>
          </div>
        )}
      </div>

      {g.status === 'calculated' && g.result ? (
        <>
          <DrawResults result={g.result} resetHistory={g.resetHistory} />
          <Card title="Need a redo?">
            <Muted>
              Resetting reopens voting and redraws on the next calculate. The current result is kept in this
              game's history so everyone can see it was reset.
            </Muted>
            <div style={{ marginTop: 12 }}>
              <Button
                variant="danger"
                block
                disabled={reset.isPending}
                onClick={() => {
                  if (confirm('Reset the draw? Everyone will see that this result was discarded.')) {
                    reset.mutate({ gameId });
                  }
                }}
              >
                Reset draw
              </Button>
            </div>
            <ErrorText>{reset.error && errorMessage(reset.error)}</ErrorText>
          </Card>
        </>
      ) : (
        <>
          <Ballot game={g} />

          <Card title={`Who's voted (${g.players.length}/${maxPlayers})`}>
            {g.players.length === 0 ? (
              <div style={{ marginBottom: 12 }}>
                <Muted>No ballots yet. Share the link with your table.</Muted>
              </div>
            ) : (
              <div className={c.players}>
                {g.players.map((p) => (
                  <span key={p} className={c.player}>
                    {p}
                  </span>
                ))}
              </div>
            )}
            <Button
              variant="primary"
              block
              disabled={!canCalculate || calculate.isPending}
              onClick={() => {
                if (
                  confirm(
                    `Draw factions for ${g.players.length} players now? Voting closes and the result is locked for everyone.`
                  )
                ) {
                  calculate.mutate({ gameId });
                }
              }}
            >
              {calculate.isPending ? 'Drawing…' : 'Calculate assignments'}
            </Button>
            {!canCalculate && <Muted>At least {MIN_PLAYERS} players need to vote first.</Muted>}
            <ErrorText>{calculate.error && errorMessage(calculate.error)}</ErrorText>

            <ol className={c.rules}>
              <li>The highest bid on any faction wins it. Ties are decided by a random draw.</li>
              <li>Each player can win only one faction. Their other bids drop out, and the next-highest bid is resolved.</li>
              <li>Anyone left without a faction is dealt one at random from the unclaimed factions.</li>
              <li>The draw runs on the server and is locked once calculated. Ballots are revealed then.</li>
            </ol>
          </Card>

          {g.resetHistory.length > 0 && (
            <Card>
              <PreviousDraws history={g.resetHistory} />
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
