export const RULER_PALETTE = [
  '#00E5C3',
  '#FF3D8B',
  '#FFB020',
  '#9B7BFF',
  '#A8E63A',
] as const;

export function colorForIndex(i: number): string {
  const idx = ((i % RULER_PALETTE.length) + RULER_PALETTE.length) % RULER_PALETTE.length;
  return RULER_PALETTE[idx] as string;
}
