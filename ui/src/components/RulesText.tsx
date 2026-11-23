import { Fragment, type ReactNode } from 'react';
import { createUseStyles } from 'react-jss';
import { FACTIONS, getCardKind, highlightParts, splitUnits, type FactionId } from 'common';
import type { Theme } from '../theme';
import { FactionEmblem } from './FactionEmblem';
import { GROUP_COLORS } from './TreacheryCard';

const useStyles = createUseStyles((theme: Theme) => ({
  unit: {
    // Leaves room for the sticky search bar when jumping to a paragraph.
    scrollMarginTop: '76px',
    lineHeight: 1.55,
    margin: `0 0 ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.sm,
    transition: 'background-color 1.2s ease',
  },
  flash: { background: 'rgba(217, 130, 43, 0.22)', transition: 'none' },
  list: { margin: `0 0 ${theme.spacing.sm}`, paddingLeft: 22, '& li': { marginBottom: 4 } },
  tableWrap: { overflowX: 'auto', margin: `0 0 ${theme.spacing.md}`, WebkitOverflowScrolling: 'touch' },
  table: {
    borderCollapse: 'collapse',
    fontSize: theme.fontSizes.md,
    minWidth: '100%',
    '& th, & td': {
      border: `1px solid ${theme.colors.border}`,
      padding: '6px 8px',
      textAlign: 'left',
      verticalAlign: 'top',
    },
    '& th': { background: theme.colors.surfaceHover, fontWeight: 600 },
  },
  cell: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  glyph: {
    display: 'inline-block',
    fontSize: '0.85em',
    marginRight: 2,
    padding: '0 3px',
    borderRadius: 4,
    border: '1px solid',
    lineHeight: 1.3,
    fontStyle: 'normal',
  },
  mark: { background: theme.colors.primary, color: '#1A120A', borderRadius: 2, padding: '0 1px' },
  source: { color: theme.colors.textMuted, fontSize: theme.fontSizes.md },
}));

/**
 * Card names that get their treachery symbol in front of them, so cards stand out when
 * scanning a long ruling. Longer names first so "Shield Snooper" wins over "Shield".
 */
const CARD_MENTIONS: [RegExp, string][] = [
  [/\bShield Snooper\b/, 'shield-snooper'],
  [/\bPoison Blade\b/, 'poison-blade'],
  [/\bPoison Tooth\b/, 'poison-tooth'],
  [/\bThumper\b/, 'thumper'],
  [/\bArtillery Strike\b/, 'artillery-strike'],
  [/\bWeirding Way\b/, 'weirding-way'],
  [/\bChemistry\b/, 'chemistry'],
  [/\bFamily Atomics\b/, 'family-atomics'],
  [/\bWeather Control\b/, 'weather-control'],
  [/\b(?:Tleilaxu Ghola|Ghola card)\b/, 'tleilaxu-ghola'],
  [/\b[Cc]heap [Hh]ero(?:ine)?\b/, 'cheap-hero'],
  [/\b(?:Truthtrance|Truth Trance|Truthtrump|truthtrance)\b/, 'truthtrump'],
  [/\bHajr\b/, 'hajr'],
  [/\bKarama\b/, 'karama'],
  [/\b[Ll]asgun\b/, 'lasgun'],
  [/\bSnooper\b/, 'snooper'],
  [/(?<!Player )\bShield\b(?! Wall| Snooper)/, 'shield'],
  [/\b[Ww]orthless card\b/, 'worthless'],
];

const FACTION_BY_NAME = new Map<string, FactionId>(
  FACTIONS.flatMap((f) => [
    [f.name.toLowerCase(), f.id],
    [f.name.toLowerCase().replace(/s$/, ''), f.id],
  ])
);

/** A faction named at the start of a section title or table cell, e.g. "Atreides Q&A". */
export function factionIn(text: string): FactionId | undefined {
  const lower = text.toLowerCase();
  for (const [name, id] of FACTION_BY_NAME) {
    if (lower === name || lower.startsWith(`${name} `)) return id;
  }
  return undefined;
}

interface InlineOpts {
  terms: string[];
  /** Card kinds already marked in this paragraph; each card gets its symbol once. */
  marked: Set<string>;
  c: ReturnType<typeof useStyles>;
}

function withMarks(text: string, opts: InlineOpts, key: string): ReactNode[] {
  return highlightParts(text, opts.terms).map((p, i) =>
    p.match ? (
      <mark key={`${key}m${i}`} className={opts.c.mark}>
        {p.text}
      </mark>
    ) : (
      <Fragment key={`${key}t${i}`}>{p.text}</Fragment>
    )
  );
}

function withCardGlyphs(text: string, opts: InlineOpts, key: string): ReactNode[] {
  let best: { index: number; length: number; kind: string } | null = null;
  for (const [re, kind] of CARD_MENTIONS) {
    if (opts.marked.has(kind)) continue;
    const m = re.exec(text);
    if (m && (best === null || m.index < best.index)) best = { index: m.index, length: m[0].length, kind };
  }
  if (!best) return withMarks(text, opts, key);
  opts.marked.add(best.kind);
  const k = getCardKind(best.kind);
  return [
    ...withMarks(text.slice(0, best.index), opts, `${key}a`),
    <span
      key={`${key}g`}
      className={opts.c.glyph}
      style={{ borderColor: GROUP_COLORS[k.group], background: `${GROUP_COLORS[k.group]}2E` }}
      aria-hidden
    >
      {k.glyph}
    </span>,
    ...withMarks(text.slice(best.index, best.index + best.length), opts, `${key}n`),
    ...withCardGlyphs(text.slice(best.index + best.length), opts, `${key}b`),
  ];
}

/** **bold**, _italic_ and plain runs, with card symbols and search highlights. */
function inline(text: string, opts: InlineOpts, key = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|(^|[\s(])_(.+?)_(?=$|[\s).,;:])/g;
  let last = 0;
  let n = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const lead = m[2] ?? '';
    out.push(...withCardGlyphs(text.slice(last, m.index + lead.length), opts, `${key}${n}p`));
    if (m[1] !== undefined) {
      out.push(<strong key={`${key}${n}b`}>{withCardGlyphs(m[1], opts, `${key}${n}bi`)}</strong>);
    } else {
      out.push(<em key={`${key}${n}e`}>{withMarks(m[3], opts, `${key}${n}ei`)}</em>);
    }
    last = m.index + m[0].length;
    n++;
  }
  out.push(...withCardGlyphs(text.slice(last), opts, `${key}end`));
  return out;
}

function tableRows(unit: string): string[][] {
  return unit
    .split('\n')
    .filter((l) => l.trim().startsWith('|') && !/^\|?\s*-{3,}/.test(l.replace(/\s/g, '').replace(/^\|/, '')))
    .map((l) =>
      l
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim())
    );
}

type Group =
  | { kind: 'p'; index: number; text: string }
  | { kind: 'ul' | 'ol'; items: { index: number; text: string }[] }
  | { kind: 'table'; index: number; text: string };

function group(units: string[]): Group[] {
  const groups: Group[] = [];
  units.forEach((text, index) => {
    const last = groups[groups.length - 1];
    if (text.startsWith('|')) groups.push({ kind: 'table', index, text });
    else if (/^- /.test(text)) {
      if (last?.kind === 'ul') last.items.push({ index, text: text.slice(2) });
      else groups.push({ kind: 'ul', items: [{ index, text: text.slice(2) }] });
    } else if (/^\d+\.\s/.test(text)) {
      if (last?.kind === 'ol') last.items.push({ index, text: text.replace(/^\d+\.\s/, '') });
      else groups.push({ kind: 'ol', items: [{ index, text: text.replace(/^\d+\.\s/, '') }] });
    } else groups.push({ kind: 'p', index, text });
  });
  return groups;
}

export function unitDomId(sectionId: string, unit: number): string {
  return `u-${sectionId.replace(/\//g, '--')}-${unit}`;
}

/**
 * Renders a section body. `flash` highlights one paragraph (and its search terms) after a
 * search jump.
 */
export function RulesText({
  sectionId,
  body,
  flash,
}: {
  sectionId: string;
  body: string;
  flash?: { unit: number; terms: string[] } | null;
}) {
  const c = useStyles();
  const units = splitUnits(body);
  const opts = (index: number): InlineOpts => ({
    terms: flash && flash.unit === index ? flash.terms : [],
    marked: new Set(),
    c,
  });
  const cls = (index: number) => [c.unit, flash?.unit === index && c.flash].filter(Boolean).join(' ');

  return (
    <>
      {group(units).map((g) => {
        if (g.kind === 'p') {
          return (
            <p key={g.index} id={unitDomId(sectionId, g.index)} className={cls(g.index)}>
              {inline(g.text, opts(g.index))}
            </p>
          );
        }
        if (g.kind === 'table') {
          const [head, ...rows] = tableRows(g.text);
          const o = opts(g.index);
          const cell = (text: string, key: string) => {
            const f = factionIn(text);
            return f ? (
              <span className={c.cell}>
                <FactionEmblem faction={f} size={20} />
                {inline(text, o, key)}
              </span>
            ) : (
              inline(text, o, key)
            );
          };
          return (
            <div key={g.index} id={unitDomId(sectionId, g.index)} className={`${c.tableWrap} ${cls(g.index)}`}>
              <table className={c.table}>
                <thead>
                  <tr>
                    {head.map((h, i) => (
                      <th key={i}>{inline(h, o, `h${i}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((text, ci) => (
                        <td key={ci}>{cell(text, `r${ri}c${ci}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        const List = g.kind;
        return (
          <List key={g.items[0].index} className={c.list}>
            {g.items.map((item) => (
              <li key={item.index} id={unitDomId(sectionId, item.index)} className={cls(item.index)}>
                {inline(item.text, opts(item.index))}
              </li>
            ))}
          </List>
        );
      })}
    </>
  );
}

/** Search-result snippet with the matched terms highlighted. */
export function Snippet({ text, terms }: { text: string; terms: string[] }) {
  const c = useStyles();
  return (
    <>
      {highlightParts(text, terms).map((p, i) =>
        p.match ? (
          <mark key={i} className={c.mark}>
            {p.text}
          </mark>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        )
      )}
    </>
  );
}
