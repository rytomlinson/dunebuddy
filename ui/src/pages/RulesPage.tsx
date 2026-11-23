import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createUseStyles } from 'react-jss';
import { TRPCClientError } from '@trpc/client';
import { searchRules, searchTerms, type RuleSection } from 'common';
import { trpc } from '../trpc';
import type { Theme } from '../theme';
import { FactionEmblem } from '../components/FactionEmblem';
import { EditSheet, formatWhen, HistorySheet } from '../components/RuleSheets';
import { factionIn, RulesText, Snippet, unitDomId } from '../components/RulesText';
import { Sheet } from '../components/Sheet';
import { Button, Card, ErrorText, Muted, Page } from '../components/ui';
import { errorMessage, loadRulesPasscode, saveRulesPasscode } from '../utils';

const useStyles = createUseStyles((theme: Theme) => ({
  top: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.spacing.md },
  title: { fontSize: 24, fontWeight: 700 },
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} 0`,
    margin: `${theme.spacing.sm} 0 ${theme.spacing.md}`,
    background: theme.colors.background,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  searchWrap: { position: 'relative', flex: 1, minWidth: 0 },
  search: {
    width: '100%',
    minHeight: 44,
    padding: `0 36px 0 ${theme.spacing.sm}`,
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    fontSize: 17,
    color: theme.colors.text,
  },
  clear: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 44,
    border: 'none',
    background: 'none',
    color: theme.colors.textMuted,
    fontSize: 20,
    cursor: 'pointer',
  },
  results: { listStyle: 'none', display: 'grid', gap: theme.spacing.sm, paddingBottom: theme.spacing.xl },
  result: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: theme.spacing.md,
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    '&:hover, &:focus-visible': { borderColor: theme.colors.primary },
  },
  path: { fontSize: theme.fontSizes.sm, color: theme.colors.primary, marginBottom: 4, fontWeight: 600 },
  snippet: { fontSize: theme.fontSizes.md, color: theme.colors.textSecondary, lineHeight: 1.5 },
  count: { color: theme.colors.textMuted, fontSize: theme.fontSizes.md, marginBottom: theme.spacing.sm },
  section: { scrollMarginTop: '76px', marginBottom: theme.spacing.md },
  chapter: {
    fontSize: 22,
    fontWeight: 700,
    margin: `${theme.spacing.xl} 0 ${theme.spacing.sm}`,
    paddingBottom: theme.spacing.xs,
    borderBottom: `2px solid ${theme.colors.primary}`,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  head: { display: 'flex', alignItems: 'center', gap: theme.spacing.sm, margin: `${theme.spacing.lg} 0 2px` },
  h2: { fontSize: 19, fontWeight: 700, flex: 1, minWidth: 0 },
  h3: { fontSize: 16, fontWeight: 700, flex: 1, minWidth: 0, color: theme.colors.textSecondary },
  tools: { display: 'flex', gap: 4 },
  tool: {
    minWidth: 40,
    minHeight: 36,
    padding: '0 8px',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    background: 'transparent',
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.md,
    cursor: 'pointer',
  },
  source: { fontSize: theme.fontSizes.sm, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  edited: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    margin: `${theme.spacing.xs} 0 ${theme.spacing.sm}`,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    fontSize: theme.fontSizes.md,
    border: `1px solid ${theme.colors.warning}`,
    borderLeftWidth: 4,
    borderRadius: theme.borderRadius.sm,
    background: 'rgba(226, 179, 60, 0.08)',
    color: theme.colors.text,
    cursor: 'pointer',
  },
  toc: { listStyle: 'none', display: 'grid', gap: 2 },
  tocItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    width: '100%',
    minHeight: 40,
    padding: `4px ${theme.spacing.sm}`,
    textAlign: 'left',
    background: 'none',
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    color: theme.colors.text,
    '&:hover': { background: theme.colors.surfaceHover },
  },
  gateInput: {
    width: '100%',
    minHeight: 48,
    margin: `${theme.spacing.md} 0`,
    padding: `0 ${theme.spacing.sm}`,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    fontSize: 17,
    color: theme.colors.text,
  },
}));

function isAuthError(err: unknown): boolean {
  return err instanceof TRPCClientError && ['UNAUTHORIZED', 'TOO_MANY_REQUESTS'].includes(err.data?.code);
}

function PasscodeGate({ onUnlocked, notice }: { onUnlocked: () => void; notice?: string }) {
  const c = useStyles();
  const [passcode, setPasscode] = useState('');
  const unlock = trpc.rules.unlock.useMutation({
    onSuccess: () => {
      saveRulesPasscode(passcode.trim());
      onUnlocked();
    },
  });
  return (
    <Page>
      <Card title="Rules reference">
        <Muted>The rules are for our group only. Enter the group passcode once on this device.</Muted>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            unlock.mutate({ passcode });
          }}
        >
          <input
            className={c.gateInput}
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            aria-label="Passcode"
          />
          <Button variant="primary" block type="submit" disabled={!passcode.trim() || unlock.isPending}>
            {unlock.isPending ? 'Checking…' : 'Unlock rules'}
          </Button>
        </form>
        <ErrorText>{unlock.error ? errorMessage(unlock.error) : notice}</ErrorText>
      </Card>
    </Page>
  );
}

/** Chapter › Section › Subsection titles for a section, for search results. */
function pathTo(sections: RuleSection[], id: string): string {
  const i = sections.findIndex((s) => s.id === id);
  if (i === -1) return '';
  const parts = [sections[i].title];
  let level = sections[i].level;
  for (let j = i - 1; j >= 0 && level > 1; j--) {
    if (sections[j].level < level) {
      parts.unshift(sections[j].title);
      level = sections[j].level;
    }
  }
  return parts.join(' › ');
}

type Flash = { sectionId: string; unit: number; terms: string[] };

export function RulesPage() {
  const c = useStyles();
  const utils = trpc.useUtils();
  const [hasPasscode, setHasPasscode] = useState(() => Boolean(loadRulesPasscode()));
  const sections = trpc.rules.sections.useQuery(undefined, {
    enabled: hasPasscode,
    staleTime: 60_000,
    retry: (count, err) => !isAuthError(err) && count < 2,
  });
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [toc, setToc] = useState(false);
  const [editing, setEditing] = useState<{ section: RuleSection; startText?: string } | null>(null);
  const [history, setHistory] = useState<RuleSection | null>(null);
  const jumped = useRef(false);
  // Element to scroll to once the document is showing again (after closing results or contents).
  const [scrollTarget, setScrollTarget] = useState<{ id: string } | null>(null);

  const list = sections.data;
  const terms = useMemo(() => searchTerms(query), [query]);
  const hits = useMemo(() => (list && terms.length ? searchRules(list, query) : []), [list, query, terms]);

  // Open a shared link (#section-id) at its section once the text has loaded.
  useEffect(() => {
    if (!list || jumped.current) return;
    jumped.current = true;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, [list]);

  useEffect(() => {
    if (!scrollTarget) return;
    document.getElementById(scrollTarget.id)?.scrollIntoView({ block: 'start' });
  }, [scrollTarget]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  if (!hasPasscode || (sections.error && isAuthError(sections.error))) {
    return (
      <PasscodeGate
        notice={sections.error ? errorMessage(sections.error) : undefined}
        onUnlocked={() => {
          setHasPasscode(true);
          void utils.rules.sections.invalidate();
        }}
      />
    );
  }

  const goTo = (sectionId: string, unit = -1, highlight: string[] = []) => {
    setShowResults(false);
    setToc(false);
    setFlash(unit >= 0 ? { sectionId, unit, terms: highlight } : null);
    window.history.replaceState(null, '', `#${sectionId}`);
    setScrollTarget({ id: unit >= 0 ? unitDomId(sectionId, unit) : sectionId });
  };

  const copyLink = async (s: RuleSection) => {
    const url = `${window.location.origin}/rules#${s.id}`;
    try {
      if (typeof navigator.share === 'function') await navigator.share({ title: s.title, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* share cancelled */
    }
  };

  return (
    <Page>
      <div className={c.top}>
        <h1 className={c.title}>Rules</h1>
        <Link to="/rules/log">Edit log</Link>
      </div>

      <div className={c.bar}>
        <div className={c.searchWrap}>
          <input
            className={c.search}
            type="text"
            enterKeyHint="search"
            placeholder="Search the rules…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => query && setShowResults(true)}
            aria-label="Search the rules"
          />
          {query && (
            <button
              type="button"
              className={c.clear}
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                setShowResults(false);
              }}
            >
              ×
            </button>
          )}
        </div>
        <Button onClick={() => setToc(true)} disabled={!list}>
          Contents
        </Button>
      </div>

      {sections.isLoading && <Muted>Loading the rules…</Muted>}
      <ErrorText>{sections.error && !isAuthError(sections.error) && errorMessage(sections.error)}</ErrorText>

      {list && showResults && terms.length > 0 && (
        <>
          <div className={c.count}>
            {hits.length === 0
              ? 'No matches. Try fewer or different words.'
              : `${hits.length}${hits.length === 60 ? '+' : ''} ${hits.length === 1 ? 'match' : 'matches'}`}
          </div>
          <ul className={c.results}>
            {hits.map((h) => (
              <li key={`${h.sectionId}:${h.unit}`}>
                <button type="button" className={c.result} onClick={() => goTo(h.sectionId, h.unit, terms)}>
                  <div className={c.path}>
                    <Snippet text={pathTo(list, h.sectionId)} terms={h.unit === -1 ? terms : []} />
                  </div>
                  {h.snippet && (
                    <div className={c.snippet}>
                      <Snippet text={h.snippet} terms={terms} />
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{ display: list && showResults && terms.length > 0 ? 'none' : undefined }}>
        {list?.map((s) => {
          const faction = factionIn(s.title);
          if (s.level === 1) {
            return (
              <h2 key={s.id} id={s.id} className={`${c.section} ${c.chapter}`}>
                {s.title}
              </h2>
            );
          }
          const H = s.level === 2 ? 'h3' : 'h4';
          return (
            <section key={s.id} id={s.id} className={c.section}>
              <div className={c.head}>
                {faction && <FactionEmblem faction={faction} size={s.level === 2 ? 32 : 24} />}
                <H className={s.level === 2 ? c.h2 : c.h3}>{s.title}</H>
                <div className={c.tools}>
                  <button type="button" className={c.tool} onClick={() => void copyLink(s)} aria-label={`Share link to ${s.title}`}>
                    🔗
                  </button>
                  <button type="button" className={c.tool} onClick={() => setEditing({ section: s })} aria-label={`Edit ${s.title}`}>
                    ✎ Edit
                  </button>
                </div>
              </div>
              {s.source && <div className={c.source}>{s.source}</div>}
              {s.lastEdit && (
                <button type="button" className={c.edited} onClick={() => setHistory(s)}>
                  ✎ <strong>Edited</strong> by {s.lastEdit.editorName} · {formatWhen(s.lastEdit.createdAt)}
                  {s.editCount > 1 && ` (${s.editCount} edits)`} — “{s.lastEdit.explanation}” · <u>See changes</u>
                </button>
              )}
              <RulesText sectionId={s.id} body={s.body} flash={flash?.sectionId === s.id ? flash : null} />
            </section>
          );
        })}
      </div>

      {toc && list && (
        <Sheet title="Contents" onClose={() => setToc(false)}>
          <ul className={c.toc}>
            {list.map((s) => {
              const faction = factionIn(s.title);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={c.tocItem}
                    style={{
                      paddingLeft: 8 + (s.level - 1) * 18,
                      fontWeight: s.level === 1 ? 700 : 400,
                      color: s.level === 3 ? '#C9B79F' : undefined,
                      fontSize: s.level === 3 ? 14 : 16,
                    }}
                    onClick={() => goTo(s.id)}
                  >
                    {faction && s.level === 2 && <FactionEmblem faction={faction} size={22} />}
                    {s.title}
                    {s.editCount > 0 && ' ✎'}
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}

      {editing && (
        <EditSheet
          section={editing.section}
          startText={editing.startText}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void utils.rules.sections.invalidate();
            void utils.rules.edits.invalidate();
            void utils.rules.history.invalidate();
          }}
        />
      )}

      {history && (
        <HistorySheet
          section={history}
          onClose={() => setHistory(null)}
          onRestore={(text) => {
            setHistory(null);
            setEditing({ section: history, startText: text });
          }}
        />
      )}
    </Page>
  );
}
