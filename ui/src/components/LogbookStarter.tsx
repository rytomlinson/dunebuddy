import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUseStyles } from 'react-jss';
import type { FactionId } from 'common';
import { trpc } from '../trpc';
import type { Theme } from '../theme';
import { errorMessage, loadLogbooks, rememberLogbook } from '../utils';
import { DEFAULT_FACTIONS, FactionPicker, orderedFactions } from './FactionPicker';
import { Button, Card, ErrorText, Muted } from './ui';

const useStyles = createUseStyles((theme: Theme) => ({
  form: { display: 'grid', gap: theme.spacing.md, marginTop: theme.spacing.md },
  label: {
    display: 'grid',
    gap: theme.spacing.xs,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    minHeight: 48,
    width: '100%',
    padding: `0 ${theme.spacing.sm}`,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    fontSize: 17,
    color: theme.colors.text,
  },
  check: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 44,
    '& input': { width: 20, height: 20, accentColor: theme.colors.primary },
  },
  list: { listStyle: 'none', display: 'grid', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  item: {
    display: 'block',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    textDecoration: 'none',
    color: theme.colors.text,
  },
}));

/**
 * Home-page card for the Atreides player: reopen a logbook from this device, or start one
 * without a faction draw.
 */
export function LogbookStarter() {
  const c = useStyles();
  const navigate = useNavigate();
  const [saved] = useState(loadLogbooks);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Atreides logbook');
  const [selected, setSelected] = useState<Set<FactionId>>(new Set(DEFAULT_FACTIONS));
  const [openingHands, setOpeningHands] = useState(true);
  const create = trpc.logbook.create.useMutation({
    onSuccess: ({ id }) => {
      rememberLogbook({ id, name, createdAt: new Date().toISOString() });
      navigate(`/log/${id}`);
    },
  });

  return (
    <Card title="Atreides card logbook">
      <Muted>
        Playing Atreides? Log every treachery card you see go to auction, and keep track of who holds what. Only you
        get the link.
      </Muted>

      {saved.length > 0 && (
        <ul className={c.list}>
          {saved.map((b) => (
            <li key={b.id}>
              <Link to={`/log/${b.id}`} className={c.item}>
                {b.name}
                <Muted>Started {new Date(b.createdAt).toLocaleDateString()}</Muted>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <div style={{ marginTop: 16 }}>
          <Button block onClick={() => setOpen(true)}>
            Start a logbook
          </Button>
        </div>
      ) : (
        <div className={c.form}>
          <label className={c.label}>
            Name
            <input className={c.input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </label>
          <div>
            <div className={c.label}>Factions in play ({selected.size})</div>
            <FactionPicker selected={selected} onChange={setSelected} />
          </div>
          <label className={c.check}>
            <input type="checkbox" checked={openingHands} onChange={(e) => setOpeningHands(e.target.checked)} />
            Start each hand with its unseen opening card (2 for Harkonnen)
          </label>
          <div>
            <Button
              variant="primary"
              block
              disabled={create.isPending || selected.size < 2 || !name.trim()}
              onClick={() => create.mutate({ name, factions: orderedFactions(selected), openingHands })}
            >
              {create.isPending ? 'Creating…' : 'Create logbook'}
            </Button>
            <ErrorText>{create.error && errorMessage(create.error)}</ErrorText>
          </div>
        </div>
      )}
    </Card>
  );
}
