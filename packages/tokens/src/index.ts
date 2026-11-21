/**
 * Nikl design tokens.
 *
 * Source of truth for colour, type and spacing, taken from the approved social prototype
 * (prototype/nikl-social.html). Rule: calm UI, mostly white/black, ONE accent (Nikl pink).
 * Colour in the product should come from organizers' real posters and photos; the soft
 * tints below are only for placeholders, avatars and category tags.
 */

export type ThemeName = 'light' | 'dark';
export type TintName = 'pink' | 'sun' | 'mint' | 'sky' | 'tang' | 'grape';

export interface Palette {
  /** Page background behind cards (web) */
  bg: string;
  /** App screen background */
  app: string;
  surface: string;
  surface2: string;
  ink: string;
  muted: string;
  hair: string;
  line: string;
  /** The single brand accent: primary buttons, unseen story rings, badges */
  accent: string;
  accentSoft: string;
  onAccent: string;
  like: string;
  good: string;
  warn: string;
  /** Text colour on top of a tint */
  onTint: string;
  tints: Record<TintName, string>;
}

export const palette: Record<ThemeName, Palette> = {
  light: {
    bg: '#ECECF1',
    app: '#FFFFFF',
    surface: '#FFFFFF',
    surface2: '#F2F2F5',
    ink: '#0E0F13',
    muted: '#6E717B',
    hair: '#EBEBF0',
    line: '#DCDCE3',
    accent: '#D81B60',
    accentSoft: '#FDE7EF',
    onAccent: '#FFFFFF',
    like: '#E0245E',
    good: '#15803D',
    warn: '#B45309',
    onTint: '#17181C',
    tints: { pink: '#F6E1E8', sun: '#F4EEDD', mint: '#DFEEE7', sky: '#E0E9F4', tang: '#F5E7DE', grape: '#E7E3F3' },
  },
  dark: {
    bg: '#050506',
    app: '#000000',
    surface: '#121214',
    surface2: '#1C1C20',
    ink: '#F5F5F7',
    muted: '#9B9CA5',
    hair: '#1F1F23',
    line: '#2D2D33',
    accent: '#E91E63',
    accentSoft: '#3A1222',
    onAccent: '#FFFFFF',
    like: '#F0457A',
    good: '#4ADE80',
    warn: '#FBBF24',
    onTint: '#EDEDF0',
    tints: { pink: '#34262C', sun: '#322E22', mint: '#22302A', sky: '#232B36', tang: '#33291F', grape: '#2A2737' },
  },
};

export const fonts = {
  /** Wordmark only */
  brand: 'Bricolage Grotesque',
  /** Headings, event titles */
  display: 'Inter Tight',
  /** Everything else */
  body: 'Inter',
  /** Ticket codes, numbers that line up */
  mono: 'JetBrains Mono',
} as const;

export const fontSize = { xs: 11, sm: 12.5, md: 14, lg: 16, xl: 20, xxl: 24, display: 28 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

/** Minimum touch target (dp / px). Keep every tappable thing at least this big. */
export const touchTarget = 44;

/**
 * CSS custom properties for the web app, e.g. `--accent`, `--surface-2`, `--tint-sky`.
 * Use with `:root { ... }` for light and a `prefers-color-scheme: dark` block for dark.
 */
export function toCssVariables(p: Palette): Record<string, string> {
  const vars: Record<string, string> = {
    '--bg': p.bg,
    '--app': p.app,
    '--surface': p.surface,
    '--surface-2': p.surface2,
    '--ink': p.ink,
    '--muted': p.muted,
    '--hair': p.hair,
    '--line': p.line,
    '--accent': p.accent,
    '--accent-soft': p.accentSoft,
    '--on-accent': p.onAccent,
    '--like': p.like,
    '--good': p.good,
    '--warn': p.warn,
    '--on-tint': p.onTint,
  };
  for (const [name, value] of Object.entries(p.tints)) vars[`--tint-${name}`] = value;
  return vars;
}

/** Serialises a variables object into a CSS declaration block body. */
export function cssBlock(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
}
