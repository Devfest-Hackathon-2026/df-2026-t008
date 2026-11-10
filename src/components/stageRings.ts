import * as THREE from "three";
import { SPHERE_CENTER } from "./networkSphere";
import {
  CAMPAIGN_LAYERS,
  STAGE_COUNT,
  getStagePosition,
  layerForStage,
} from "../lib/campaign";

type StageBox = { matrix: THREE.Matrix4; color: THREE.Color; signal: boolean };
type Island = {
  matrix: THREE.Matrix4;
  x: number;
  z: number;
  layer: number;
  scale: number;
  visibility: number;
  worldMatrix: THREE.Matrix4;
  inverseWorldMatrix: THREE.Matrix4;
};

/** Reuse the playable plaza's actual blocks without copying actors or handlers.
 * Every ring stays fixed while the active stage travels toward the core. */
export function createStageRings(source: THREE.Group) {
  source.updateWorldMatrix(true, true);
  const inverseSource = source.matrixWorld.clone().invert();
  const archetypes: StageBox[][] = [[], []];
  const relative = new THREE.Matrix4();
  const instance = new THREE.Matrix4();
  const dimensions = new THREE.Matrix4();
  const instanceColor = new THREE.Color();
  const archetypeBounds = new THREE.Box3();
  const unitBounds = new THREE.Box3(
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, 0.5, 0.5),
  );
  const transformedBounds = new THREE.Box3();

  source.traverseVisible((object) => {
    const mesh = object as THREE.Mesh<THREE.BoxGeometry>;
    if (!mesh.isMesh || mesh.geometry.type !== "BoxGeometry") return;
    for (
      let parent: THREE.Object3D | null = mesh;
      parent;
      parent = parent.parent
    ) {
      if (parent.userData.stageActor) return;
      if (parent === source) break;
    }
    const material = Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material;
    if (
      !material ||
      !material.visible ||
      material.transparent ||
      material.opacity < 1
    )
      return;
    const colored = material as
      | THREE.MeshBasicMaterial
      | THREE.MeshLambertMaterial;
    const baseColor = colored.color?.clone() ?? new THREE.Color(0xffffff);
    const emissive =
      (material as THREE.MeshBasicMaterial).isMeshBasicMaterial === true;
    const boxes = archetypes[emissive ? 1 : 0];
    const parameters = mesh.geometry.parameters;
    dimensions.makeScale(parameters.width, parameters.height, parameters.depth);
    relative.multiplyMatrices(inverseSource, mesh.matrixWorld);

    const append = (matrix: THREE.Matrix4, color: THREE.Color) => {
      const boxMatrix = matrix.clone().multiply(dimensions);
      boxes.push({
        matrix: boxMatrix,
        color,
        signal: color.r > 0.5 && color.g < 0.18 && color.b < 0.15,
      });
      archetypeBounds.union(
        transformedBounds.copy(unitBounds).applyMatrix4(boxMatrix),
      );
    };
    const instanced = mesh as THREE.InstancedMesh<THREE.BoxGeometry>;
    if (instanced.isInstancedMesh) {
      for (let index = 0; index < instanced.count; index++) {
        instanced.getMatrixAt(index, instance);
        const color = baseColor.clone();
        if (instanced.instanceColor) {
          instanced.getColorAt(index, instanceColor);
          color.multiply(instanceColor);
        }
        append(new THREE.Matrix4().multiplyMatrices(relative, instance), color);
      }
    } else append(relative, baseColor);
  });

  const group = new THREE.Group();
  group.position.copy(SPHERE_CENTER);
  const islands: Island[] = [];
  const rotation = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (let stageIndex = 0; stageIndex < STAGE_COUNT; stageIndex++) {
    const layerIndex = layerForStage(stageIndex);
    const layer = CAMPAIGN_LAYERS[layerIndex];
    const worldPosition = getStagePosition(stageIndex);
    const x = worldPosition.x - SPHERE_CENTER.x;
    const z = worldPosition.z - SPHERE_CENTER.z;
    const angle = Math.atan2(x, z);
    position.set(x, worldPosition.y - SPHERE_CENTER.y, z);
    rotation.setFromAxisAngle(yAxis, angle);
    scale.setScalar(layer.scale);
    islands.push({
      matrix: new THREE.Matrix4().compose(position, rotation, scale),
      x,
      z,
      layer: layerIndex,
      scale: layer.scale,
      visibility: -1,
      worldMatrix: new THREE.Matrix4(),
      inverseWorldMatrix: new THREE.Matrix4(),
    });
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials: THREE.Material[] = [
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  ];
  const batches = archetypes.map((boxes, index) => {
    if (!boxes.length) return null;
    const mesh = new THREE.InstancedMesh(
      geometry,
      materials[index],
      boxes.length * islands.length,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 16);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
    islands.forEach((_, islandIndex) =>
      boxes.forEach((box, boxIndex) => {
        mesh.setColorAt(islandIndex * boxes.length + boxIndex, box.color);
      }),
    );
    return mesh;
  });

  const islandMatrix = new THREE.Matrix4();
  const boxMatrix = new THREE.Matrix4();
  const shrink = new THREE.Vector3();
  const lastActive = new THREE.Vector3();
  const signalColor = new THREE.Color(0x00c8e6);
  const lockedColor = new THREE.Color(0xb7c4d1);
  const statusColor = new THREE.Color();
  const unlocked = new Uint8Array(STAGE_COUNT);
  const cleared = new Uint8Array(STAGE_COUNT);
  const worldTransform = new THREE.Matrix4().makeTranslation(
    SPHERE_CENTER.x,
    SPHERE_CENTER.y,
    SPHERE_CENTER.z,
  );
  const pickRay = new THREE.Ray();
  const localHit = new THREE.Vector3();
  const worldHit = new THREE.Vector3();
  let initialized = false;
  let previousProgress = -1;
  let previousCompleted = false;
  let previousUnlocked: readonly number[] | null = null;
  let previousCleared: readonly number[] | null = null;
  let previousUnlockedKey = "";
  let previousClearedKey = "";
  const sourceBoxCount = archetypes[0].length + archetypes[1].length;
  group.userData.stageRings = {
    stageCount: islands.length,
    sourceBoxCount,
    totalBoxCount: sourceBoxCount * islands.length,
    drawCalls: batches.filter(Boolean).length,
    instanceBufferBytes: sourceBoxCount * islands.length * (16 + 3) * 4,
  };

  return {
    group,
    stageCount: islands.length,
    update(
      activePosition: THREE.Vector3,
      depthProgress: number,
      completed: boolean,
      unlockedStageIndices: readonly number[] = [],
      clearedStageIndices: readonly number[] = [],
    ) {
      let statusChanged = false;
      if (previousUnlocked !== unlockedStageIndices) {
        const key = unlockedStageIndices.join(",");
        statusChanged = key !== previousUnlockedKey;
        previousUnlockedKey = key;
        previousUnlocked = unlockedStageIndices;
      }
      if (previousCleared !== clearedStageIndices) {
        const key = clearedStageIndices.join(",");
        statusChanged ||= key !== previousClearedKey;
        previousClearedKey = key;
        previousCleared = clearedStageIndices;
      }
      if (
        !initialized ||
        lastActive.distanceToSquared(activePosition) > 0.00000001
      ) {
        lastActive.copy(activePosition);
        const activeX = activePosition.x - SPHERE_CENTER.x;
        const activeZ = activePosition.z - SPHERE_CENTER.z;
        for (let islandIndex = 0; islandIndex < islands.length; islandIndex++) {
          const island = islands[islandIndex];
          const distance = Math.hypot(island.x - activeX, island.z - activeZ);
          const clearance = 3.3 + 8 * island.scale;
          const visibility = THREE.MathUtils.smoothstep(
            distance,
            clearance,
            clearance + 0.65,
          );
          if (Math.abs(visibility - island.visibility) < 0.0001) continue;
          island.visibility = visibility;
          // A positive minimum keeps instanced normal matrices nonsingular.
          shrink.setScalar(Math.max(0.0001, visibility));
          islandMatrix.copy(island.matrix).scale(shrink);
          island.worldMatrix.multiplyMatrices(worldTransform, islandMatrix);
          island.inverseWorldMatrix.copy(island.worldMatrix).invert();
          for (
            let batchIndex = 0;
            batchIndex < archetypes.length;
            batchIndex++
          ) {
            const boxes = archetypes[batchIndex];
            const batch = batches[batchIndex];
            if (!batch) continue;
            for (let boxIndex = 0; boxIndex < boxes.length; boxIndex++) {
              boxMatrix.multiplyMatrices(islandMatrix, boxes[boxIndex].matrix);
              batch.setMatrixAt(
                islandIndex * boxes.length + boxIndex,
                boxMatrix,
              );
            }
            batch.instanceMatrix.needsUpdate = true;
          }
        }
      }
      const progress = Math.max(0, Math.min(12, depthProgress));
      if (
        !initialized ||
        progress !== previousProgress ||
        completed !== previousCompleted ||
        statusChanged
      ) {
        previousProgress = progress;
        previousCompleted = completed;
        unlocked.fill(0);
        cleared.fill(0);
        for (const index of unlockedStageIndices)
          if (Number.isInteger(index) && index >= 0 && index < STAGE_COUNT)
            unlocked[index] = 1;
        for (const index of clearedStageIndices)
          if (Number.isInteger(index) && index >= 0 && index < STAGE_COUNT)
            cleared[index] = 1;
        for (let islandIndex = 0; islandIndex < islands.length; islandIndex++) {
          const island = islands[islandIndex];
          const restored = completed || cleared[islandIndex] === 1;
          for (
            let batchIndex = 0;
            batchIndex < archetypes.length;
            batchIndex++
          ) {
            const boxes = archetypes[batchIndex];
            const batch = batches[batchIndex];
            if (!batch) continue;
            for (let boxIndex = 0; boxIndex < boxes.length; boxIndex++) {
              const box = boxes[boxIndex];
              statusColor.copy(
                restored && box.signal ? signalColor : box.color,
              );
              if (!unlocked[islandIndex] && !restored)
                statusColor.lerp(lockedColor, 0.82);
              batch.setColorAt(
                islandIndex * boxes.length + boxIndex,
                statusColor,
              );
            }
            if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
          }
        }
      }
      initialized = true;
    },
    /** Full plaza bounds form a generous target without adding render objects. */
    pick(raycaster: THREE.Raycaster): number | null {
      if (!initialized || archetypeBounds.isEmpty()) return null;
      let nearest = raycaster.far;
      let selected: number | null = null;
      for (let index = 0; index < islands.length; index++) {
        const island = islands[index];
        if (island.visibility < 0.35) continue;
        pickRay.copy(raycaster.ray).applyMatrix4(island.inverseWorldMatrix);
        if (!pickRay.intersectBox(archetypeBounds, localHit)) continue;
        worldHit.copy(localHit).applyMatrix4(island.worldMatrix);
        const distance = worldHit.distanceTo(raycaster.ray.origin);
        if (distance < raycaster.near || distance >= nearest) continue;
        nearest = distance;
        selected = index;
      }
      return selected;
    },
    dispose() {
      batches.forEach((batch) => batch?.dispose());
      geometry.dispose();
      materials.forEach((material) => material.dispose());
    },
  };
}
