import { Link } from 'react-router-dom';
import { createUseStyles } from 'react-jss';
import { trpc } from '../trpc';
import type { Theme } from '../theme';
import { DiffView, formatWhen } from '../components/RuleSheets';
import { Card, ErrorText, Muted, Page } from '../components/ui';
import { errorMessage, loadRulesPasscode } from '../utils';

const useStyles = createUseStyles((theme: Theme) => ({
  list: { listStyle: 'none', display: 'grid', gap: theme.spacing.md },
  item: { paddingBottom: theme.spacing.md, borderBottom: `1px solid ${theme.colors.border}` },
  section: { fontWeight: 700, fontSize: theme.fontSizes.lg },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSizes.md, marginTop: 2 },
  why: { margin: `${theme.spacing.xs} 0`, fontStyle: 'italic', color: theme.colors.textSecondary },
  details: { '& summary': { cursor: 'pointer', color: theme.colors.primary, minHeight: 32 } },
}));

/** Every edit to the rules, newest first. */
export function RulesLogPage() {
  const c = useStyles();
  const hasPasscode = Boolean(loadRulesPasscode());
  const edits = trpc.rules.edits.useQuery(undefined, { enabled: hasPasscode, retry: false });

  return (
    <Page>
      <p style={{ marginBottom: 12 }}>
        <Link to="/rules">‹ Back to the rules</Link>
      </p>
      <Card title="Rules edit log">
        <Muted>
          Every change anyone has made to the rulebook text, newest first. The original rulebook text is always kept.
        </Muted>
        {!hasPasscode && (
          <ErrorText>
            Unlock the <Link to="/rules">rules</Link> with the group passcode first.
          </ErrorText>
        )}
        {edits.isLoading && hasPasscode && <Muted>Loading…</Muted>}
        <ErrorText>{edits.error && errorMessage(edits.error)}</ErrorText>
        {edits.data?.length === 0 && <Muted>No edits yet.</Muted>}
        <ul className={c.list} style={{ marginTop: 16 }}>
          {edits.data?.map((e) => (
            <li key={e.id} className={c.item}>
              <Link to={`/rules#${e.sectionId}`} className={c.section}>
                {e.sectionTitle}
              </Link>
              <div className={c.meta}>
                {e.editorName} · {formatWhen(e.createdAt)}
              </div>
              <p className={c.why}>“{e.explanation}”</p>
              <details className={c.details}>
                <summary>Show changes</summary>
                <DiffView before={e.bodyBefore} after={e.bodyAfter} />
              </details>
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}
