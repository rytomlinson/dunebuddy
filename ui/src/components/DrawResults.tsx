import { createUseStyles } from 'react-jss';
import { factionName, type Assignment, type DrawResult, type FactionId } from 'common';
import type { Theme } from '../theme';
import { FactionEmblem } from './FactionEmblem';
import { Card, Muted } from './ui';

const useStyles = createUseStyles((theme: Theme) => ({
  list: { listStyle: 'none', display: 'grid', gap: theme.spacing.sm },
  row: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
  },
  player: { fontSize: theme.fontSizes.xl, fontWeight: 700 },
  faction: { color: theme.colors.primary, fontWeight: 600 },
  why: { color: theme.colors.textSecondary, fontSize: theme.fontSizes.md, marginTop: 2 },
  sub: { fontSize: theme.fontSizes.md, fontWeight: 600, margin: `${theme.spacing.lg} 0 ${theme.spacing.sm}` },
  unclaimed: { display: 'flex', flexWrap: 'wrap', gap: theme.spacing.md },
  unclaimedItem: { display: 'flex', alignItems: 'center', gap: theme.spacing.sm },
  tableWrap: { overflowX: 'auto' },
  table: {
    borderCollapse: 'collapse',
    fontSize: theme.fontSizes.md,
    minWidth: '100%',
    '& th, & td': {
      padding: `6px ${theme.spacing.sm}`,
      borderBottom: `1px solid ${theme.colors.border}`,
      textAlign: 'center',
      whiteSpace: 'nowrap',
    },
    '& th:first-child, & td:first-child': { textAlign: 'left' },
    '& th': { color: theme.colors.textMuted, fontWeight: 500 },
  },
  won: { color: theme.colors.primary, fontWeight: 700 },
  details: {
    marginTop: theme.spacing.md,
    '& summary': { cursor: 'pointer', color: theme.colors.textSecondary },
  },
}));

const plural = (n: number) => `${n} vote${n === 1 ? '' : 's'}`;

function list(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function explain(a: Assignment): string {
  const parts: string[] = [];
  switch (a.method) {
    case 'uncontested':
      parts.push(`${plural(a.votes)}, no rival bids`);
      break;
    case 'outbid':
      parts.push(`${plural(a.votes)}, beat ${list(a.outbid.map((o) => `${o.playerName} (${o.votes})`))}`);
      break;
    case 'tie':
      parts.push(`Tied with ${list(a.tiedWith)} at ${plural(a.votes)}; won the random draw`);
      if (a.outbid.length) parts.push(`also beat ${list(a.outbid.map((o) => `${o.playerName} (${o.votes})`))}`);
      break;
    case 'random':
      parts.push('No winning bid; dealt at random from the unclaimed factions');
      break;
  }
  if (a.alreadySeated.length) {
    parts.push(`${list(a.alreadySeated.map((o) => o.playerName))} also bid but had already won a faction`);
  }
  return parts.join(' · ');
}

function Ballots({ result }: { result: DrawResult }) {
  const c = useStyles();
  const factions = [
    ...new Set(result.ballots.flatMap((b) => Object.keys(b.votes)) as FactionId[]),
  ];
  const seatOf = new Map(result.assignments.map((a) => [a.playerName, a.faction]));
  return (
    <div className={c.tableWrap}>
      <table className={c.table}>
        <thead>
          <tr>
            <th>Player</th>
            {factions.map((f) => (
              <th key={f}>{factionName(f)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.ballots.map((b) => (
            <tr key={b.playerName}>
              <td>{b.playerName}</td>
              {factions.map((f) => (
                <td key={f} className={seatOf.get(b.playerName) === f ? c.won : undefined}>
                  {b.votes[f] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultList({ result }: { result: DrawResult }) {
  const c = useStyles();
  return (
    <>
      <ol className={c.list}>
        {result.assignments.map((a) => (
          <li key={a.playerName} className={c.row}>
            <FactionEmblem faction={a.faction} size={56} />
            <div>
              <div className={c.player}>
                {a.playerName} <span className={c.faction}>→ {factionName(a.faction)}</span>
              </div>
              <div className={c.why}>{explain(a)}</div>
            </div>
          </li>
        ))}
      </ol>

      {result.unclaimed.length > 0 && (
        <>
          <h3 className={c.sub}>Unclaimed (available for swaps)</h3>
          <div className={c.unclaimed}>
            {result.unclaimed.map((f) => (
              <span key={f} className={c.unclaimedItem}>
                <FactionEmblem faction={f} size={28} />
                {factionName(f)}
              </span>
            ))}
          </div>
        </>
      )}

      <h3 className={c.sub}>All ballots</h3>
      <Ballots result={result} />
    </>
  );
}

export function DrawResults({ result, resetHistory }: { result: DrawResult; resetHistory: DrawResult[] }) {
  return (
    <Card title="Faction assignments">
      <Muted>
        Drawn {new Date(result.calculatedAt).toLocaleString()} · locked for everyone
        {resetHistory.length > 0 && ` · draw has been reset ${resetHistory.length}×`}
      </Muted>
      <div style={{ marginTop: 16 }}>
        <ResultList result={result} />
      </div>
      {resetHistory.length > 0 && <PreviousDraws history={resetHistory} />}
    </Card>
  );
}

export function PreviousDraws({ history }: { history: DrawResult[] }) {
  const c = useStyles();
  return (
    <details className={c.details}>
      <summary>Previous draws that were reset ({history.length})</summary>
      {history.map((r) => (
        <div key={r.calculatedAt} style={{ marginTop: 12 }}>
          <Muted>Drawn {new Date(r.calculatedAt).toLocaleString()}</Muted>
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            {r.assignments.map((a) => (
              <li key={a.playerName}>
                {a.playerName} → {factionName(a.faction)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </details>
  );
}
