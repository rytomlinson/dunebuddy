import { createUseStyles } from 'react-jss';
import { EXPANSIONS, FACTIONS, type FactionId } from 'common';
import type { Theme } from '../theme';
import { FactionEmblem } from './FactionEmblem';

const useStyles = createUseStyles((theme: Theme) => ({
  expansion: { marginTop: theme.spacing.sm },
  expansionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontWeight: 600,
    minHeight: 44,
    cursor: 'pointer',
    '& input': { width: 20, height: 20, accentColor: theme.colors.primary },
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 44,
    padding: '4px 14px 4px 6px',
    fontSize: theme.fontSizes.lg,
    borderRadius: 999,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.background,
    cursor: 'pointer',
    opacity: 0.5,
    '&[aria-pressed="true"]': { opacity: 1, borderColor: theme.colors.primary },
  },
}));

export const DEFAULT_EXPANSIONS = new Set<string>(['base', 'ixians-tleilaxu']);
export const DEFAULT_FACTIONS = FACTIONS.filter((f) => DEFAULT_EXPANSIONS.has(f.expansion)).map((f) => f.id);

/** Factions grouped by expansion, with a checkbox per expansion and a chip per faction. */
export function FactionPicker({
  selected,
  onChange,
}: {
  selected: Set<FactionId>;
  onChange: (next: Set<FactionId>) => void;
}) {
  const c = useStyles();

  const toggle = (id: FactionId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const toggleExpansion = (expansion: string, on: boolean) => {
    const next = new Set(selected);
    for (const f of FACTIONS) if (f.expansion === expansion) on ? next.add(f.id) : next.delete(f.id);
    onChange(next);
  };

  return (
    <>
      {EXPANSIONS.map((exp) => {
        const factions = FACTIONS.filter((f) => f.expansion === exp.id);
        const allOn = factions.every((f) => selected.has(f.id));
        return (
          <div key={exp.id} className={c.expansion}>
            <label className={c.expansionHead}>
              <input type="checkbox" checked={allOn} onChange={(e) => toggleExpansion(exp.id, e.target.checked)} />
              {exp.name}
            </label>
            <div className={c.chips}>
              {factions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={c.chip}
                  aria-pressed={selected.has(f.id)}
                  onClick={() => toggle(f.id)}
                >
                  <FactionEmblem faction={f.id} size={28} />
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Keeps the game's faction order regardless of tap order. */
export function orderedFactions(selected: Set<FactionId>): FactionId[] {
  return FACTIONS.map((f) => f.id).filter((id) => selected.has(id));
}
