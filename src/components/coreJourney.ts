import * as THREE from "three";
import { SPHERE_CENTER } from "./networkSphere";
import {
  CAMPAIGN_LAYERS,
  getStagePosition,
  STAGE_COUNT,
} from "../lib/campaign";

const RADII = [10.8, 8.1, 5.4, 2.7];
const COLORS = {
  red: 0xff4027,
  coral: 0xffb39c,
  cyan: 0x00c8e6,
  blue: 0x245bff,
  gray: 0xcbd7df,
  ink: 0x223345,
  white: 0xf3f7fa,
  orange: 0xffb02e,
};

/** Fixed landmarks remain in the sphere as the playable platform moves inward. */
export function createCoreJourney() {
  const group = new THREE.Group();
  group.position.copy(SPHERE_CENTER);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const instances: THREE.InstancedMesh[] = [];
  const makeLines = (
    points: THREE.Vector3[],
    opacity: number,
    color = COLORS.gray,
  ) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(new Float32Array(points.length * 3), 3),
    );
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
    });
    const colors = geometry.getAttribute("color") as THREE.BufferAttribute;
    const shade = new THREE.Color(color);
    for (let i = 0; i < points.length; i++)
      colors.setXYZ(i, shade.r, shade.g, shade.b);
    geometries.push(geometry);
    materials.push(material);
    const lines = new THREE.LineSegments(geometry, material);
    group.add(lines);
    return { lines, colors };
  };

  const trackPoints: THREE.Vector3[] = [];
  const vaultPoints: THREE.Vector3[] = [];
  const trackLayers: number[] = [];
  const vaultLayers: number[] = [];
  RADII.forEach((radius, layer) => {
    for (let step = 0; step < 96; step++) {
      if (step % 4 >= 2) continue;
      for (const fraction of [step / 96, (step + 1) / 96]) {
        const angle = fraction * Math.PI * 2;
        trackPoints.push(
          new THREE.Vector3(
            Math.cos(angle) * radius,
            -0.055,
            Math.sin(angle) * radius,
          ),
        );
        trackLayers.push(layer);
      }
    }
    // Two sparse vaults give the rings a spherical interior without a wire cage.
    for (const longitude of [-Math.PI / 5, Math.PI / 3]) {
      for (let step = 0; step < 40; step++) {
        if (step % 4 >= 2) continue;
        for (const fraction of [step / 40, (step + 1) / 40]) {
          const angle = fraction * Math.PI;
          vaultPoints.push(
            new THREE.Vector3(
              Math.cos(angle) * radius * Math.cos(longitude),
              Math.sin(angle) * radius,
              Math.cos(angle) * radius * Math.sin(longitude),
            ),
          );
          vaultLayers.push(layer);
        }
      }
    }
  });
  const tracks = makeLines(trackPoints, 0.64);
  const vaults = makeLines(vaultPoints, 0.19);
  const routePoints: THREE.Vector3[] = [];
  for (let step = 0; step < STAGE_COUNT; step++) {
    const a = getStagePosition(step);
    const b =
      step === STAGE_COUNT - 1 ? SPHERE_CENTER : getStagePosition(step + 1);
    routePoints.push(
      new THREE.Vector3(a.x - SPHERE_CENTER.x, 0.055, a.z - SPHERE_CENTER.z),
      new THREE.Vector3(b.x - SPHERE_CENTER.x, 0.055, b.z - SPHERE_CENTER.z),
    );
  }
  const route = makeLines(routePoints, 0.9);

  const box = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(box);
  const voxelMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false,
  });
  materials.push(voxelMaterial);
  const transform = new THREE.Object3D();
  const markerBlocks: {
    position: THREE.Vector3;
    scale: THREE.Vector3;
    step: number;
    dark: boolean;
  }[] = [];
  for (let step = 0; step <= STAGE_COUNT; step++) {
    const point = step === STAGE_COUNT ? SPHERE_CENTER : getStagePosition(step);
    markerBlocks.push({
      position: new THREE.Vector3(
        point.x - SPHERE_CENTER.x,
        0.085,
        point.z - SPHERE_CENTER.z,
      ),
      scale: new THREE.Vector3(
        step % 3 === 0 ? 0.25 : 0.14,
        0.09,
        step % 3 === 0 ? 0.25 : 0.14,
      ),
      step,
      dark: false,
    });
  }
  RADII.forEach((radius, layer) => {
    for (const side of [-1, 1]) {
      markerBlocks.push(
        {
          position: new THREE.Vector3(side * 1.45, 0.1, radius),
          scale: new THREE.Vector3(0.32, 0.2, 0.32),
          step: CAMPAIGN_LAYERS[layer].start,
          dark: true,
        },
        {
          position: new THREE.Vector3(side * 1.45, 0.4, radius),
          scale: new THREE.Vector3(0.13, 0.5, 0.13),
          step: CAMPAIGN_LAYERS[layer].start,
          dark: true,
        },
        {
          position: new THREE.Vector3(side * 1.45, 0.69, radius),
          scale: new THREE.Vector3(0.24, 0.12, 0.24),
          step: CAMPAIGN_LAYERS[layer].start,
          dark: false,
        },
      );
    }
  });
  const markers = new THREE.InstancedMesh(
    box,
    voxelMaterial,
    markerBlocks.length,
  );
  instances.push(markers);
  markerBlocks.forEach((block, index) => {
    transform.position.copy(block.position);
    transform.scale.copy(block.scale);
    transform.updateMatrix();
    markers.setMatrixAt(index, transform.matrix);
    markers.setColorAt(index, new THREE.Color(COLORS.gray));
  });
  markers.instanceMatrix.needsUpdate = true;
  group.add(markers);

  const reactor = new THREE.Group();
  reactor.position.y = 1.2;
  group.add(reactor);
  const reactorBlocks: { x: number; y: number; z: number; color: number }[] =
    [];
  for (let x = -2; x <= 2; x++)
    for (let y = -2; y <= 2; y++)
      for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) + Math.abs(y) + Math.abs(z) > 4) continue;
        reactorBlocks.push({
          x,
          y,
          z,
          color: (x + y + z) % 4 === 0 ? COLORS.orange : COLORS.red,
        });
      }
  const reactorMesh = new THREE.InstancedMesh(
    box,
    voxelMaterial,
    reactorBlocks.length,
  );
  instances.push(reactorMesh);
  reactorBlocks.forEach((block, index) => {
    transform.position.set(block.x * 0.25, block.y * 0.25, block.z * 0.25);
    transform.scale.setScalar(0.23);
    transform.updateMatrix();
    reactorMesh.setMatrixAt(index, transform.matrix);
    reactorMesh.setColorAt(index, new THREE.Color(block.color));
  });
  reactorMesh.instanceMatrix.needsUpdate = true;
  reactor.add(reactorMesh);

  const pedestalMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.ink,
    toneMapped: false,
  });
  materials.push(pedestalMaterial);
  const pedestal = new THREE.Mesh(box, pedestalMaterial);
  pedestal.position.y = -0.1;
  pedestal.scale.set(1.55, 0.15, 1.55);
  group.add(pedestal);
  const orbitPoints: THREE.Vector3[] = [];
  for (let step = 0; step < 40; step++) {
    if (step % 4 >= 2) continue;
    for (const fraction of [step / 40, (step + 1) / 40]) {
      const angle = fraction * Math.PI * 2;
      orbitPoints.push(
        new THREE.Vector3(Math.cos(angle) * 1.25, 0.13, Math.sin(angle) * 1.25),
      );
    }
  }
  const orbit = makeLines(orbitPoints, 0.95, COLORS.red);

  const labels = ["01 / OUTER", "02 / MIDDLE", "03 / INNER", "04 / CORE"];
  const labelSprites: THREE.Sprite[] = [];
  labels.forEach((text, layer) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(4, 4, 248, 40);
    ctx.fillStyle = "#ff4027";
    ctx.fillText(text, 128, 25);
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    textures.push(texture);
    materials.push(material);
    const label = new THREE.Sprite(material);
    label.position.set(-RADII[layer] * 0.55, 0.3, RADII[layer] * 0.82);
    label.scale.set(2.4, 0.45, 1);
    group.add(label);
    labelSprites.push(label);
  });

  let previousProgress = -1;
  let previousStage = -1;
  let previousCompleted = false;
  const shade = new THREE.Color();
  const fillColors = (
    attribute: THREE.BufferAttribute,
    layerIds: number[],
    stage: number,
    complete: boolean,
  ) => {
    layerIds.forEach((layer, index) => {
      shade.setHex(
        complete || layer < stage
          ? COLORS.cyan
          : layer === stage
            ? COLORS.red
            : COLORS.gray,
      );
      attribute.setXYZ(index, shade.r, shade.g, shade.b);
    });
    attribute.needsUpdate = true;
  };
  return {
    group,
    update(
      progress: number,
      stageIndex: number,
      time: number,
      motion: number,
      completed: boolean,
      currentStage = 0,
    ) {
      const depth = Math.max(
        0,
        Math.min(STAGE_COUNT, (progress / 12) * STAGE_COUNT),
      );
      const stage = Math.max(0, Math.min(3, stageIndex));
      reactor.visible = currentStage < STAGE_COUNT - 1;
      labelSprites.forEach((label, layer) => {
        label.visible = stage < 3 && layer >= stage;
      });
      reactor.position.y =
        1.2 + Math.round(Math.sin(time * 1.4 * motion) * 3) * 0.025;
      reactor.rotation.y = time * 0.12 * motion;
      if (
        depth === previousProgress &&
        stage === previousStage &&
        completed === previousCompleted
      )
        return;
      previousProgress = depth;
      previousStage = stage;
      previousCompleted = completed;
      fillColors(tracks.colors, trackLayers, stage, completed);
      fillColors(vaults.colors, vaultLayers, stage, completed);
      markerBlocks.forEach((block, index) => {
        markers.setColorAt(
          index,
          shade.setHex(
            block.dark
              ? COLORS.ink
              : block.step < depth || completed
                ? COLORS.cyan
                : block.step === depth
                  ? COLORS.red
                  : COLORS.gray,
          ),
        );
      });
      if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
      for (let step = 0; step < STAGE_COUNT; step++) {
        shade.setHex(step < depth ? COLORS.cyan : COLORS.gray);
        for (let end = 0; end < 2; end++)
          route.colors.setXYZ(step * 2 + end, shade.r, shade.g, shade.b);
      }
      route.colors.needsUpdate = true;
      for (let index = 0; index < orbit.colors.count; index++) {
        shade.setHex(completed ? COLORS.cyan : COLORS.red);
        orbit.colors.setXYZ(index, shade.r, shade.g, shade.b);
      }
      orbit.colors.needsUpdate = true;
      reactorBlocks.forEach((block, index) =>
        reactorMesh.setColorAt(
          index,
          shade.setHex(completed ? COLORS.cyan : block.color),
        ),
      );
      if (reactorMesh.instanceColor)
        reactorMesh.instanceColor.needsUpdate = true;
    },
    dispose() {
      instances.forEach((mesh) => mesh.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    },
  };
}
