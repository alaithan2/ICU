/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Per-consultant colour identity, shared across the schedule views so the same
// consultant always shows the same colour. Colours are assigned by the
// consultant's position in the list, giving each a distinct hue (wrapping only
// after the palette is exhausted).

export interface ConsultantColor {
  /** Filled avatar circle: solid background + white text. */
  solid: string;
  /** Tinted pill/label: soft background + coloured text + border. */
  soft: string;
}

// Full, literal class strings so Tailwind can detect and generate them.
const PALETTE: ConsultantColor[] = [
  { solid: 'bg-blue-500 text-white',    soft: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  { solid: 'bg-emerald-500 text-white', soft: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  { solid: 'bg-violet-500 text-white',  soft: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30' },
  { solid: 'bg-amber-500 text-white',   soft: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  { solid: 'bg-rose-500 text-white',    soft: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' },
  { solid: 'bg-cyan-500 text-white',    soft: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30' },
  { solid: 'bg-indigo-500 text-white',  soft: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' },
  { solid: 'bg-teal-500 text-white',    soft: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30' },
  { solid: 'bg-fuchsia-500 text-white', soft: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30' },
  { solid: 'bg-lime-600 text-white',    soft: 'bg-lime-600/15 text-lime-700 dark:text-lime-300 border-lime-600/30' },
  { solid: 'bg-orange-500 text-white',  soft: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  { solid: 'bg-sky-500 text-white',     soft: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
];

// Fallback for unassigned / unknown consultants.
const NEUTRAL: ConsultantColor = {
  solid: 'bg-outline text-white',
  soft: 'bg-outline-variant/20 text-outline border-outline-variant/30',
};

/** Resolve a consultant's colour by their index in the consultants list. */
export function getConsultantColor(
  consultants: { id: string }[],
  id?: string | null
): ConsultantColor {
  if (!id) return NEUTRAL;
  const index = consultants.findIndex(c => c.id === id);
  if (index === -1) return NEUTRAL;
  return PALETTE[index % PALETTE.length];
}

/** Uppercase initials from a name, e.g. "Dr. Sarah Jenkins" -> "SJ". */
export function getInitials(name: string): string {
  const cleaned = name.replace(/^dr\.?\s*/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
