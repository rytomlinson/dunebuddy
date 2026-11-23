import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createUseStyles } from 'react-jss';
import { TRPCClientError } from '@trpc/client';
import {
  addCard,
  CARD_KINDS,
  discardCard,
  factionName,
  getCardKind,
  getFaction,
  handLimit,
  handOf,
  identifyCard,
  isVague,
  moveCard,
  undo,
  type CardKind,
  type CardKindId,
  type FactionId,
  type LogbookState,
} from 'common';
import { trpc } from '../trpc';
import type { Theme } from '../theme';
import { FactionEmblem } from '../components/FactionEmblem';
import { Sheet } from '../components/Sheet';
import { GROUP_COLORS, TreacheryCard } from '../components/TreacheryCard';
import { Button, Card, ErrorText, Muted, Page } from '../components/ui';
import { errorMessage, rememberLogbook } from '../utils';

const PALETTE_LABELS: Partial<Record<CardKindId, string>> = {
  projectile: 'Projectile',
  poison: 'Poison',
  lasgun: 'Lasgun',
  shield: 'Shield',
  snooper: 'Snooper',
  worthless: 'Worthless',
  special: 'Special',
  unknown: 'Unknown',
};

const useStyles = createUseStyles((theme: Theme) => ({
  // Leaves room for the sticky palette.
  wrap: { paddingBottom: 200 },
  title: { fontSize: 24, fontWeight: 700, lineHeight: 1.2 },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSizes.md, marginTop: theme.spacing.xs },
  lastAction: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    margin: `${theme.spacing.md} 0`,
    padding: `${theme.spacing.xs} ${theme.spacing.xs} ${theme.spacing.xs} ${theme.spacing.md}`,
    minHeight: 52,
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
  },
  lastText: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rows: { display: 'grid', gap: theme.spacing.sm },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    width: '100%',
    minHeight: 64,
    padding: theme.spacing.sm,
    textAlign: 'left',
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    cursor: 'pointer',
  },
  rowArmed: {
    borderColor: theme.colors.primary,
    boxShadow: `0 0 0 1px ${theme.colors.primary}`,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: theme.spacing.sm },
  count: { fontSize: theme.fontSizes.md, color: theme.colors.textMuted, fontVariantNumeric: 'tabular-nums' },
  countFull: { color: theme.colors.warning },
  countOver: { color: theme.colors.error },
  hand: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  empty: { color: theme.colors.textMuted, fontSize: theme.fontSizes.md },
  palette: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    background: theme.colors.surface,
    borderTop: `1px solid ${theme.colors.border}`,
    padding: theme.spacing.sm,
    paddingBottom: `max(${theme.spacing.sm}, env(safe-area-inset-bottom))`,
  },
  paletteInner: { maxWidth: 560, margin: '0 auto' },
  hint: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    minHeight: 22,
    marginBottom: 6,
  },
  hintArmed: { color: theme.colors.primary, fontWeight: 600 },
  paletteGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 },
  paletteBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 56,
    padding: 2,
    border: '1.5px solid',
    borderRadius: theme.borderRadius.md,
    background: theme.colors.background,
    cursor: 'pointer',
    fontSize: 11,
    color: theme.colors.textSecondary,
    '&[aria-pressed="true"]': { background: theme.colors.surfaceHover, color: theme.colors.text, borderWidth: 3 },
  },
  paletteGlyph: { fontSize: 22, lineHeight: 1 },
  kindGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: theme.spacing.sm },
  kindBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 48,
    padding: `0 ${theme.spacing.sm}`,
    textAlign: 'left',
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.fontSizes.md,
  },
  sub: {
    fontSize: theme.fontSizes.sm,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: theme.colors.textMuted,
    margin: `${theme.spacing.md} 0 ${theme.spacing.sm}`,
  },
  sheetHand: { display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm },
  cardBtn: {
    padding: 0,
    border: '2px solid transparent',
    borderRadius: theme.borderRadius.md,
    background: 'none',
    cursor: 'pointer',
    '&[aria-pressed="true"]': { borderColor: theme.colors.text },
  },
  actions: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  factionList: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.sm },
  status: { fontSize: theme.fontSizes.sm, color: theme.colors.textMuted },
  statusBad: { color: theme.colors.error },
  discards: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: theme.spacing.sm },
}));

function newCardId(): string {
  return Math.random().toString(36).slice(2, 10);
}

type SaveStatus = 'saved' | 'saving' | 'error';

/**
 * Holds the logbook locally so taps are instant, and saves the whole state after each edit.
 * Saves are serialised; edits made while one is in flight go out in the next.
 */
function useLogbook(id: string) {
  const utils = trpc.useUtils();
  const query = trpc.logbook.get.useQuery({ id }, { refetchOnWindowFocus: false, staleTime: Infinity });
  const [state, setState] = useState<LogbookState | null>(null);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const version = useRef(0);
  const latest = useRef<LogbookState | null>(null);
  const dirty = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (query.data && latest.current === null) {
      latest.current = query.data.state;
      version.current = query.data.version;
      setState(query.data.state);
    }
  }, [query.data]);

  const flush = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus('saving');
    try {
      while (dirty.current && latest.current) {
        dirty.current = false;
        const res = await utils.client.logbook.save.mutate({ id, version: version.current, state: latest.current });
        version.current = res.version;
      }
      setStatus('saved');
      setSaveError(null);
    } catch (err) {
      setStatus('error');
      setSaveError(errorMessage(err));
      if (err instanceof TRPCClientError && err.data?.code === 'CONFLICT') {
        // Another screen saved first: show what's on the server rather than overwrite it.
        const fresh = await utils.client.logbook.get.query({ id });
        latest.current = fresh.state;
        version.current = fresh.version;
        dirty.current = false;
        setState(fresh.state);
      } else {
        dirty.current = true;
      }
    } finally {
      inFlight.current = false;
    }
  }, [id, utils]);

  const apply = useCallback(
    (next: LogbookState) => {
      latest.current = next;
      dirty.current = true;
      setState(next);
      void flush();
    },
    [flush]
  );

  return { query, state, apply, status, saveError, retry: flush };
}

type SheetMode =
  | { type: 'faction'; faction: FactionId; cardId?: string; step?: 'identify' | 'move' | 'add' }
  | { type: 'named' };

export function LogbookPage() {
  const c = useStyles();
  const { logId = '' } = useParams();
  const { query, state, apply, status, saveError, retry } = useLogbook(logId);
  const [armed, setArmed] = useState<CardKindId | null>(null);
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const book = query.data;

  useEffect(() => {
    if (book) rememberLogbook({ id: book.id, name: book.name, createdAt: book.updatedAt });
  }, [book]);

  // Named cards from the expansions this game is using.
  const namedKinds = useMemo<CardKind[]>(() => {
    const inPlay = new Set<string>(['base', ...(book?.factions ?? []).map((f) => getFaction(f)?.expansion ?? 'base')]);
    return CARD_KINDS.filter((k) => !('palette' in k && k.palette) && inPlay.has(k.expansion));
  }, [book?.factions]);
  const paletteKinds = useMemo<CardKind[]>(() => CARD_KINDS.filter((k) => 'palette' in k && k.palette), []);

  if (query.isLoading) {
    return (
      <Page>
        <Muted>Loading…</Muted>
      </Page>
    );
  }
  if (!book || !state) {
    return (
      <Page>
        <Card title="Logbook not found">
          <ErrorText>{query.error ? errorMessage(query.error) : 'This link does not match a logbook.'}</ErrorText>
        </Card>
      </Page>
    );
  }

  const handFor = (f: FactionId) => handOf(state, f);

  const give = (faction: FactionId) => {
    if (!armed) return;
    const { state: next, addedBonus } = addCard(state, faction, armed, newCardId, { auction: true });
    apply(next);
    setArmed(null);
    const size = handOf(next, faction).length;
    const limit = handLimit(faction);
    setNotice(
      size > limit
        ? `${factionName(faction)} now holds ${size} cards, over their limit of ${limit}. Check for a mistake.`
        : addedBonus
          ? 'Added Harkonnen’s bonus card as ?. Undo if they didn’t draw one.'
          : null
    );
  };

  const onRow = (faction: FactionId) => {
    if (armed) give(faction);
    else setSheet({ type: 'faction', faction });
  };

  const arm = (kind: CardKindId) => {
    setNotice(null);
    setArmed((cur) => (cur === kind ? null : kind));
  };

  const last = state.past[0];
  const armedKind = armed ? getCardKind(armed) : null;

  return (
    <Page>
      <div className={c.wrap}>
        <h1 className={c.title}>{book.name}</h1>
        <div className={c.meta}>
          Private: anyone with this link can see and edit it.{' '}
          <span className={status === 'error' ? c.statusBad : c.status}>
            {status === 'saving' ? 'Saving…' : status === 'error' ? 'Not saved.' : 'Saved.'}
          </span>
        </div>
        {saveError && (
          <ErrorText>
            {saveError}{' '}
            <button type="button" onClick={() => void retry()} style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: 'inherit' }}>
              Retry
            </button>
          </ErrorText>
        )}

        <div className={c.lastAction} aria-live="polite">
          <span className={c.lastText}>{notice ?? (last ? `Last: ${last.label}` : 'Nothing logged yet.')}</span>
          <Button disabled={!last} onClick={() => { setNotice(null); apply(undo(state)); }}>
            ↶ Undo
          </Button>
        </div>

        <div className={c.rows}>
          {book.factions.map((f) => {
            const hand = handFor(f);
            const limit = handLimit(f);
            return (
              <button
                key={f}
                type="button"
                className={[c.row, armed && c.rowArmed].filter(Boolean).join(' ')}
                onClick={() => onRow(f)}
                aria-label={`${factionName(f)}: ${hand.length} of ${limit} cards${
                  hand.length ? `, ${hand.map((h) => getCardKind(h.kind).name).join(', ')}` : ''
                }`}
              >
                <FactionEmblem faction={f} size={40} />
                <div className={c.rowBody}>
                  <div className={c.rowName}>
                    {factionName(f)}
                    <span className={[c.count, hand.length === limit && c.countFull, hand.length > limit && c.countOver].filter(Boolean).join(' ')}>
                      {hand.length}/{limit}
                    </span>
                  </div>
                  <div className={c.hand}>
                    {hand.length === 0 ? (
                      <span className={c.empty}>No cards</span>
                    ) : (
                      hand.map((card) => <TreacheryCard key={card.id} kind={card.kind} />)
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Card title={`Discard pile (${state.discards.length})`}>
          {state.discards.length === 0 ? (
            <Muted>Cards you mark as played or discarded end up here.</Muted>
          ) : (
            <div className={c.discards}>
              {state.discards.map((card) => (
                <TreacheryCard key={card.id} kind={card.kind} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className={c.palette}>
        <div className={c.paletteInner}>
          <div className={[c.hint, armed && c.hintArmed].filter(Boolean).join(' ')}>
            {armedKind ? `Tap the faction that won: ${armedKind.name}` : 'Auction: tap a card, then the faction that won it'}
          </div>
          <div className={c.paletteGrid}>
            {paletteKinds.map((k) => (
              <button
                key={k.id}
                type="button"
                className={c.paletteBtn}
                style={{ borderColor: GROUP_COLORS[k.group] }}
                aria-pressed={armed === k.id}
                onClick={() => arm(k.id as CardKindId)}
              >
                <span className={c.paletteGlyph} aria-hidden>
                  {k.glyph}
                </span>
                {PALETTE_LABELS[k.id as CardKindId]}
              </button>
            ))}
            {(() => {
              const named = armed && !PALETTE_LABELS[armed] ? getCardKind(armed) : null;
              return (
                <button
                  type="button"
                  className={c.paletteBtn}
                  style={{ borderColor: GROUP_COLORS.special }}
                  aria-pressed={Boolean(named)}
                  onClick={() => (named ? setArmed(null) : setSheet({ type: 'named' }))}
                >
                  <span className={c.paletteGlyph} aria-hidden>
                    {named ? named.glyph : '✦'}
                  </span>
                  {named ? named.short ?? named.name : 'By name…'}
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {sheet?.type === 'named' && (
        <Sheet title="Which card?" onClose={() => setSheet(null)}>
          <KindGrid
            kinds={namedKinds}
            onPick={(k) => {
              setArmed(k);
              setNotice(null);
              setSheet(null);
            }}
          />
        </Sheet>
      )}

      {sheet?.type === 'faction' && (
        <FactionSheet
          faction={sheet.faction}
          cardId={sheet.cardId}
          step={sheet.step}
          state={state}
          factions={book.factions}
          kinds={[...paletteKinds, ...namedKinds]}
          onNavigate={(next) => setSheet({ type: 'faction', faction: sheet.faction, ...next })}
          onApply={(next) => {
            setNotice(null);
            apply(next);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </Page>
  );
}

function KindGrid({ kinds, onPick }: { kinds: CardKind[]; onPick: (kind: CardKindId) => void }) {
  const c = useStyles();
  return (
    <div className={c.kindGrid}>
      {kinds.map((k) => (
        <button key={k.id} type="button" className={c.kindBtn} onClick={() => onPick(k.id as CardKindId)}>
          <TreacheryCard kind={k.id} />
          {k.name}
        </button>
      ))}
    </div>
  );
}

function FactionSheet({
  faction,
  cardId,
  step,
  state,
  factions,
  kinds,
  onNavigate,
  onApply,
  onClose,
}: {
  faction: FactionId;
  cardId?: string;
  step?: 'identify' | 'move' | 'add';
  state: LogbookState;
  factions: FactionId[];
  kinds: CardKind[];
  onNavigate: (next: { cardId?: string; step?: 'identify' | 'move' | 'add' }) => void;
  onApply: (next: LogbookState) => void;
  onClose: () => void;
}) {
  const c = useStyles();
  const hand = handOf(state, faction);
  const card = hand.find((h) => h.id === cardId);

  return (
    <Sheet
      title={
        <>
          <FactionEmblem faction={faction} size={32} />
          {factionName(faction)} · {hand.length}/{handLimit(faction)}
        </>
      }
      onClose={onClose}
    >
      {hand.length === 0 ? (
        <Muted>No cards logged.</Muted>
      ) : (
        <div className={c.sheetHand}>
          {hand.map((h) => (
            <button
              key={h.id}
              type="button"
              className={c.cardBtn}
              aria-pressed={h.id === cardId}
              onClick={() => onNavigate(h.id === cardId ? {} : { cardId: h.id })}
            >
              <TreacheryCard kind={h.kind} large showName={h.id === cardId} />
            </button>
          ))}
        </div>
      )}

      {card && (
        <>
          <div className={c.actions}>
            <Button
              onClick={() => {
                onApply(discardCard(state, faction, card.id));
                onNavigate({});
              }}
            >
              Played
            </Button>
            <Button aria-pressed={step === 'identify'} onClick={() => onNavigate({ cardId: card.id, step: 'identify' })}>
              {isVague(card.kind) ? 'Identify' : 'Change'}
            </Button>
            <Button aria-pressed={step === 'move'} onClick={() => onNavigate({ cardId: card.id, step: 'move' })}>
              Give to…
            </Button>
          </div>

          {step === 'identify' && (
            <>
              <h3 className={c.sub}>It’s actually…</h3>
              <KindGrid
                kinds={kinds.filter((k) => k.id !== card.kind)}
                onPick={(k) => {
                  onApply(identifyCard(state, faction, card.id, k));
                  onNavigate({});
                }}
              />
            </>
          )}

          {step === 'move' && (
            <>
              <h3 className={c.sub}>Give this card to</h3>
              <div className={c.factionList}>
                {factions
                  .filter((f) => f !== faction)
                  .map((f) => (
                    <Button
                      key={f}
                      onClick={() => {
                        onApply(moveCard(state, faction, card.id, f));
                        onNavigate({});
                      }}
                    >
                      <FactionEmblem faction={f} size={24} />
                      {factionName(f)}
                    </Button>
                  ))}
              </div>
            </>
          )}
        </>
      )}

      {!card && (
        <>
          <h3 className={c.sub}>{step === 'add' ? 'Add a card' : 'Tap a card to mark it played, identify it or move it'}</h3>
          {step === 'add' ? (
            <KindGrid kinds={kinds} onPick={(k) => onApply(addCard(state, faction, k, newCardId).state)} />
          ) : (
            <Button block onClick={() => onNavigate({ step: 'add' })}>
              + Add a card
            </Button>
          )}
        </>
      )}
    </Sheet>
  );
}
