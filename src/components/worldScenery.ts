/** Static scenery shares World's instanced cube batch: extra detail adds no
 * draw calls. Coordinates and colours are deterministic across room clients. */
type Voxel = (
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: number,
) => void;

const C = {
  porcelain: 0xf6f8fa,
  chalk: 0xe8eef2,
  stone: 0xb8c7d6,
  shadow: 0x879caf,
  ink: 0x26394c,
  red: 0xff4027,
  coral: 0xff8770,
  cyan: 0x00c8e6,
  paleCyan: 0xbceef2,
  blue: 0x245bff,
  lime: 0xb8df78,
  green: 0x74bd8a,
  leaf: 0x459e82,
  yellow: 0xffd45f,
  soil: 0xd8c7b0,
};

const noise = (x: number, z: number, salt = 0) => {
  const n = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

export function buildWorldScenery(
  stageIndex: number,
  voxel: Voxel,
  includeDistricts = true,
): void {
  const chapter = Math.max(0, Math.min(3, stageIndex));
  const accent = [C.green, C.yellow, C.cyan, C.red][chapter];

  // Exposed stepped strata give the plaza a real floating-island silhouette.
  for (let layer = 0; layer < 5; layer++) {
    const radius = 10 - layer * 1.4;
    for (let x = -7; x <= 7; x++) {
      for (let z = -7; z <= 7; z++) {
        if (Math.abs(x) + Math.abs(z) > radius + noise(x, z, layer) * 1.2)
          continue;
        // Keep the hidden interior empty; only the exposed shell needs blocks.
        if (
          layer < 4 &&
          Math.abs(x) + Math.abs(z) < radius - 2.1 &&
          Math.abs(x) < 6 - layer &&
          Math.abs(z) < 6 - layer
        )
          continue;
        const shade = noise(x, z, layer + 11);
        voxel(
          x,
          -0.8 - layer * 0.57,
          z,
          0.99,
          0.58,
          0.99,
          shade > 0.84 ? C.paleCyan : shade > 0.45 ? C.stone : C.shadow,
        );
        if (shade > 0.92)
          voxel(x, -0.8 - layer * 0.57, z + 0.502, 0.6, 0.08, 0.02, C.cyan);
      }
    }
  }
  // Square circuit cables cascade through the exposed foundations.
  [-5, -2, 2, 5].forEach((x, i) => {
    const z = i % 2 ? 5 : 6;
    voxel(x, -1.02, z, 0.15, 1.55, 0.15, i % 2 ? C.cyan : C.red);
    voxel(x + 0.45, -1.82, z, 1.05, 0.15, 0.15, i % 2 ? C.cyan : C.red);
    voxel(x + 0.9, -2.15, z, 0.15, 0.8, 0.15, i % 2 ? C.cyan : C.red);
    voxel(x + 0.9, -2.58, z, 0.32, 0.24, 0.32, C.ink);
  });
  for (let i = 0; i < 12; i++) {
    const x = -5.6 + i;
    const z = 3.8 + (i % 3) * 0.6;
    if (Math.abs(x) + z > 10) continue;
    voxel(
      x,
      -3.1 + (i % 3) * 0.24,
      z,
      0.25,
      0.65,
      0.25,
      i % 2 ? C.cyan : C.paleCyan,
    );
    voxel(x, -3.55 + (i % 3) * 0.24, z, 0.13, 0.27, 0.13, C.blue);
  }

  const planter = (x: number, z: number, size = 1) => {
    voxel(x, 0.14, z, size, 0.28, size, C.chalk);
    voxel(x, 0.29, z, size + 0.08, 0.1, size + 0.08, C.porcelain);
    voxel(x, 0.35, z, size - 0.15, 0.04, size - 0.15, C.soil);
  };
  const tree = (x: number, z: number, size = 1, variant = 0) => {
    planter(x, z, 1.05 * size);
    voxel(x, 0.93 * size, z, 0.24 * size, 1.2 * size, 0.24 * size, C.ink);
    const colors =
      chapter === 3 ? [C.coral, C.red, C.yellow] : [C.green, C.leaf, C.lime];
    for (let layer = 0; layer < 3; layer++) {
      const width = (layer === 1 ? 1.65 : 1.15) * size;
      voxel(
        x,
        (1.55 + layer * 0.38) * size,
        z,
        width,
        0.4 * size,
        width,
        colors[(layer + variant) % 3],
      );
    }
    voxel(
      x - 0.48 * size,
      1.63 * size,
      z + 0.46 * size,
      0.36 * size,
      0.4 * size,
      0.36 * size,
      C.lime,
    );
    voxel(
      x + 0.38 * size,
      2.43 * size,
      z - 0.18 * size,
      0.5 * size,
      0.25 * size,
      0.5 * size,
      colors[2],
    );
  };
  const lamp = (x: number, z: number, h = 1.4) => {
    voxel(x, 0.08, z, 0.38, 0.16, 0.38, C.ink);
    voxel(x, h / 2, z, 0.1, h, 0.1, C.stone);
    voxel(x, h, z, 0.36, 0.28, 0.36, C.yellow);
    voxel(x, h + 0.19, z, 0.48, 0.12, 0.48, C.ink);
  };
  const grass = (x: number, z: number, color = C.green) => {
    voxel(x, 0.14, z, 0.12, 0.28, 0.12, color);
    voxel(x + 0.14, 0.1, z, 0.12, 0.19, 0.12, C.lime);
  };
  // Keep all gameplay terminals and the central walking routes clear.
  tree(-6.35, 0.4, 0.84);
  tree(6.4, -0.3, 0.88, 1);
  tree(-4.55, -5.65, 0.72, 1);
  if (chapter === 0) tree(-5.8, 2.15, 0.62);
  [-1, 1].forEach((side) => {
    lamp(side * 3.1, 5.95, 1.05);
    lamp(side * 6.2, 0.75, 1.3);
    // Low benches sit along the foreground edge without hiding the terminals.
    voxel(side * 3.3, 0.43, 5.2, 1.15, 0.13, 0.4, C.soil);
    [-0.38, 0.38].forEach((dx) =>
      voxel(side * 3.3 + dx, 0.21, 5.2, 0.13, 0.4, 0.26, C.ink),
    );
    for (let i = 0; i < 8; i++) {
      const x = side * (4.8 + noise(i, side) * 1.3);
      const z = 3.5 + noise(side, i) * 1.6;
      if (Math.abs(x) + z < 10.5) grass(x, z);
    }
  });
  for (let i = 0; i < 12; i++) {
    const x = -5.4 + i * 0.96;
    if (Math.abs(x) > 2.7) {
      voxel(x, 0.1, 6.8 - Math.abs(x) * 0.25, 0.22, 0.2, 0.22, C.chalk);
      voxel(x, 0.23, 6.8 - Math.abs(x) * 0.25, 0.14, 0.07, 0.14, accent);
    }
  }

  if (!includeDistricts) return;

  const building = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    color: number,
    seed: number,
  ) => {
    voxel(x, y + h / 2, z, w, h, w, C.chalk);
    voxel(x, y + 0.12, z, w + 0.16, 0.24, w + 0.16, C.ink);
    voxel(x, y + h + 0.1, z, w + 0.22, 0.2, w + 0.22, color);
    voxel(x, y + h + 0.32, z, w * 0.68, 0.24, w * 0.68, C.porcelain);
    const rows = Math.floor(h / 0.4);
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < 3; column++) {
        const offset = (column - 1) * w * 0.26;
        const windowColor = noise(row, column, seed) > 0.3 ? color : C.ink;
        voxel(
          x + offset,
          y + 0.45 + row * 0.39,
          z + w / 2 + 0.01,
          w * 0.15,
          0.16,
          0.025,
          windowColor,
        );
        voxel(
          x + w / 2 + 0.01,
          y + 0.45 + row * 0.39,
          z + offset,
          0.025,
          0.16,
          w * 0.15,
          windowColor,
        );
      }
    }
    voxel(x, y + h + 0.7, z, 0.08, 0.65, 0.08, C.ink);
    voxel(x, y + h + 1.04, z, 0.22, 0.18, 0.22, C.red);
  };
  const island = (
    x: number,
    y: number,
    z: number,
    radius: number,
    seed: number,
  ) => {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > radius * 1.5) continue;
        voxel(
          x + dx,
          y - 0.17,
          z + dz,
          0.98,
          0.34,
          0.98,
          (dx + dz) % 3 ? C.porcelain : C.chalk,
        );
        if (Math.abs(dx) + Math.abs(dz) > radius * 1.5 - 1.1) {
          const depth = 0.5 + noise(dx, dz, seed) * 0.8;
          voxel(
            x + dx,
            y - 0.34 - depth / 2,
            z + dz,
            0.95,
            depth,
            0.95,
            C.stone,
          );
        }
      }
    }
    voxel(x, y - 1.2, z, radius, 1.1, radius, C.shadow);
    voxel(x, y - 1.94, z, radius * 0.6, 0.5, radius * 0.6, C.ink);
    voxel(x, y - 2.27, z, 0.35, 0.24, 0.35, C.cyan);
  };

  // Asymmetric neighbourhoods frame the central game instead of filling it.
  const districts = [
    { x: -10, y: 2, z: -4.5, r: 2 },
    { x: 9, y: 1, z: -7, r: 2 },
    { x: -5.5, y: 4, z: -10.5, r: 2 },
    { x: 4, y: 4.2, z: -11.5, r: 2 },
    { x: 10.5, y: 0.7, z: 1, r: 1 },
  ];
  districts.forEach(({ x, y, z, r }, i) => {
    island(x, y, z, r, i);
    const city = chapter === 1;
    building(
      x - 0.75,
      y,
      z - 0.6,
      city ? 1.45 : 1.15,
      city ? 3.7 + (i % 2) : 1.7 + (i % 3) * 0.6,
      i % 2 ? C.cyan : accent,
      i,
    );
    if (r > 1) {
      building(x + 0.9, y, z + 0.7, 0.9, city ? 2.8 : 1.1, C.cyan, i + 4);
      voxel(x - 0.2, y + 0.025, z + 1.8, 2.9, 0.05, 0.13, C.red);
      for (let j = 0; j < 4; j++) {
        voxel(
          x - 1.5 + j * 0.8,
          y + 0.08,
          z + 1.8,
          0.16,
          0.12,
          0.45,
          C.porcelain,
        );
      }
    }
    if (chapter === 0) {
      // A little rooftop orchard on the home-node neighbourhoods.
      voxel(x + 1.25, y + 0.5, z - 0.7, 0.16, 1, 0.16, C.ink);
      voxel(x + 1.25, y + 1.1, z - 0.7, 0.9, 0.7, 0.9, C.green);
      voxel(x + 1.25, y + 1.55, z - 0.7, 0.55, 0.25, 0.55, C.lime);
    }
    if (chapter === 2) {
      // Block solar arrays and a squared satellite dish for network relays.
      voxel(x + 1, y + 1.2, z - 0.6, 0.15, 2.4, 0.15, C.ink);
      for (let a = -1; a <= 1; a++)
        for (let b = 0; b < 2; b++)
          voxel(
            x + 1 + a * 0.4,
            y + 2.4 + b * 0.16,
            z - 0.6 + b * 0.5,
            0.35,
            0.12,
            0.44,
            (a + b) % 2 ? C.blue : C.cyan,
          );
    }
    if (chapter === 3) {
      for (let k = 0; k < 3; k++) {
        voxel(x + 1.2, y + 0.4 + k * 0.55, z - 0.6, 0.6, 0.4, 0.6, C.ink);
        voxel(x + 1.2, y + 0.4 + k * 0.55, z - 0.28, 0.4, 0.06, 0.04, C.red);
      }
    }
  });

  // Tiny voxel cloud banks give scale and depth without textured assets.
  [
    [-8, 9, -5],
    [7, 10, -6],
    [-4, 13, -2],
    [10, 6, 0],
  ].forEach(([x, y, z], i) => {
    for (let part = 0; part < 5; part++) {
      const h = 0.35 + noise(i, part) * 0.45;
      voxel(
        x + (part - 2) * 0.9,
        y + (part % 2) * 0.18,
        z,
        1.2,
        h,
        0.8 + (part % 3) * 0.35,
        C.porcelain,
      );
      voxel(
        x + (part - 2) * 0.9,
        y - h / 2 - 0.08,
        z,
        1.2,
        0.12,
        0.85,
        C.chalk,
      );
    }
  });
}
