import { useState } from 'react';
import { createUseStyles } from 'react-jss';
import { diffWords, type RuleEdit, type RuleSection } from 'common';
import { trpc } from '../trpc';
import type { Theme } from '../theme';
import { errorMessage, loadPlayerName, savePlayerName } from '../utils';
import { Sheet } from './Sheet';
import { Button, ErrorText, Muted } from './ui';

const useStyles = createUseStyles((theme: Theme) => ({
  form: { display: 'grid', gap: theme.spacing.md },
  label: {
    display: 'grid',
    gap: theme.spacing.xs,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    minHeight: 48,
    padding: `0 ${theme.spacing.sm}`,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    fontSize: 17,
    color: theme.colors.text,
    textTransform: 'none',
    letterSpacing: 'normal',
  },
  textarea: {
    width: '100%',
    minHeight: '40vh',
    padding: theme.spacing.sm,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    fontSize: 16,
    lineHeight: 1.5,
    color: theme.colors.text,
    fontFamily: 'inherit',
    textTransform: 'none',
    letterSpacing: 'normal',
    resize: 'vertical',
  },
  help: { color: theme.colors.textMuted, fontSize: theme.fontSizes.sm, textTransform: 'none', letterSpacing: 'normal' },
  actions: { display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', '& > *': { flex: '1 1 140px' } },
  diff: {
    whiteSpace: 'pre-wrap',
    lineHeight: 1.55,
    fontSize: theme.fontSizes.md,
    padding: theme.spacing.sm,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    maxHeight: '45vh',
    overflowY: 'auto',
  },
  added: { background: 'rgba(111, 179, 111, 0.28)', textDecoration: 'none', borderRadius: 2 },
  removed: { background: 'rgba(229, 83, 75, 0.25)', textDecoration: 'line-through', borderRadius: 2 },
  edit: { borderTop: `1px solid ${theme.colors.border}`, paddingTop: theme.spacing.md, marginTop: theme.spacing.md },
  who: { fontWeight: 600 },
  why: { margin: `${theme.spacing.xs} 0 ${theme.spacing.sm}`, fontStyle: 'italic', color: theme.colors.textSecondary },
}));

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Shows what an edit changed: green for added words, struck-through red for removed. */
export function DiffView({ before, after }: { before: string; after: string }) {
  const c = useStyles();
  return (
    <div className={c.diff}>
      {diffWords(before, after).map((p, i) =>
        p.type === 'added' ? (
          <ins key={i} className={c.added}>
            {p.text}
          </ins>
        ) : p.type === 'removed' ? (
          <del key={i} className={c.removed}>
            {p.text}
          </del>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </div>
  );
}

/** Edit a section. Every edit needs a name and an explanation, and is kept in the log. */
export function EditSheet({
  section,
  startText,
  onClose,
  onSaved,
}: {
  section: RuleSection;
  /** Text to start from, e.g. an older version being restored. Defaults to the current text. */
  startText?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const c = useStyles();
  const [body, setBody] = useState(startText ?? section.body);
  const [name, setName] = useState(loadPlayerName);
  const [explanation, setExplanation] = useState('');
  const edit = trpc.rules.edit.useMutation({
    onSuccess: () => {
      savePlayerName(name.trim());
      onSaved();
    },
  });
  const unchanged = body.trim() === section.body.trim();

  return (
    <Sheet title={`Edit: ${section.title}`} onClose={onClose}>
      <div className={c.form}>
        <label className={c.label}>
          Text
          <textarea className={c.textarea} value={body} onChange={(e) => setBody(e.target.value)} />
          <span className={c.help}>
            Blank line between paragraphs. **bold**, _italic_, “- ” for a bullet. Your edit is labelled with your
            name and the time, and the previous text is kept.
          </span>
        </label>
        <label className={c.label}>
          Your name
          <input className={c.input} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={c.label}>
          Why are you changing it?
          <input
            className={c.input}
            value={explanation}
            maxLength={500}
            placeholder="e.g. Added the 2021 FAQ ruling on Karama"
            onChange={(e) => setExplanation(e.target.value)}
          />
        </label>
        <ErrorText>{edit.error && errorMessage(edit.error)}</ErrorText>
        <div className={c.actions}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={edit.isPending || unchanged || !name.trim() || explanation.trim().length < 5}
            onClick={() =>
              edit.mutate({
                sectionId: section.id,
                body,
                editorName: name,
                explanation,
                baseEditCount: section.editCount,
              })
            }
          >
            {edit.isPending ? 'Saving…' : 'Save edit'}
          </Button>
        </div>
        {unchanged ? (
          <Muted>Change the text to save an edit.</Muted>
        ) : explanation.trim().length < 5 ? (
          <Muted>Add your name and a short explanation to save.</Muted>
        ) : null}
      </div>
    </Sheet>
  );
}

function EditEntry({ edit, onRestore }: { edit: RuleEdit; onRestore?: (text: string) => void }) {
  const c = useStyles();
  return (
    <div className={c.edit}>
      <div>
        <span className={c.who}>{edit.editorName}</span> · {formatWhen(edit.createdAt)}
      </div>
      <p className={c.why}>“{edit.explanation}”</p>
      <DiffView before={edit.bodyBefore} after={edit.bodyAfter} />
      {onRestore && (
        <div style={{ marginTop: 8 }}>
          <Button onClick={() => onRestore(edit.bodyBefore)}>Restore the text from before this edit</Button>
        </div>
      )}
    </div>
  );
}

/** Every edit to one section, newest first, with the original rulebook text at the bottom. */
export function HistorySheet({
  section,
  onClose,
  onRestore,
}: {
  section: RuleSection;
  onClose: () => void;
  onRestore: (text: string) => void;
}) {
  const c = useStyles();
  const history = trpc.rules.history.useQuery({ sectionId: section.id });
  return (
    <Sheet title={`History: ${section.title}`} onClose={onClose}>
      {history.isLoading && <Muted>Loading…</Muted>}
      <ErrorText>{history.error && errorMessage(history.error)}</ErrorText>
      {history.data && (
        <>
          <Muted>
            {history.data.edits.length} {history.data.edits.length === 1 ? 'edit' : 'edits'} since it was imported
            from the {section.source || 'rulebook'}.
          </Muted>
          {history.data.edits.map((e) => (
            <EditEntry key={e.id} edit={e} onRestore={onRestore} />
          ))}
          <details className={c.edit}>
            <summary>Original rulebook text</summary>
            <div style={{ marginTop: 8 }}>
              <DiffView before={history.data.original} after={history.data.original} />
            </div>
            <div style={{ marginTop: 8 }}>
              <Button onClick={() => onRestore(history.data.original)}>Restore the original text</Button>
            </div>
          </details>
        </>
      )}
    </Sheet>
  );
}

export { EditEntry };
