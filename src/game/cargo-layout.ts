import { ATRIUM } from "./atrium";
export const CARGO = [
  ...[-19, -29, -39, -49, -58].map((x, i) => ({
    asset: "CargoPallet" as const,
    x,
    y: ATRIUM.depth,
    z: ATRIUM.centerZ + (i % 2 ? 1.75 : -1.75),
    yaw: i % 2 ? 0.12 : -0.1,
  })),
  ...[-21, -31, -41, -51, -57].flatMap((x, i) => [
    {
      asset: "WoodBox" as const,
      x,
      y: ATRIUM.depth,
      z: ATRIUM.centerZ + (i % 2 ? -0.55 : 0.5),
      yaw: i * 0.23,
    },
    ...(i % 2 === 0
      ? [
          {
            asset: "WoodBox" as const,
            x: x + 0.04,
            y: ATRIUM.depth + 0.743205,
            z: ATRIUM.centerZ + 0.5,
            yaw: i * 0.23 + 0.14,
          },
        ]
      : []),
  ]),
];
