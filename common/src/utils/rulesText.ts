/**
 * Helpers for the rules knowledge base: splitting section bodies into paragraphs ("units"),
 * full-text search with context snippets, and a word diff for the edit history.
 *
 * Section bodies use a small Markdown subset: paragraphs separated by blank lines,
 * **bold**, _italic_, "- " bullets, "1. " numbered items and | tables |.
 */

export interface RulesDoc {
  id: string;
  title: string;
  body: string;
}

/** A section body's paragraphs, list items and tables, each addressable for search jumps. */
export function splitUnits(body: string): string[] {
  return body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((u) => u.trim())
    .filter(Boolean);
}

/** Text without Markdown markers, for searching and snippets. */
export function plainText(unit: string): string {
  return unit
    .replace(/^\|?\s*-{3,}\s*(\|\s*-{3,}\s*)*\|?\s*$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|[\s(])_(.+?)_(?=$|[\s).,;:])/g, '$1$2')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lower-cased search terms; straight and curly apostrophes are treated alike. */
export function searchTerms(query: string): string[] {
  return [
    ...new Set(
      normalise(query)
        .split(/[^a-z0-9'½-]+/)
        .map((t) => t.replace(/^['-]+|['-]+$/g, ''))
        .filter((t) => t.length >= 2 || /^\d$/.test(t))
    ),
  ];
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[’‘]/g, "'");
}

export interface SearchHit {
  sectionId: string;
  sectionTitle: string;
  /** Index into splitUnits(body), or -1 when the section title itself matched. */
  unit: number;
  snippet: string;
  score: number;
}

const BEFORE = 70;
const AFTER = 110;

/** Up to ~180 characters around the first matching term, trimmed to whole words. */
export function snippetAround(text: string, terms: string[]): string {
  const lower = normalise(text);
  let at = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) at = 0;
  let start = Math.max(0, at - BEFORE);
  let end = Math.min(text.length, at + AFTER);
  if (start > 0) {
    const space = text.indexOf(' ', start);
    start = space !== -1 && space < at ? space + 1 : start;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    end = space > at ? space : end;
  }
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

function countOccurrences(haystack: string, needle: string): number {
  let n = 0;
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) n++;
  return n;
}

/**
 * Finds paragraphs containing every term (a term may instead appear in the section title,
 * so "battle traitor" finds the Traitors paragraphs in the Battles chapter). Section titles
 * that match on their own come first, then paragraphs containing the exact phrase, then the
 * rest; ties keep document order.
 */
export function searchRules(docs: RulesDoc[], query: string, limit = 60): SearchHit[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [];
  const phrase = normalise(query.trim());
  const hits: (SearchHit & { order: number })[] = [];
  let order = 0;

  for (const doc of docs) {
    const title = normalise(doc.title);
    if (terms.every((t) => title.includes(t))) {
      hits.push({ sectionId: doc.id, sectionTitle: doc.title, unit: -1, snippet: '', score: 1000, order: order++ });
    }
    splitUnits(doc.body).forEach((unit, i) => {
      const text = plainText(unit);
      const lower = normalise(text);
      const inUnit = terms.filter((t) => lower.includes(t));
      if (inUnit.length === 0) return;
      if (!terms.every((t) => lower.includes(t) || title.includes(t))) return;
      let score = inUnit.length * 10 + terms.reduce((n, t) => n + Math.min(countOccurrences(lower, t), 3), 0);
      if (terms.length > 1 && lower.includes(phrase)) score += 100;
      hits.push({
        sectionId: doc.id,
        sectionTitle: doc.title,
        unit: i,
        snippet: snippetAround(text, inUnit),
        score,
        order: order++,
      });
    });
  }

  return hits
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map(({ order: _order, ...hit }) => hit);
}

/** Splits text into parts, flagging the parts that match a search term (for <mark>). */
export function highlightParts(text: string, terms: string[]): { text: string; match: boolean }[] {
  if (terms.length === 0) return [{ text, match: false }];
  const escaped = [...terms].sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = escaped.map((t) => t.replace(/'/g, "['’]")).join('|');
  // split() with a capture group puts the matches at the odd indexes.
  return text
    .split(new RegExp(`(${pattern})`, 'i'))
    .map((p, i) => ({ text: p, match: i % 2 === 1 }))
    .filter((p) => p.text !== '');
}

export interface DiffPart {
  type: 'same' | 'added' | 'removed';
  text: string;
}

/** Word-level diff (longest common subsequence), merging runs of the same type. */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = before.split(/(\s+)/).filter((t) => t !== '');
  const b = after.split(/(\s+)/).filter((t) => t !== '');
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = LCS length of a[i..] and b[j..], stored row by row.
  const lcs = new Uint32Array((n + 1) * (m + 1));
  const at = (i: number, j: number) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[at(i, j)] = a[i] === b[j] ? lcs[at(i + 1, j + 1)] + 1 : Math.max(lcs[at(i + 1, j)], lcs[at(i, j + 1)]);
    }
  }
  const parts: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('same', a[i]);
      i++;
      j++;
    } else if (lcs[at(i + 1, j)] >= lcs[at(i, j + 1)]) {
      push('removed', a[i++]);
    } else {
      push('added', b[j++]);
    }
  }
  while (i < n) push('removed', a[i++]);
  while (j < m) push('added', b[j++]);
  return parts;
}
