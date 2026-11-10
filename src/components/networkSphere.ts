import * as THREE from "three";

export const SPHERE_CENTER = new THREE.Vector3(0, 2, -1);
export const SPHERE_RADIUS = 15.7;

/** A globe around the playable world, with a quiet front and a readable far wall.
 * The rim follows the camera; the meridians and traffic stay in world space. */
export function createNetworkSphere() {
  const group = new THREE.Group();
  group.position.copy(SPHERE_CENTER);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const radius = SPHERE_RADIUS;
  const sphere = new THREE.SphereGeometry(radius, 64, 32);
  geometries.push(sphere);
  const shell = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      varying float height;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        viewNormal = normalize(normalMatrix * normal);
        viewDirection = -viewPosition.xyz;
        height = position.y;
        gl_Position = projectionMatrix * viewPosition;
      }`,
    fragmentShader: `
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      varying float height;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(viewNormal), normalize(viewDirection))), 2.5);
        float bowl = 1.0 - smoothstep(-12.0, 0.0, height);
        gl_FragColor = vec4(0.57, 0.83, 0.89, 0.016 + rim * 0.19 + bowl * 0.025);
        #include <colorspace_fragment>
      }`,
  });
  materials.push(shell);
  group.add(new THREE.Mesh(sphere, shell));

  const points: THREE.Vector3[] = [];
  const nodePositions: THREE.Vector3[] = [];
  const spherical = (latitude: number, longitude: number) =>
    new THREE.Vector3(
      radius * Math.cos(latitude) * Math.cos(longitude),
      radius * Math.sin(latitude),
      radius * Math.cos(latitude) * Math.sin(longitude),
    );
  const segment = (a: THREE.Vector3, b: THREE.Vector3) => points.push(a, b);
  // Latitude and longitude only: no diagonal wireframe across the world.
  for (let row = -2; row <= 2; row++) {
    const latitude = (row * Math.PI) / 6;
    for (let i = 0; i < 96; i++) {
      segment(
        spherical(latitude, (i * Math.PI) / 48),
        spherical(latitude, ((i + 1) * Math.PI) / 48),
      );
      if (i % 12 === 0)
        nodePositions.push(spherical(latitude, (i * Math.PI) / 48));
    }
  }
  for (let meridian = 0; meridian < 8; meridian++) {
    const longitude = (meridian * Math.PI) / 4;
    for (let i = 0; i < 48; i++) {
      segment(
        spherical(-Math.PI / 2 + (i * Math.PI) / 48, longitude),
        spherical(-Math.PI / 2 + ((i + 1) * Math.PI) / 48, longitude),
      );
    }
  }
  const gridGeometry = new THREE.BufferGeometry().setFromPoints(points);
  geometries.push(gridGeometry);
  const gridMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { center: { value: SPHERE_CENTER }, restored: { value: 0 } },
    vertexShader: `
      varying vec3 worldPoint;
      void main() {
        worldPoint = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(worldPoint, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 center;
      uniform float restored;
      varying vec3 worldPoint;
      void main() {
        float facing = dot(normalize(worldPoint - center), normalize(cameraPosition - center));
        float front = smoothstep(-0.08, 0.15, facing);
        vec3 backColor = mix(vec3(1.0, 0.24, 0.13), vec3(0.0, 0.62, 0.76), restored * 0.65);
        vec3 color = mix(backColor, vec3(0.38, 0.68, 0.75), front);
        gl_FragColor = vec4(color, mix(0.3, 0.065, front));
        #include <colorspace_fragment>
      }`,
  });
  materials.push(gridMaterial);
  group.add(new THREE.LineSegments(gridGeometry, gridMaterial));

  const rimGeometry = new THREE.BufferGeometry().setFromPoints(
    Array.from(
      { length: 160 },
      (_, i) =>
        new THREE.Vector3(
          Math.cos((i * Math.PI) / 80) * radius,
          Math.sin((i * Math.PI) / 80) * radius,
          0,
        ),
    ),
  );
  const rimMaterial = new THREE.LineBasicMaterial({
    color: 0xff6b51,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    toneMapped: false,
  });
  geometries.push(rimGeometry);
  materials.push(rimMaterial);
  const rim = new THREE.LineLoop(rimGeometry, rimMaterial);
  group.add(rim);
  const cameraOffset = new THREE.Vector3();

  const voxel = new THREE.BoxGeometry(1, 1, 1);
  const nodeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffa58d,
    transparent: true,
    opacity: 0.6,
    toneMapped: false,
  });
  const trafficMaterial = new THREE.MeshBasicMaterial({
    color: 0x00c8e6,
    toneMapped: false,
  });
  geometries.push(voxel);
  materials.push(nodeMaterial, trafficMaterial);
  const nodes = new THREE.InstancedMesh(
    voxel,
    nodeMaterial,
    nodePositions.length,
  );
  const traffic = new THREE.InstancedMesh(voxel, trafficMaterial, 16);
  const transform = new THREE.Object3D();
  nodePositions.forEach((point, i) => {
    transform.position.copy(point);
    transform.scale.setScalar(i % 4 ? 0.11 : 0.19);
    transform.updateMatrix();
    nodes.setMatrixAt(i, transform.matrix);
  });
  nodes.instanceMatrix.needsUpdate = true;
  traffic.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // Positions change around the sphere, so fixed bounds include their full orbit.
  traffic.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius + 0.2);
  group.add(nodes, traffic);

  return {
    group,
    update(
      camera: THREE.Camera,
      time: number,
      motion: number,
      restored: number,
    ) {
      cameraOffset.copy(camera.position).sub(SPHERE_CENTER);
      const distance = cameraOffset.length();
      rim.visible = distance > radius + 0.1;
      if (rim.visible) {
        // Tangent circle of the sphere for a perspective camera.
        rim.scale.setScalar(
          Math.sqrt(1 - (radius * radius) / (distance * distance)),
        );
        rim.position
          .copy(cameraOffset)
          .multiplyScalar((radius * radius) / (distance * distance));
        rim.lookAt(camera.position);
      }
      gridMaterial.uniforms.restored.value = restored;
      for (let i = 0; i < 16; i++) {
        const latitude = (((i % 5) - 2) * Math.PI) / 6;
        transform.position.copy(
          spherical(latitude, i * 2.4 + time * 0.075 * motion),
        );
        transform.scale.setScalar(0.17);
        transform.updateMatrix();
        traffic.setMatrixAt(i, transform.matrix);
      }
      traffic.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      nodes.dispose();
      traffic.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
