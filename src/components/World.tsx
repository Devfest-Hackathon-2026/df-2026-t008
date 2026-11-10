import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { WorldProps } from "../types";
import { buildWorldScenery } from "./worldScenery";
import { createNetworkSphere, SPHERE_CENTER } from "./networkSphere";
import { createCoreJourney } from "./coreJourney";
import { createStageRings } from "./stageRings";
import { getStagePosition, layerForStage, STAGE_COUNT } from "../lib/campaign";

// A locally generated voxel diorama. Flat light and nearest-neighbour pixels
// keep the network's original arcade character even as the world gains depth.
const COLORS = {
  white: 0xffffff,
  black: 0x17202e,
  red: 0xff4027,
  orange: 0xff8a00,
  blue: 0x245bff,
  cyan: 0x00c8e6,
  yellow: 0xffd600,
  green: 0x8de000,
  purple: 0xa444ff,
  gray: 0xe2e8ed,
};
const TERMINALS = [
  new THREE.Vector3(-4, 0, 2.8),
  new THREE.Vector3(4, 0, 2.4),
  new THREE.Vector3(-3, 0, -3.3),
];
const PALETTE = [
  COLORS.orange,
  COLORS.blue,
  COLORS.cyan,
  COLORS.yellow,
  COLORS.green,
  COLORS.purple,
  COLORS.red,
];

export default function World(props: WorldProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const resetRef = useRef<(() => void) | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  latest.current = props;

  useEffect(() => {
    if (!unavailable || props.phase !== "entering") return;
    const timer = window.setTimeout(() => latest.current.onEntered(), 0);
    return () => window.clearTimeout(timer);
  }, [unavailable, props.phase]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.cssText =
      "display:block;width:100%;height:100%;touch-action:none;outline:none;image-rendering:pixelated";
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      "球の外縁から中心核へ進むピクセルの仮想世界。3つの端末の問題を解くたびに足場が内側へ進みます。ドラッグで視点変更WASDで移動。",
    );
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 65, 110);
    scene.add(new THREE.HemisphereLight(0xe9f7ff, 0x687291, 2.2));
    const sunlight = new THREE.DirectionalLight(0xfff2dc, 2.5);
    sunlight.position.set(-10, 20, 12);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.camera.left = -12;
    sunlight.shadow.camera.right = 12;
    sunlight.shadow.camera.top = 12;
    sunlight.shadow.camera.bottom = -12;
    sunlight.shadow.camera.far = 50;
    sunlight.shadow.normalBias = 0.05;
    sunlight.shadow.bias = -0.0003;
    scene.add(sunlight);
    const stageScale = 0.38;
    const stageRoot = new THREE.Group();
    stageRoot.scale.setScalar(stageScale);
    const initialStagePosition = getStagePosition(
      props.stageIndex,
      props.stageProgress,
    );
    stageRoot.position.set(
      initialStagePosition.x,
      initialStagePosition.y,
      initialStagePosition.z,
    );
    stageRoot.rotation.y = Math.atan2(
      stageRoot.position.x - SPHERE_CENTER.x,
      stageRoot.position.z - SPHERE_CENTER.z,
    );
    scene.add(stageRoot, sunlight.target);
    const coreJourney = createCoreJourney();
    scene.add(coreJourney.group);
    const insideOffset = new THREE.Vector3(2.8, 8.8, 11.3).multiplyScalar(
      stageScale,
    );
    const targetOffset = new THREE.Vector3(0, 1.1, -0.8).multiplyScalar(
      stageScale,
    );
    const outsidePosition = new THREE.Vector3(10, 40, 25);
    const rotationAxis = new THREE.Vector3(0, 1, 0);
    const insidePosition = insideOffset
      .clone()
      .applyAxisAngle(rotationAxis, stageRoot.rotation.y)
      .add(stageRoot.position);
    const outsideTarget = new THREE.Vector3(0, 2, -1);
    const insideTarget = targetOffset
      .clone()
      .applyAxisAngle(rotationAxis, stageRoot.rotation.y)
      .add(stageRoot.position);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.08, 160);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 5;
    controls.maxPolarAngle = Math.PI / 2.25;
    const setPose = (playing: boolean) => {
      controls.enableDamping = false;
      controls.minDistance = playing ? 7 * stageScale : 39;
      controls.maxDistance = playing ? 16 * stageScale : 65;
      camera.position.copy(playing ? insidePosition : outsidePosition);
      controls.target.copy(playing ? insideTarget : outsideTarget);
      camera.fov = playing ? 54 : 45;
      camera.updateProjectionMatrix();
      controls.update();
      controls.enableDamping = true;
    };
    setPose(props.phase === "playing");
    resetRef.current = () => {
      if (latest.current.phase !== "entering")
        setPose(latest.current.phase === "playing");
    };

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const geometries = new Set<THREE.BufferGeometry>([geometry]);
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const instances = new Set<THREE.InstancedMesh>();
    const materialCache = new Map<number, THREE.MeshLambertMaterial>();
    const mat = (color: number) => {
      let m = materialCache.get(color);
      if (!m) {
        m = new THREE.MeshLambertMaterial({ color });
        materialCache.set(color, m);
        materials.add(m);
      }
      return m;
    };
    const glowCache = new Map<number, THREE.MeshBasicMaterial>();
    const glow = (color: number) => {
      let m = glowCache.get(color);
      if (!m) {
        m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
        glowCache.set(color, m);
        materials.add(m);
      }
      return m;
    };
    const cube = (
      w: number,
      h: number,
      d: number,
      color: number,
      parent: THREE.Object3D = stageRoot,
    ): THREE.Mesh<THREE.BoxGeometry, THREE.Material> => {
      const mesh = new THREE.Mesh(geometry, mat(color));
      mesh.scale.set(w, h, d);
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const staticBlocks: {
      x: number;
      y: number;
      z: number;
      w: number;
      h: number;
      d: number;
      color: number;
    }[] = [];
    const voxel = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: number,
    ) => staticBlocks.push({ x, y, z, w, h, d, color });
    const label = (
      text: string,
      color: string = "#ff4027",
      size = 0.7,
      width = 256,
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.font = "bold 28px monospace";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, width / 2, 33);
      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      textures.add(texture);
      const m = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      });
      materials.add(m);
      const sprite = new THREE.Sprite(m);
      sprite.scale.set((size * width) / 64, size, 1);
      return sprite;
    };
    const outline = (
      w: number,
      h: number,
      d: number,
      color: number,
      parent: THREE.Object3D = stageRoot,
    ) => {
      const box = new THREE.BoxGeometry(w, h, d);
      const edges = new THREE.EdgesGeometry(box);
      box.dispose();
      geometries.add(edges);
      const lm = new THREE.LineBasicMaterial({ color });
      materials.add(lm);
      const o = new THREE.LineSegments(edges, lm);
      parent.add(o);
      return o;
    };
    const steppedRing = (
      radius: number,
      thickness: number,
      color: number,
      parent: THREE.Object3D = stageRoot,
      segments = 96,
    ) => {
      const group = new THREE.Group();
      parent.add(group);
      const points: [number, number][] = [];
      let previous = "";
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const x = Math.round(Math.cos(a) * radius * 3) / 3;
        const y = Math.round(Math.sin(a) * radius * 3) / 3;
        const key = `${x}:${y}`;
        if (key === previous) continue;
        previous = key;
        points.push([x, y]);
      }
      const ringMesh = new THREE.InstancedMesh(
        geometry,
        glow(color),
        points.length,
      );
      instances.add(ringMesh);
      group.add(ringMesh);
      const node = new THREE.Object3D();
      points.forEach(([x, y], i) => {
        node.position.set(x, y, 0);
        node.scale.setScalar(thickness);
        node.updateMatrix();
        ringMesh.setMatrixAt(i, node.matrix);
      });
      ringMesh.instanceMatrix.needsUpdate = true;
      return group;
    };

    // A server plaza assembled from discrete blocks, rather than a polished disc.
    for (let x = -7; x <= 7; x++)
      for (let z = -7; z <= 7; z++) {
        if (Math.abs(x) + Math.abs(z) > 11) continue;
        const edge = Math.abs(x) + Math.abs(z) >= 10;
        const h = edge ? 0.52 : 0.34;
        voxel(
          x,
          -h / 2,
          z,
          0.96,
          h,
          0.96,
          edge ? 0xf1f3f6 : (x + z) % 2 === 0 ? 0xffffff : 0xf3f6f8,
        );
        if (edge)
          voxel(
            x,
            -h - 0.08,
            z,
            0.96,
            0.13,
            0.96,
            (x + z) % 3 === 0 ? COLORS.red : 0xbfcbd8,
          );
        if ((x === 0 || z === 0) && Math.abs(x) + Math.abs(z) > 2)
          voxel(x, 0.018, z, 0.13, 0.025, 0.88, COLORS.red);
        if (z === -7 && x % 2 === 0)
          voxel(x, 0.035, z, 0.82, 0.04, 0.13, COLORS.red);
      }
    // The playable island and its neighbouring districts share one enclosing globe.
    const networkSphere = createNetworkSphere();
    scene.add(networkSphere.group);

    // Pixel server stacks: primary colours, explicit steps, no glossy lighting.
    for (let i = 0; i < 12; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (5 + (i % 3) * 0.55),
        z = -5 + (Math.floor(i / 2) % 6) * 1.5;
      const h = 1.1 + (i % 4) * 0.55;
      voxel(x, h / 2, z, 0.6, h, 0.65, 0xffffff);
      voxel(x - 0.02, h + 0.08, z, 0.8, 0.18, 0.8, PALETTE[i % PALETTE.length]);
      voxel(x, 0.15, z, 0.8, 0.3, 0.8, COLORS.black);
      for (let k = 0; k < Math.floor(h / 0.3); k++)
        voxel(
          x - 0.01,
          0.4 + k * 0.3,
          z + 0.34,
          0.44,
          0.07,
          0.03,
          i % 2 === 0 ? COLORS.cyan : COLORS.blue,
        );
      if (i % 3 === 0) {
        voxel(x, h + 0.42, z, 0.09, 0.6, 0.09, COLORS.red);
        voxel(x, h + 0.75, z, 0.22, 0.22, 0.22, COLORS.red);
      }
    }

    buildWorldScenery(0, voxel, false);

    // An original block guardian: the intrusion is a face made of broken data.
    const core = new THREE.Group();
    core.scale.setScalar(stageScale);
    core.position
      .copy(SPHERE_CENTER)
      .add(new THREE.Vector3(0, 3.1 * stageScale, -0.5 * stageScale));
    scene.add(core);
    const coreBlocks: THREE.Mesh[] = [];
    for (let x = -2; x <= 2; x++)
      for (let y = -2; y <= 2; y++)
        for (let z = -1; z <= 1; z++) {
          if (Math.abs(x) === 2 && Math.abs(y) === 2) continue;
          const b = cube(
            0.47,
            0.47,
            0.47,
            (x + y + z) % 4 === 0 ? COLORS.orange : COLORS.red,
            core,
          );
          b.position.set(x * 0.49, y * 0.49, z * 0.49);
          b.castShadow = true;
          coreBlocks.push(b);
        }
    // Eyes and a broken mouth sit on both visible faces.
    [-0.49, 0.49].forEach((x) => {
      cube(0.38, 0.36, 0.07, COLORS.white, core).position.set(x, 0.32, 0.77);
      cube(0.15, 0.17, 0.09, COLORS.black, core).position.set(x, 0.28, 0.82);
    });
    for (let i = 0; i < 3; i++)
      cube(0.26, 0.14, 0.09, COLORS.black, core).position.set(
        (i - 1) * 0.28,
        -0.48,
        0.82,
      );
    const horns = [
      cube(0.4, 0.7, 0.42, COLORS.red, core),
      cube(0.4, 0.7, 0.42, COLORS.red, core),
    ];
    horns[0].position.set(-1.1, 1.2, 0);
    horns[1].position.set(1.1, 1.2, 0);
    const coreOrbit = steppedRing(2.05, 0.11, COLORS.orange, core, 100);
    coreOrbit.rotation.x = 0.65;
    coreOrbit.rotation.y = 0.45;
    const coreOrbit2 = steppedRing(2.5, 0.07, COLORS.red, core, 125);
    coreOrbit2.rotation.x = -0.7;
    coreOrbit2.rotation.y = 1;
    const faultLabel = label("! SIGNAL LOST !", "#ff4027", 0.48, 256);
    faultLabel.position.set(0, 2.3, 0);
    core.add(faultLabel);
    const coreFloor = cube(2.6, 0.22, 2.6, COLORS.black);
    coreFloor.position.set(0, 0.11, -0.5);
    const coreSocket = cube(2.2, 0.05, 2.2, COLORS.red);
    coreSocket.position.set(0, 0.25, -0.5);
    // A stepped reactor plinth and four independent scanning columns.
    for (let i = 0; i < 3; i++) {
      const base = cube(
        3.3 - i * 0.25,
        0.08,
        3.3 - i * 0.25,
        i % 2 ? COLORS.black : 0xcbd9e7,
      );
      base.position.set(0, 0.04 + i * 0.08, -0.5);
    }
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.red,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    materials.add(beamMaterial);
    const reactorBeams = new THREE.Group();
    stageRoot.add(reactorBeams);
    for (const x of [-1.48, 1.48])
      for (const z of [-1.98, 0.98]) {
        const pillar = cube(0.12, 0.45, 0.12, COLORS.black);
        pillar.position.set(x, 0.4, z);
        const beam = new THREE.Mesh(geometry, beamMaterial);
        beam.scale.set(0.045, 3.2, 0.045);
        beam.position.set(x, 2.2, z);
        reactorBeams.add(beam);
      }
    const sparkles: THREE.Mesh[] = [];
    for (let i = 0; i < 15; i++) {
      const b = cube(
        0.14,
        0.14,
        0.14,
        i % 2 === 0 ? COLORS.red : COLORS.orange,
        core,
      );
      b.position.set(
        Math.sin(i * 2.4) * 2.6,
        Math.cos(i * 1.3) * 1.8,
        Math.cos(i * 2.4) * 2,
      );
      sparkles.push(b);
    }

    // The exit gateway is a massive network frame with square lock segments.
    const gate = new THREE.Group();
    gate.position.set(1.5, 0, -6);
    stageRoot.add(gate);
    cube(0.38, 4.8, 0.5, COLORS.red, gate).position.set(-2, 2.4, 0);
    cube(0.38, 4.8, 0.5, COLORS.red, gate).position.set(2, 2.4, 0);
    cube(5.1, 0.5, 0.6, COLORS.red, gate).position.set(0, 4.8, 0);
    cube(4.3, 0.18, 0.48, COLORS.orange, gate).position.set(0, 4.1, 0);
    cube(0.7, 0.2, 0.8, COLORS.black, gate).position.set(-2, 0.1, 0);
    cube(0.7, 0.2, 0.8, COLORS.black, gate).position.set(2, 0.1, 0);
    const barrierMat = new THREE.MeshBasicMaterial({
      color: COLORS.red,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    materials.add(barrierMat);
    const barrier = new THREE.Mesh(geometry, barrierMat);
    barrier.scale.set(3.6, 3.8, 0.1);
    barrier.position.y = 2.1;
    gate.add(barrier);
    const gateLocks: THREE.Mesh[] = [];
    for (let j = 0; j < 3; j++) {
      const b = cube(0.6, 0.7, 0.15, COLORS.red, gate);
      b.position.set((j - 1) * 1.05, 2.2, 0.15);
      gateLocks.push(b);
    }
    const exitLabel = label("TO THE CORE", "#152337", 0.35, 256);
    exitLabel.position.set(0, 5.4, 0);
    gate.add(exitLabel);
    for (const side of [-1, 1]) {
      cube(0.72, 0.22, 0.9, COLORS.white, gate).position.set(side * 2, 0.38, 0);
      for (let row = 0; row < 6; row++) {
        cube(0.52, 0.09, 0.72, COLORS.black, gate).position.set(
          side * 2,
          0.7 + row * 0.6,
          0,
        );
      }
      cube(0.78, 0.28, 0.95, COLORS.white, gate).position.set(
        side * 2,
        4.55,
        0,
      );
    }
    const portalSteps: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const step = cube(3.7, 0.04, 0.11, COLORS.red, gate);
      step.position.set(0, 0.035, 0.5 + i * 0.4);
      portalSteps.push(step);
    }

    const clickable: THREE.Object3D[] = [];
    const paths: THREE.Mesh[][] = [];
    const terminals = TERMINALS.map((pos, index) => {
      const group = new THREE.Group();
      group.position.copy(pos);
      stageRoot.add(group);
      // Workstations have a tiled apron, a console keyboard and cooling fins.
      for (let x = -1; x <= 1; x++)
        for (let z = -1; z <= 1; z++) {
          cube(
            0.58,
            0.04,
            0.58,
            (x + z) % 2 === 0 ? 0xdfe8ef : 0xf1f7fa,
            group,
          ).position.set(x * 0.6, 0.025, z * 0.6);
        }
      cube(1.2, 0.18, 1.2, COLORS.black, group).position.y = 0.09;
      const border = cube(1.36, 0.06, 1.36, COLORS.red, group);
      border.position.y = 0.2;
      cube(0.5, 0.7, 0.5, 0xffffff, group).position.y = 0.6;
      const screen = cube(0.95, 0.75, 0.25, COLORS.black, group);
      screen.position.set(0, 1.22, 0.12);
      const face = cube(0.76, 0.55, 0.03, COLORS.red, group);
      screen.castShadow = true;
      face.material = glow(COLORS.red);
      face.position.set(0, 1.24, 0.265);
      for (let r = 0; r < 3; r++)
        cube(0.48 - r * 0.07, 0.045, 0.025, COLORS.white, group).position.set(
          -0.04,
          1.38 - r * 0.13,
          0.29,
        );
      cube(0.92, 0.09, 0.48, 0xb7c8d8, group).position.set(0, 0.86, 0.35);
      for (let row = 0; row < 2; row++)
        for (let key = 0; key < 5; key++) {
          cube(
            0.1,
            0.025,
            0.075,
            row === 1 && key === 4 ? COLORS.orange : COLORS.white,
            group,
          ).position.set((key - 2) * 0.15, 0.92, 0.25 + row * 0.14);
        }
      for (let row = 0; row < 3; row++) {
        cube(0.055, 0.04, 0.31, COLORS.black, group).position.set(
          0.29,
          0.42 + row * 0.13,
          0,
        );
      }
      const beacon = cube(0.13, 0.13, 0.13, COLORS.red, group);
      beacon.position.set(0.43, 1.72, 0.02);
      const num = label(`0${index + 1}`, "#17202e", 0.55, 128);
      num.position.set(0, 2.05, 0);
      group.add(num);
      const selected = outline(1.55, 1.8, 1.55, COLORS.blue, group);
      selected.position.y = 0.85;
      selected.visible = false;
      const brackets = new THREE.Group();
      group.add(brackets);
      for (const x of [-0.82, 0.82])
        for (const z of [-0.82, 0.82]) {
          cube(0.3, 0.055, 0.06, COLORS.blue, brackets).position.set(
            x - Math.sign(x) * 0.12,
            0.07,
            z,
          );
          cube(0.06, 0.055, 0.3, COLORS.blue, brackets).position.set(
            x,
            0.07,
            z - Math.sign(z) * 0.12,
          );
        }
      brackets.visible = false;
      const hit = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      materials.add(hit.material);
      hit.scale.set(1.65, 2.2, 1.65);
      hit.position.y = 1.1;
      hit.userData.terminal = index;
      group.add(hit);
      clickable.push(hit);
      const tiles: THREE.Mesh[] = [];
      for (let k = 0; k < 9; k++) {
        const t = (k + 1) / 11;
        const b = cube(0.2, 0.045, 0.2, 0xffc7b9);
        b.position.copy(pos).multiplyScalar(t);
        b.position.y = 0.04;
        tiles.push(b);
      }
      paths.push(tiles);
      return { group, border, face, num, selected, brackets, beacon };
    });

    // Assemble static voxel architecture into one instanced draw call.
    const instanceMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    materials.add(instanceMat);
    const architecture = new THREE.InstancedMesh(
      geometry,
      instanceMat,
      staticBlocks.length,
    );
    stageRoot.add(architecture);
    instances.add(architecture);
    architecture.castShadow = true;
    architecture.receiveShadow = true;
    const transform = new THREE.Object3D();
    staticBlocks.forEach((b, i) => {
      transform.position.set(b.x, b.y, b.z);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(b.w, b.h, b.d);
      transform.updateMatrix();
      architecture.setMatrixAt(i, transform.matrix);
      architecture.setColorAt(i, new THREE.Color(b.color));
    });
    architecture.instanceMatrix.needsUpdate = true;
    if (architecture.instanceColor)
      architecture.instanceColor.needsUpdate = true;

    type Avatar = {
      group: THREE.Group;
      legs: THREE.Mesh[];
      arms: THREE.Mesh[];
    };
    const avatar = (color: THREE.ColorRepresentation, variant = 0): Avatar => {
      const group = new THREE.Group();
      group.userData.stageActor = true;
      const suit =
        typeof color === "number" ? color : new THREE.Color(color).getHex();
      // A tiny voxel contact shadow anchors each citizen without a shadow pass.
      const shadow = cube(0.48, 0.015, 0.35, 0xc2d0dd, group);
      shadow.position.set(0.06, 0.012, 0.04);
      cube(0.38, 0.42, 0.28, suit, group).position.y = 0.51;
      cube(
        0.36,
        0.34,
        0.32,
        variant % 3 === 0 ? suit : COLORS.white,
        group,
      ).position.y = 0.9;
      cube(0.26, 0.13, 0.05, COLORS.black, group).position.set(0, 0.92, 0.19);
      cube(0.045, 0.045, 0.06, COLORS.cyan, group).position.set(
        -0.07,
        0.93,
        0.225,
      );
      cube(0.045, 0.045, 0.06, COLORS.cyan, group).position.set(
        0.07,
        0.93,
        0.225,
      );
      const legs = [
        cube(0.13, 0.24, 0.19, COLORS.black, group),
        cube(0.13, 0.24, 0.19, COLORS.black, group),
      ];
      legs[0].position.set(-0.11, 0.17, 0);
      legs[1].position.set(0.11, 0.17, 0);
      const arms = [
        cube(0.12, 0.32, 0.15, suit, group),
        cube(0.12, 0.32, 0.15, suit, group),
      ];
      arms[0].position.set(-0.27, 0.51, 0);
      arms[1].position.set(0.27, 0.51, 0);
      if (variant % 4 === 0) {
        cube(0.12, 0.3, 0.12, suit, group).position.set(-0.13, 1.21, 0);
        cube(0.12, 0.3, 0.12, suit, group).position.set(0.13, 1.21, 0);
      }
      if (variant % 4 === 1) {
        cube(0.5, 0.11, 0.43, COLORS.yellow, group).position.y = 1.13;
        cube(0.3, 0.18, 0.3, COLORS.yellow, group).position.y = 1.25;
      }
      if (variant % 4 === 2) {
        cube(0.24, 0.22, 0.16, COLORS.orange, group).position.set(
          0,
          0.55,
          -0.22,
        );
      }
      stageRoot.add(group);
      return { group, legs, arms };
    };
    const self = avatar(COLORS.orange, 0);
    self.group.position.set(0, 0, 4.5);
    self.group.scale.setScalar(1.08);
    const you = label("YOU", "#17202e", 0.28, 128);
    you.position.y = 1.62;
    self.group.add(you);
    const selfMarker = outline(0.75, 0.05, 0.75, COLORS.orange, self.group);
    selfMarker.position.y = 0.025;
    const peers = new Map<string, Avatar>();
    const crowds: {
      avatar: Avatar;
      angle: number;
      radius: number;
      offset: number;
      speed: number;
    }[] = [];
    for (let i = 0; i < 18; i++) {
      const a = i * 2.399;
      const r = 5.5 + (i % 3) * 0.25;
      const npc = avatar(PALETTE[i % PALETTE.length], i);
      npc.group.scale.setScalar(0.64 + (i % 3) * 0.07);
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      npc.group.position.set(x, 0, z);
      npc.group.rotation.y = -a;
      crowds.push({
        avatar: npc,
        angle: a,
        radius: r,
        offset: i * 0.7,
        speed: (i % 2 === 0 ? 1 : -1) * (0.025 + (i % 4) * 0.008),
      });
    }
    const stageRings = createStageRings(stageRoot);
    scene.add(stageRings.group);
    // The active plaza is larger than its ring copy and remains selectable outside.
    const activeStageMaterial = new THREE.MeshBasicMaterial({ visible: false });
    materials.add(activeStageMaterial);
    const activeStageHit = new THREE.Mesh(geometry, activeStageMaterial);
    activeStageHit.scale.set(14, 8, 14);
    activeStageHit.position.y = 1;
    stageRoot.add(activeStageHit);
    const keys = new Set<string>();
    const editing = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      !!target.closest(
        'textarea,input,select,[contenteditable="true"],dialog,[role="dialog"]',
      );
    const keydown = (event: KeyboardEvent) => {
      if (
        latest.current.phase !== "playing" ||
        editing(event.target) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const key = event.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].includes(key)
      ) {
        keys.add(key);
        event.preventDefault();
      }
    };
    const keyup = (event: KeyboardEvent) =>
      keys.delete(event.key.toLowerCase());
    const blur = () => keys.clear();
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    const pointer = new THREE.Vector2(),
      raycaster = new THREE.Raycaster();
    let downX = 0,
      downY = 0;
    const point = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
    };
    const activeFloorRay = new THREE.Ray();
    const activeFloorInverse = new THREE.Matrix4();
    const activeFloorPoint = new THREE.Vector3();
    const activeFloorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const overActiveFloor = () => {
      activeFloorInverse.copy(stageRoot.matrixWorld).invert();
      activeFloorRay.copy(raycaster.ray).applyMatrix4(activeFloorInverse);
      if (!activeFloorRay.intersectPlane(activeFloorPlane, activeFloorPoint))
        return false;
      return (
        Math.abs(activeFloorPoint.x) <= 7 &&
        Math.abs(activeFloorPoint.z) <= 7 &&
        Math.abs(activeFloorPoint.x) + Math.abs(activeFloorPoint.z) <= 11
      );
    };
    const down = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const pick = (e: PointerEvent) => {
      const current = latest.current;
      if (current.phase === "entering") return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      point(e);
      if (current.phase === "playing") {
        const hit = raycaster
          .intersectObjects(clickable)
          .find(
            (candidate) =>
              current.problems[candidate.object.userData.terminal as number],
          );
        if (hit) {
          const problem =
            current.problems[hit.object.userData.terminal as number];
          current.onSelect(problem.id);
          return;
        }
        if (overActiveFloor()) return;
      }
      if (
        current.phase === "overview" &&
        raycaster.intersectObject(activeStageHit).length
      ) {
        if (current.unlockedStageIndices.includes(current.stageIndex))
          current.onSelectStage(current.stageIndex);
        return;
      }
      const stageIndex = stageRings.pick(raycaster);
      if (
        stageIndex !== null &&
        current.unlockedStageIndices.includes(stageIndex)
      )
        current.onSelectStage(stageIndex);
    };
    const hover = (e: PointerEvent) => {
      const current = latest.current;
      if (current.phase === "entering") {
        renderer.domElement.style.cursor = "default";
        return;
      }
      point(e);
      const terminal =
        current.phase === "playing" &&
        raycaster
          .intersectObjects(clickable)
          .some(
            (hit) => current.problems[hit.object.userData.terminal as number],
          );
      const active =
        current.phase === "overview" &&
        current.unlockedStageIndices.includes(current.stageIndex) &&
        raycaster.intersectObject(activeStageHit).length > 0;
      const floor = current.phase === "playing" && overActiveFloor();
      const stageIndex =
        terminal || active || floor ? null : stageRings.pick(raycaster);
      const available =
        stageIndex !== null &&
        current.unlockedStageIndices.includes(stageIndex);
      renderer.domElement.style.cursor =
        terminal || active || available ? "pointer" : "grab";
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", pick);
    renderer.domElement.addEventListener("pointermove", hover);
    const resize = () => {
      const width = host.clientWidth,
        height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(
        Math.max(1, Math.floor(width / 1.5)),
        Math.max(1, Math.floor(height / 1.5)),
        false,
      );
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let raf = 0,
      previous = performance.now(),
      lastMove = 0,
      time = 0,
      restored = 0;
    const up = new THREE.Vector3(0, 1, 0),
      forward = new THREE.Vector3(),
      right = new THREE.Vector3(),
      direction = new THREE.Vector3();
    const previousStagePosition = new THREE.Vector3();
    const targetStagePosition = new THREE.Vector3();
    let previousStageIndex = props.stageIndex;
    let phase: WorldProps["phase"] | null = null;
    let flight: {
      path: THREE.CatmullRomCurve3;
      target: THREE.Vector3;
      start: number;
      fov: number;
      completed: boolean;
    } | null = null;
    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      time += dt;
      const p = latest.current,
        motion = p.reducedMotion ? 0 : 1;
      // The selected island and camera follow the same circular campaign route.
      previousStagePosition.copy(stageRoot.position);
      const previousStageAngle = stageRoot.rotation.y;
      const destination = getStagePosition(p.stageIndex, p.stageProgress);
      targetStagePosition.set(destination.x, destination.y, destination.z);
      const damping = p.reducedMotion ? 1 : 1 - Math.exp(-3 * dt);
      stageRoot.position.lerp(targetStagePosition, damping);
      const radialX = stageRoot.position.x - SPHERE_CENTER.x;
      const radialZ = stageRoot.position.z - SPHERE_CENTER.z;
      const targetAngle =
        Math.hypot(radialX, radialZ) > 0.001
          ? Math.atan2(radialX, radialZ)
          : previousStageAngle;
      const angleDelta =
        Math.atan2(
          Math.sin(targetAngle - previousStageAngle),
          Math.cos(targetAngle - previousStageAngle),
        ) * damping;
      stageRoot.rotation.y += angleDelta;
      if (phase === "playing" && p.phase === "playing") {
        camera.position
          .sub(previousStagePosition)
          .applyAxisAngle(rotationAxis, angleDelta)
          .add(stageRoot.position);
        controls.target
          .sub(previousStagePosition)
          .applyAxisAngle(rotationAxis, angleDelta)
          .add(stageRoot.position);
      }
      insidePosition
        .copy(insideOffset)
        .applyAxisAngle(rotationAxis, stageRoot.rotation.y)
        .add(stageRoot.position);
      insideTarget
        .copy(targetOffset)
        .applyAxisAngle(rotationAxis, stageRoot.rotation.y)
        .add(stageRoot.position);
      sunlight.target.position.copy(stageRoot.position);
      core.visible = p.stageIndex === STAGE_COUNT - 1;
      if (previousStageIndex !== p.stageIndex) {
        previousStageIndex = p.stageIndex;
        keys.clear();
        self.group.position.set(0, 0, 4.5);
      }
      if (phase !== p.phase) {
        phase = p.phase;
        keys.clear();
        if (phase === "entering") {
          controls.enableDamping = false;
          controls.update();
          controls.enabled = false;
          flight = {
            path: new THREE.CatmullRomCurve3([
              camera.position.clone(),
              camera.position
                .clone()
                .lerp(insidePosition, 0.4)
                .add(new THREE.Vector3(0, 1.5, 0)),
              insidePosition,
            ]),
            target: controls.target.clone(),
            start: now,
            fov: camera.fov,
            completed: false,
          };
        } else {
          flight = null;
          controls.enabled = true;
          setPose(phase === "playing");
        }
      }
      if (phase === "entering" && flight) {
        const progress = p.reducedMotion
          ? 1
          : Math.min((now - flight.start) / 2800, 1);
        const eased =
          progress *
          progress *
          progress *
          (progress * (progress * 6 - 15) + 10);
        flight.path.getPoint(eased, camera.position);
        controls.target.copy(flight.target).lerp(insideTarget, eased);
        camera.fov = THREE.MathUtils.lerp(flight.fov, 54, eased);
        camera.lookAt(controls.target);
        camera.updateProjectionMatrix();
        if (progress === 1 && !flight.completed) {
          flight.completed = true;
          p.onEntered();
        }
      }
      restored = THREE.MathUtils.damp(restored, p.gateOpen ? 1 : 0, 4, dt);
      core.position.y =
        SPHERE_CENTER.y +
        (3.1 + Math.round(Math.sin(time * 1.8) * 3) * 0.045 * motion) *
          stageScale;
      core.rotation.y = Math.sin(time * 0.3) * 0.15 * motion;
      coreBlocks.forEach((b, i) => {
        b.material = p.gateOpen
          ? mat(i % 4 === 0 ? COLORS.yellow : COLORS.cyan)
          : mat(i % 4 === 0 ? COLORS.orange : COLORS.red);
      });
      coreSocket.material = glow(p.gateOpen ? COLORS.cyan : COLORS.red);
      beamMaterial.color.setHex(p.gateOpen ? COLORS.cyan : COLORS.red);
      beamMaterial.opacity = p.reducedMotion
        ? 0.1
        : 0.1 + Math.sin(time * 2) * 0.035;
      portalSteps.forEach((step, i) => {
        step.material = glow(
          p.gateOpen ? (i % 2 ? COLORS.cyan : COLORS.blue) : COLORS.red,
        );
      });
      faultLabel.visible = !p.gateOpen;
      coreOrbit.rotation.z = time * 0.13 * motion;
      coreOrbit2.rotation.z = -time * 0.09 * motion;
      sparkles.forEach((b, i) => {
        b.visible = restored < 0.95;
        b.position.y = Math.sin(time * 1.3 * motion + i) * 1.7;
        b.rotation.y = time * (i % 2 ? 1 : -1) * motion;
      });
      barrier.scale.y = 3.8 * (1 - restored);
      barrier.position.y = 2.1 + restored * 1.9;
      gateLocks.forEach((b, i) => {
        const done = p.problems[i] && p.solved.includes(p.problems[i].id);
        b.material = mat(done ? COLORS.cyan : COLORS.red);
        b.visible = !p.gateOpen;
      });
      terminals.forEach((terminal, i) => {
        const problem = p.problems[i],
          done = !!problem && p.solved.includes(problem.id);
        terminal.group.visible = !!problem;
        terminal.border.material = mat(done ? COLORS.cyan : COLORS.red);
        terminal.face.material = glow(done ? COLORS.cyan : COLORS.red);
        terminal.beacon.material = glow(done ? COLORS.cyan : COLORS.orange);
        terminal.brackets.visible =
          !!problem && p.activeProblemId === problem.id;
        terminal.brackets.position.y =
          Math.round(Math.sin(time * 3) * 2) * 0.025 * motion;
        terminal.selected.visible =
          !!problem && p.activeProblemId === problem.id;
        terminal.num.position.y =
          2.05 + Math.round(Math.sin(time * 2 + i) * 2) * 0.04 * motion;
        paths[i].forEach((tile, j) => {
          tile.material = mat(
            done
              ? j % 2 === Math.floor(time * 3 * motion) % 2
                ? COLORS.cyan
                : COLORS.blue
              : 0xffc7b9,
          );
        });
      });
      crowds.forEach((n, i) => {
        const a = n.angle + time * n.speed * motion;
        n.avatar.group.position.x = Math.cos(a) * n.radius;
        n.avatar.group.position.z = Math.sin(a) * n.radius;
        n.avatar.group.rotation.y = -a + (n.speed > 0 ? Math.PI : 0);
        n.avatar.legs.forEach((leg, k) => {
          leg.rotation.x =
            Math.sin(time * 7 + n.offset + k * Math.PI) * 0.35 * motion;
        });
      });
      direction.set(0, 0, 0);
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, up).normalize();
      if (keys.has("w") || keys.has("arrowup")) direction.add(forward);
      if (keys.has("s") || keys.has("arrowdown")) direction.sub(forward);
      if (keys.has("d") || keys.has("arrowright")) direction.add(right);
      if (keys.has("a") || keys.has("arrowleft")) direction.sub(right);
      const walking = p.phase === "playing" && direction.lengthSq() > 0;
      if (walking) {
        direction.applyAxisAngle(rotationAxis, -stageRoot.rotation.y);
        direction.normalize();
        const next = self.group.position
          .clone()
          .addScaledVector(direction, dt * 3.6);
        if (
          Math.abs(next.x) < 6.5 &&
          Math.abs(next.z) < 6.5 &&
          Math.abs(next.x) + Math.abs(next.z) < 10 &&
          Math.hypot(next.x, next.z + 0.5) > 1.7
        )
          self.group.position.copy(next);
        self.group.rotation.y = Math.atan2(direction.x, direction.z);
        if (now - lastMove > 100) {
          lastMove = now;
          p.onMove?.(self.group.position.x, self.group.position.z);
        }
      }
      self.legs.forEach((leg, k) => {
        leg.rotation.x = walking ? Math.sin(time * 12 + k * Math.PI) * 0.5 : 0;
      });
      self.arms.forEach((arm, k) => {
        arm.rotation.x = walking ? -Math.sin(time * 12 + k * Math.PI) * 0.5 : 0;
      });
      const ids = new Set<string>();
      for (const player of p.players ?? []) {
        if (player.id === p.playerId) continue;
        ids.add(player.id);
        let peer = peers.get(player.id);
        if (!peer) {
          peer = avatar(player.color, 1);
          const name = label(player.name.slice(0, 12), "#17202e", 0.28, 256);
          name.position.y = 1.6;
          peer.group.add(name);
          peer.group.position.set(player.x, 0, player.z);
          peers.set(player.id, peer);
        }
        peer.group.position.x = THREE.MathUtils.damp(
          peer.group.position.x,
          player.x,
          10,
          dt,
        );
        peer.group.position.z = THREE.MathUtils.damp(
          peer.group.position.z,
          player.z,
          10,
          dt,
        );
      }
      peers.forEach((peer, id) => {
        if (!ids.has(id)) {
          stageRoot.remove(peer.group);
          peers.delete(id);
        }
      });
      if (phase !== "entering") controls.update();
      networkSphere.update(
        camera,
        time,
        motion,
        p.completed ? 1 : restored * 0.25,
      );
      coreJourney.update(
        p.depthProgress,
        layerForStage(p.stageIndex),
        time,
        motion,
        p.completed,
        p.stageIndex,
      );
      stageRings.update(
        stageRoot.position,
        p.depthProgress,
        p.completed,
        p.unlockedStageIndices,
        p.clearedStageIndices,
      );
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      resetRef.current = null;
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", pick);
      renderer.domElement.removeEventListener("pointermove", hover);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      instances.forEach((mesh) => mesh.dispose());
      networkSphere.dispose();
      coreJourney.dispose();
      stageRings.dispose();
      sunlight.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      data-world-phase={props.phase}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <div ref={hostRef} style={{ width: "100%", height: "100%" }} />
      {unavailable && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeContent: "center",
            textAlign: "center",
            padding: 32,
            color: "#ff4027",
          }}
        >
          <b style={{ fontFamily: "monospace", fontSize: 24 }}>
            COMMONS / PIXEL NETWORK
          </b>
          <p>
            この端末では3D表示を利用できません。
            <br />
            ミッション一覧から冒険を進められます。
          </p>
        </div>
      )}
      <button
        disabled={props.phase === "entering"}
        type="button"
        aria-label="3D視点を初期位置に戻す"
        title="視点をリセット"
        onClick={() => resetRef.current?.()}
        style={{
          position: "absolute",
          bottom: 22,
          right: 22,
          width: 36,
          height: 36,
          border: "2px solid #17202e",
          borderRadius: 0,
          boxShadow: "3px 3px 0 #17202e",
          background: "#fff",
          color: "#17202e",
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: 23,
        }}
      >
        ⌖
      </button>
    </div>
  );
}
