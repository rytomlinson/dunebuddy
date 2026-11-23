import { useState, type ReactElement } from 'react';
import { getFaction } from 'common';

/**
 * Original, simple emblems for each faction (not the game's artwork).
 * To use your own art, drop an image at ui/public/factions/<faction-id>.png
 * and it will be shown instead.
 */
const GLYPHS: Record<string, (accent: string) => ReactElement> = {
  // Hawk in flight
  atreides: (c) => (
    <path
      d="M12 34 L32 22 L52 34 L44 32 L38 38 L32 30 L26 38 L20 32 Z M32 22 L32 46"
      fill={c}
      stroke={c}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  // Three spikes
  harkonnen: (c) => (
    <g fill={c}>
      <path d="M20 46 L24 18 L28 46 Z" />
      <path d="M28 48 L32 14 L36 48 Z" />
      <path d="M36 46 L40 18 L44 46 Z" />
    </g>
  ),
  // Crown
  emperor: (c) => (
    <path d="M16 42 L18 22 L26 32 L32 18 L38 32 L46 22 L48 42 Z M16 46 H48" fill={c} stroke={c} strokeWidth="3" />
  ),
  // Orbit around a point
  'spacing-guild': (c) => (
    <g fill="none" stroke={c} strokeWidth="3">
      <ellipse cx="32" cy="32" rx="18" ry="8" transform="rotate(-25 32 32)" />
      <circle cx="32" cy="32" r="5" fill={c} />
    </g>
  ),
  // Dunes under a sun
  fremen: (c) => (
    <g fill={c}>
      <circle cx="40" cy="22" r="6" />
      <path d="M10 44 Q22 30 34 44 Q44 34 54 44 Z" />
    </g>
  ),
  // Watchful eye
  'bene-gesserit': (c) => (
    <g>
      <path d="M12 32 Q32 14 52 32 Q32 50 12 32 Z" fill="none" stroke={c} strokeWidth="3" />
      <circle cx="32" cy="32" r="6" fill={c} />
    </g>
  ),
  // Gear
  ixians: (c) => (
    <g fill={c}>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="29" y="12" width="6" height="10" rx="1" transform={`rotate(${i * 45} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="12" />
      <circle cx="32" cy="32" r="5" fill="currentColor" />
    </g>
  ),
  // Twisted strands
  tleilaxu: (c) => (
    <g fill="none" stroke={c} strokeWidth="3" strokeLinecap="round">
      <path d="M24 14 C40 22 24 30 40 38 C24 46 40 50 32 52" />
      <path d="M40 14 C24 22 40 30 24 38 C40 46 24 50 32 52" />
    </g>
  ),
  // Diamond-cut coin
  choam: (c) => (
    <g>
      <circle cx="32" cy="32" r="16" fill="none" stroke={c} strokeWidth="3" />
      <path d="M32 20 L42 32 L32 44 L22 32 Z" fill={c} />
    </g>
  ),
  // Hexagonal lens
  richese: (c) => (
    <g fill="none" stroke={c} strokeWidth="3">
      <path d="M32 14 L48 23 L48 41 L32 50 L16 41 L16 23 Z" />
      <circle cx="32" cy="32" r="7" fill={c} />
    </g>
  ),
};

interface Props {
  faction: string;
  size?: number;
}

export function FactionEmblem({ faction, size = 56 }: Props) {
  const [useCustom, setUseCustom] = useState(true);
  const f = getFaction(faction);
  if (!f) return null;

  if (useCustom) {
    return (
      <img
        src={`/factions/${f.id}.png`}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        onError={() => setUseCustom(false)}
      />
    );
  }

  const glyph = GLYPHS[f.id];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ display: 'block', color: f.color }}
    >
      <circle cx="32" cy="32" r="31" fill={f.color} stroke={f.accent} strokeOpacity="0.5" strokeWidth="2" />
      {glyph?.(f.accent)}
    </svg>
  );
}
