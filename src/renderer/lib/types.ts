export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type End = 'a' | 'b';

export interface Ruler {
  id: string;
  colorIndex: number;
  a: Point;
  b: Point;
  /** Draw as an infinite guide line across the whole screen (for perspective / alignment while drawing). */
  extended: boolean;
}
