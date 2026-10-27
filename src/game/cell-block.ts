/** Keep the original opening coordinates stable for checkpoints and the cinematic. */
export const CELL_BLOCK = {
  west: -69.25,
  east: -3.1,
  north: -11.5,
  northFront: -2,
  southFront: 5,
  south: 14.5,
  height: 4.2,
} as const;
export interface CellRoom {
  number: number;
  side: "north" | "south";
  centerX: number;
  left: number;
  right: number;
  front: number;
  rear: number;
  doorX: number;
  medical: boolean;
}
const spans = [
  [-8.8, -3.1],
  [-14, -8.8],
  ...Array.from({ length: 10 }, (_, i) => [
    -19.75 - i * 5.5,
    i === 0 ? -14 : -14.25 - i * 5.5,
  ]),
];
export const CELL_ROOMS: CellRoom[] = spans.flatMap(([left, right], i) => {
  const centerX = i < 2 ? (left + right) / 2 : -17 - (i - 2) * 5.5;
  return (["north", "south"] as const).map((side) => ({
    number: side === "north" ? 47 - i : 48 + i,
    side,
    centerX,
    left,
    right,
    front: side === "north" ? CELL_BLOCK.northFront : CELL_BLOCK.southFront,
    rear: side === "north" ? CELL_BLOCK.north : CELL_BLOCK.south,
    doorX:
      side === "north" && i === 0
        ? -6
        : side === "north" && i === 1
          ? -11
          : side === "north"
            ? centerX - 0.55
            : centerX - 0.7,
    medical: side === "south" && i < 2,
  }));
});
/** The key story still controls Cells 42–47; added exploration cells have latches. */
export const isExplorationCell = (number: number) => number < 42 || number > 47;
/** Closed-cell evidence is approached from the corridor; open gates permit entry. */
export function cellApproachTarget(
  point: [number, number, number] | undefined,
  guard: [number, number, number],
  isOpen: (number: number) => boolean,
): [number, number, number] | undefined {
  if (!point) return point;
  const cell = CELL_ROOMS.find(
    (c) =>
      point[0] > c.left &&
      point[0] < c.right &&
      point[2] > Math.min(c.front, c.rear) &&
      point[2] < Math.max(c.front, c.rear),
  );
  if (!cell || isOpen(cell.number)) return point;
  const inside =
    guard[0] > cell.left &&
    guard[0] < cell.right &&
    guard[2] > Math.min(cell.front, cell.rear) &&
    guard[2] < Math.max(cell.front, cell.rear);
  if (inside) return point;
  return [
    Math.max(cell.left + 0.5, Math.min(cell.right - 0.5, point[0])),
    0,
    cell.front + (cell.side === "north" ? 0.5 : -0.5),
  ];
}
export const NAV_BOUNDS = {
  minX: -70,
  maxX: 30.5,
  minZ: -11,
  maxZ: 14.75,
} as const;
