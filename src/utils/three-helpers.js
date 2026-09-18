/**
 * Three.js & Math Helper Utilities for WebAR HUD & Drag Interaction
 */

// Access Three.js from window or AFRAME
export function getTHREE() {
  return window.THREE || (typeof AFRAME !== 'undefined' ? AFRAME.THREE : null);
}

/**
 * Escape HTML special characters for remote log output
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Three.js Helper: Calculate exact ground (Y=0) intersection from screen coordinates
 * Forces camera.updateMatrixWorld(true) for zero-drift 8th Wall WebAR SLAM raycasting at any camera angle
 */
export function getGroundIntersectionFromScreen(clientX, clientY, camera, canvas) {
  const THREE = getTHREE();
  if (!camera || !canvas || !THREE) return null;

  // Force camera matrix update to match live 8th Wall SLAM pose
  if (camera.updateMatrixWorld) {
    camera.updateMatrixWorld(true);
  }

  const rect = (canvas && canvas.getBoundingClientRect)
    ? canvas.getBoundingClientRect()
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

  const w = rect.width || window.innerWidth || 1;
  const h = rect.height || window.innerHeight || 1;

  const cx = (clientX !== undefined && clientX !== null) ? clientX : (w / 2);
  const cy = (clientY !== undefined && clientY !== null) ? clientY : (h / 2);

  const mouse = new THREE.Vector2(
    ((cx - rect.left) / w) * 2 - 1,
    -((cy - rect.top) / h) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Horizontal plane Y=0 (normal vector must be 0,1,0)
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const point = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(groundPlane, point)) {
    return point;
  }

  return null;
}

/**
 * Three.js Helper: Apply or remove flat unlit shader across GLTF object graph
 */
export function applyFlatShaderToMesh(object3D, isFlat = true) {
  const THREE = getTHREE();
  if (!object3D || !THREE) return;

  object3D.traverse((child) => {
    if (child.isMesh && child.material) {
      // Skip ONLY the dedicated dynamic mouth mesh (preserve eye shader on Face_Outline!)
      if (child.userData.isMouthMesh || (child.material && child.material.name === 'CH0145_Mouth_Dynamic')) {
        return;
      }

      if (isFlat) {
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
        }
        const origMat = child.userData.originalMaterial;
        const materials = Array.isArray(origMat) ? origMat : [origMat];
        const flatMaterials = materials.map((m) => {
          return new THREE.MeshBasicMaterial({
            map: m.map || null,
            color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
            transparent: m.transparent !== undefined ? m.transparent : false,
            opacity: m.opacity !== undefined ? m.opacity : 1.0,
            alphaTest: m.alphaTest || 0,
            side: m.side !== undefined ? m.side : THREE.FrontSide,
          });
        });
        child.material = Array.isArray(origMat) ? flatMaterials : flatMaterials[0];
      } else if (child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial;
      }
    }
  });
}

/**
 * Helper: Create 2 Distinct Colored Debug Grids to visually compare coordinate systems:
 * 1) GREEN GRID (#10B981) + 3D Axes = Three.js World Space Origin (0,0,0)
 * 2) CYAN GRID (#06B6D4) = 8th Wall SLAM Surface Detected Plane
 */
export function createDualDebugGrids() {
  const THREE = getTHREE();
  if (!THREE) return null;

  const group = new THREE.Group();
  group.name = 'dualDebugGridsGroup';

  // 1. THREE.JS WORLD COORDINATE GRID (Neon Emerald Green #10B981)
  const threeGrid = new THREE.GridHelper(10, 20, 0x10b981, 0x059669);
  threeGrid.position.set(0, 0.001, 0);
  threeGrid.name = 'threeWorldGridMesh';
  threeGrid.material.depthTest = true;
  threeGrid.material.transparent = true;
  threeGrid.material.opacity = 0.85;
  group.add(threeGrid);

  // Axes Helper at Three.js Origin (0,0,0) - Red=X, Green=Y, Blue=Z
  const axesHelper = new THREE.AxesHelper(1.5);
  axesHelper.position.set(0, 0.002, 0);
  axesHelper.name = 'threeAxesHelper';
  group.add(axesHelper);

  // 2. 8th WALL SLAM SURFACE PLANE GRID (Electric Cyan Blue #06B6D4)
  const slamGrid = new THREE.GridHelper(10, 40, 0x06b6d4, 0x0284c7);
  slamGrid.position.set(0, 0.003, 0);
  slamGrid.name = 'slamSurfaceGridMesh';
  slamGrid.material.depthTest = true;
  slamGrid.material.transparent = true;
  slamGrid.material.opacity = 0.85;
  group.add(slamGrid);

  group.visible = true;
  return group;
}

/**
 * Helper: Create Three.js Ground Target Selection Ring Indicator
 * Layered strictly UNDER 3D model feet (renderOrder: -10, polygonOffset)
 */
export function createGroundTargetRing() {
  const THREE = getTHREE();
  if (!THREE) return null;

  const group = new THREE.Group();
  group.name = 'arGroundTargetRing';
  group.renderOrder = -10;

  // Outer ring
  const ringGeo = new THREE.RingGeometry(0.48, 0.58, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.renderOrder = -10;
  group.add(ringMesh);

  // Inner pulsing translucent disc
  const discGeo = new THREE.CircleGeometry(0.45, 32);
  discGeo.rotateX(-Math.PI / 2);
  const discMat = new THREE.MeshBasicMaterial({
    color: 0x2563eb,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const discMesh = new THREE.Mesh(discGeo, discMat);
  discMesh.renderOrder = -10;
  group.add(discMesh);

  group.visible = false;
  return { group, ringMat, discMat };
}
