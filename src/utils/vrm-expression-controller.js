/**
 * VRM Expression & Mouth Controller
 * Handles VRM 0.X blendShape groups:
 * - Morph targets on meshes (binds)
 * - Material value swapping and opacity transitions (_Color, alpha)
 * - Mouth vowels (A, I, U, E, O)
 * - Facial expressions (Joy, Angry, Sorrow, Fun, Blink, Smug, Love, etc.)
 * - Auto-blink simulation
 * - Lip-sync / talk chatter simulation
 */

export class VRMExpressionController {
  constructor(gltf, options = {}) {
    this.gltf = gltf;
    this.root = gltf.scene || gltf;
    this.options = options;

    // VRM manifest data
    this.vrmData = (gltf.parser && gltf.parser.json && gltf.parser.json.extensions && gltf.parser.json.extensions.VRM) ||
                   (gltf.userData && gltf.userData.gltfExtensions && gltf.userData.gltfExtensions.VRM) ||
                   null;

    this.blendShapeGroups = (this.vrmData && this.vrmData.blendShapeMaster && this.vrmData.blendShapeMaster.blendShapeGroups) || [];
    this.groupMap = new Map(); // name (lowercase) -> group
    this.presetMap = new Map(); // presetName (lowercase) -> group

    // Cache mesh and material references
    this.meshByIndex = new Map();
    this.meshByName = new Map();
    this.materialsByName = new Map();
    this.baseMaterialStates = new Map(); // mat -> { color, opacity, visible, transparent, depthWrite, alphaTest }

    // Active state weights: groupName -> weight (0..1)
    this.activeWeights = new Map();
    this.currentVowel = null;

    // Timers for auto-blink and lip-sync
    this.autoBlinkActive = false;
    this.autoBlinkTimer = null;
    this.lipSyncActive = false;
    this.lipSyncTimer = null;

    this.init();
  }

  init() {
    this.indexSceneMeshesAndMaterials();
    this.indexBlendShapeGroups();
    this.saveBaseMaterialStates();

    // Default neutral state
    this.resetAll();
  }

  indexSceneMeshesAndMaterials() {
    const gltfMeshes = (this.gltf.parser && this.gltf.parser.json && this.gltf.parser.json.meshes) || [];
    const gltfNodes = (this.gltf.parser && this.gltf.parser.json && this.gltf.parser.json.nodes) || [];
    const meshNameMap = new Map();
    gltfMeshes.forEach((gm, idx) => {
      if (gm.name) meshNameMap.set(gm.name, idx);
    });
    const nodeMeshMap = new Map();
    gltfNodes.forEach((nd) => {
      if (nd.name && nd.mesh !== undefined) nodeMeshMap.set(nd.name, nd.mesh);
    });

    let meshCounter = 0;
    this.root.traverse((obj) => {
      if (obj.isMesh) {
        this.meshByName.set(obj.name, obj);

        // Map by GLTF parser associations, node mesh index, or mesh name
        let gIdx = undefined;
        if (this.gltf.parser && this.gltf.parser.associations) {
          const assoc = this.gltf.parser.associations.get(obj);
          if (assoc && assoc.meshes !== undefined) gIdx = assoc.meshes;
        }
        if (gIdx === undefined && nodeMeshMap.has(obj.name)) {
          gIdx = nodeMeshMap.get(obj.name);
        }
        if (gIdx === undefined && meshNameMap.has(obj.name)) {
          gIdx = meshNameMap.get(obj.name);
        }
        if (gIdx === undefined) {
          gIdx = meshCounter;
        }
        meshCounter++;

        if (!this.meshByIndex.has(gIdx)) {
          this.meshByIndex.set(gIdx, []);
        }
        this.meshByIndex.get(gIdx).push(obj);

        // Cache materials
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((mat) => {
          if (!mat || !mat.name) return;
          if (!this.materialsByName.has(mat.name)) {
            this.materialsByName.set(mat.name, []);
          }
          const list = this.materialsByName.get(mat.name);
          if (!list.includes(mat)) list.push(mat);
        });
      }
    });
  }

  indexBlendShapeGroups() {
    this.blendShapeGroups.forEach((group) => {
      const nameKey = (group.name || '').toLowerCase();
      this.groupMap.set(nameKey, group);
      if (group.presetName) {
        this.presetMap.set(group.presetName.toLowerCase(), group);
      }
    });
  }

  saveBaseMaterialStates() {
    this.materialsByName.forEach((matList, name) => {
      matList.forEach((mat) => {
        // Setup material for smooth alpha swapping
        mat.transparent = true;
        mat.depthWrite = true;
        mat.alphaTest = 0.01;

        let defAlpha = (mat.opacity !== undefined ? mat.opacity : 1.0);
        if (name.startsWith('tex_m_') && name !== 'tex_m_smile') {
          defAlpha = 0.0;
          mat.opacity = 0.0;
          mat.visible = false;
        } else if (name.startsWith('tex_halo_') && name !== 'tex_halo_normal') {
          defAlpha = 0.0;
          mat.opacity = 0.0;
          mat.visible = false;
        } else if (name === 'tex_m_smile' || name === 'tex_halo_normal') {
          defAlpha = 1.0;
          mat.opacity = 1.0;
          mat.visible = true;
        }

        if (!this.baseMaterialStates.has(mat)) {
          this.baseMaterialStates.set(mat, {
            color: mat.color ? mat.color.clone() : null,
            opacity: defAlpha,
            visible: defAlpha > 0.01,
            origAlpha: defAlpha
          });
        }
      });
    });
  }

  /**
   * Find group definition by name or preset name
   */
  findGroup(nameOrPreset) {
    if (!nameOrPreset) return null;
    const key = String(nameOrPreset).toLowerCase().trim();
    return this.groupMap.get(key) || this.presetMap.get(key) || null;
  }

  /**
   * Set expression / blendShape weight (0.0 to 1.0)
   */
  setValue(nameOrPreset, weight = 1.0) {
    const group = this.findGroup(nameOrPreset);
    if (!group) return false;

    const clampedWeight = Math.max(0.0, Math.min(1.0, weight));
    this.activeWeights.set(group.name, clampedWeight);

    // 1. Apply binds (morph targets)
    if (group.binds && group.binds.length > 0) {
      group.binds.forEach((bind) => {
        const meshes = this.meshByIndex.get(bind.mesh);
        if (meshes && meshes.length > 0) {
          meshes.forEach((mesh) => {
            if (mesh.morphTargetInfluences && mesh.morphTargetInfluences.length > bind.index) {
              const targetInfluence = clampedWeight * (bind.weight / 100);
              mesh.morphTargetInfluences[bind.index] = targetInfluence;
            }
          });
        }
      });
    }

    // 2. Apply materialValues
    if (group.materialValues && group.materialValues.length > 0) {
      group.materialValues.forEach((mv) => {
        const mats = this.materialsByName.get(mv.materialName);
        if (!mats) return;

        mats.forEach((mat) => {
          const base = this.baseMaterialStates.get(mat);
          if (!base) return;

          if (mv.propertyName === '_Color' && Array.isArray(mv.targetValue)) {
            const [tr, tg, tb, ta] = mv.targetValue;
            // Target alpha
            const finalAlpha = (1.0 - clampedWeight) * base.origAlpha + clampedWeight * ta;
            mat.opacity = finalAlpha;
            mat.visible = finalAlpha > 0.01;
            mat.needsUpdate = true;

            if (mat.color && (tr > 0 || tg > 0 || tb > 0)) {
              mat.color.setRGB(
                (1.0 - clampedWeight) * base.color.r + clampedWeight * tr,
                (1.0 - clampedWeight) * base.color.g + clampedWeight * tg,
                (1.0 - clampedWeight) * base.color.b + clampedWeight * tb
              );
            }
          }
        });
      });
    }

    return true;
  }

  /**
   * Reset all expressions and mouth vowels to default neutral appearance
   */
  resetAll() {
    this.activeWeights.clear();
    this.currentVowel = null;

    // Reset all morph target influences across all meshes
    this.meshByName.forEach((mesh) => {
      if (mesh.morphTargetInfluences) {
        for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
          mesh.morphTargetInfluences[i] = 0;
        }
      }
    });

    // Reset all materials to base states
    this.baseMaterialStates.forEach((base, mat) => {
      if (base.color && mat.color) mat.color.copy(base.color);
      mat.opacity = base.opacity;
      mat.visible = base.visible;
    });

    // Ensure default smile mouth is visible, others hidden
    this.materialsByName.forEach((mats, name) => {
      if (name.startsWith('tex_m_')) {
        const isDefaultSmile = name === 'tex_m_smile';
        mats.forEach((m) => {
          m.opacity = isDefaultSmile ? 1.0 : 0.0;
          m.visible = isDefaultSmile;
        });
      }
      if (name.startsWith('tex_halo_')) {
        const isDefaultHalo = name === 'tex_halo_normal';
        mats.forEach((m) => {
          m.opacity = isDefaultHalo ? 1.0 : 0.0;
          m.visible = isDefaultHalo;
        });
      }
    });
  }

  /**
   * Set mouth vowel (A, I, U, E, O) or clear
   */
  setMouthVowel(vowel, weight = 1.0) {
    const vowels = ['A', 'I', 'U', 'E', 'O'];

    // Clear other vowels
    vowels.forEach((v) => {
      if (!vowel || v.toUpperCase() !== vowel.toUpperCase()) {
        this.setValue(v, 0.0);
      }
    });

    if (vowel && vowels.includes(vowel.toUpperCase())) {
      this.currentVowel = vowel.toUpperCase();
      this.setValue(this.currentVowel, weight);
    } else {
      this.currentVowel = null;
      // Revert to neutral smile
      const smileMats = this.materialsByName.get('tex_m_smile');
      if (smileMats) {
        smileMats.forEach((m) => {
          m.opacity = 1.0;
          m.visible = true;
          m.needsUpdate = true;
        });
      }
    }
  }

  /**
   * Apply expression preset (e.g., 'joy', 'angry', 'sorrow', 'fun', 'smug', 'blink')
   */
  setExpression(presetOrName, weight = 1.0) {
    // Reset other non-vowel expressions first for clean transition
    const vowels = ['A', 'I', 'U', 'E', 'O'];
    this.blendShapeGroups.forEach((g) => {
      if (!vowels.includes(g.name.toUpperCase())) {
        if (g.name.toLowerCase() !== presetOrName.toLowerCase()) {
          this.setValue(g.name, 0.0);
        }
      }
    });

    return this.setValue(presetOrName, weight);
  }

  /**
   * Get all registered blendshape group names and presets
   */
  getExpressionList() {
    return this.blendShapeGroups.map((g) => ({
      name: g.name,
      preset: g.presetName || 'unknown',
      isVowel: ['A', 'I', 'U', 'E', 'O'].includes(g.name.toUpperCase()),
      bindsCount: (g.binds || []).length,
      materialsCount: (g.materialValues || []).length
    }));
  }

  /**
   * Natural Auto-Blink Loop (simulates lifelike character blinks)
   */
  startAutoBlink() {
    this.stopAutoBlink();
    this.autoBlinkActive = true;

    const performBlink = () => {
      if (!this.autoBlinkActive) return;

      const blinkDuration = 140; // ms
      this.setValue('Blink', 1.0);

      setTimeout(() => {
        if (this.autoBlinkActive) {
          this.setValue('Blink', 0.0);
        }
        // Next blink in 2.5 to 5.5 seconds
        const nextInterval = 2500 + Math.random() * 3000;
        this.autoBlinkTimer = setTimeout(performBlink, nextInterval);
      }, blinkDuration);
    };

    this.autoBlinkTimer = setTimeout(performBlink, 2000);
  }

  stopAutoBlink() {
    this.autoBlinkActive = false;
    clearTimeout(this.autoBlinkTimer);
    this.autoBlinkTimer = null;
    this.setValue('Blink', 0.0);
  }

  /**
   * Lip-Sync / Speech Simulation (cycles vowels naturally)
   */
  startLipSyncTest(speedMs = 180) {
    this.stopLipSyncTest();
    this.lipSyncActive = true;

    const sequence = ['A', 'I', 'U', 'E', 'O', 'A', 'E', 'O', 'Neutral'];
    let seqIdx = 0;

    const cycle = () => {
      if (!this.lipSyncActive) return;
      const target = sequence[seqIdx % sequence.length];
      seqIdx++;

      if (target === 'Neutral') {
        this.setMouthVowel(null);
      } else {
        const weight = 0.6 + Math.random() * 0.4;
        this.setMouthVowel(target, weight);
      }

      const nextDelay = speedMs + (Math.random() * 60 - 30);
      this.lipSyncTimer = setTimeout(cycle, nextDelay);
    };

    cycle();
  }

  stopLipSyncTest() {
    this.lipSyncActive = false;
    clearTimeout(this.lipSyncTimer);
    this.lipSyncTimer = null;
    this.setMouthVowel(null);
  }

  dispose() {
    this.stopAutoBlink();
    this.stopLipSyncTest();
    this.resetAll();
    this.meshByIndex.clear();
    this.meshByName.clear();
    this.materialsByName.clear();
    this.baseMaterialStates.clear();
  }
}

export default VRMExpressionController;
