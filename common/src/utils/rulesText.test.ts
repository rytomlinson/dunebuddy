import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffWords, highlightParts, plainText, searchRules, searchTerms, snippetAround, splitUnits } from './rulesText.js';

const DOCS = [
  {
    id: 'turn-phases/phase-7-battles',
    title: 'Phase 7: Battles',
    body: '**Battle Determination.** Wherever two or more players’ forces occupy the same territory, battles must occur.\n\n- Players cannot battle in the Polar Sink.',
  },
  {
    id: 'turn-phases/phase-7-battles/traitors',
    title: 'Traitors',
    body: 'If your opponent uses a leader that matches a Traitor Card you hold, you may call out “Treachery!”.',
  },
  {
    id: 'cards/karama',
    title: 'Karama',
    body: '**Q: Can a Karama card stop an alliance ability?**\n\nYes. _(Official FAQ)_',
  },
];

test('splits bodies into units and strips markdown for search', () => {
  assert.equal(splitUnits(DOCS[0].body).length, 2);
  assert.equal(plainText('**Q: Can it?**'), 'Q: Can it?');
  assert.equal(plainText('Yes. _(Official FAQ)_'), 'Yes. (Official FAQ)');
  assert.equal(plainText('- Players cannot battle.'), 'Players cannot battle.');
  assert.equal(plainText('| A | B |\n|---|---|\n| c | d |'), 'A B c d');
});

test('terms ignore case and short words, and normalise apostrophes', () => {
  assert.deepEqual(searchTerms('Polar  SINK a'), ['polar', 'sink']);
  assert.deepEqual(searchTerms('player’s'), ["player's"]);
});

test('finds paragraphs with every term, title matches first', () => {
  const hits = searchRules(DOCS, 'karama');
  assert.equal(hits[0].unit, -1);
  assert.equal(hits[0].sectionId, 'cards/karama');
  assert.equal(hits[1].unit, 0);

  const polar = searchRules(DOCS, 'polar sink');
  assert.equal(polar.length, 1);
  assert.equal(polar[0].unit, 1);

  // A term can be satisfied by the section title.
  const traitor = searchRules(DOCS, 'traitors leader');
  assert.equal(traitor[0].sectionId, 'turn-phases/phase-7-battles/traitors');

  assert.deepEqual(searchRules(DOCS, 'sandworm'), []);
  assert.deepEqual(searchRules(DOCS, '  '), []);
});

test('snippets keep surrounding words', () => {
  const text = 'word '.repeat(40) + 'NEEDLE ' + 'tail '.repeat(40);
  const s = snippetAround(text, ['needle']);
  assert.ok(s.startsWith('…') && s.endsWith('…'));
  assert.ok(s.includes('NEEDLE'));
  assert.ok(s.length < 200);
  assert.equal(snippetAround('short text', ['short']), 'short text');
});

test('highlights terms in place, including curly apostrophes', () => {
  assert.deepEqual(highlightParts('The Polar Sink is safe', ['polar']), [
    { text: 'The ', match: false },
    { text: 'Polar', match: true },
    { text: ' Sink is safe', match: false },
  ]);
  assert.equal(highlightParts('players’ forces', ["players'"])[0].match, true);
});

test('word diff marks additions and removals', () => {
  assert.deepEqual(diffWords('pay 2 spice', 'pay 3 spice'), [
    { type: 'same', text: 'pay ' },
    { type: 'removed', text: '2' },
    { type: 'added', text: '3' },
    { type: 'same', text: ' spice' },
  ]);
  assert.deepEqual(diffWords('a', 'a'), [{ type: 'same', text: 'a' }]);
});
