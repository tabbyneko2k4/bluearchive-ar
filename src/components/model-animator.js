/**
 * Custom A-Frame Component: Model Animator
 * Integrates Blue Archive Character_Mouth_High atlas (61 mouth shapes).
 * Handles animation playback, pickup transitions, and 61-shape HD mouth expressions.
 */
import { getTHREE } from '../utils/three-helpers';

// Presets for the 61 mouth shapes from Character_Mouth_High-BgFqI_9W.png
export const MOUTH_PRESETS = {
  IDLE_SMILE: 0,      // Closed gentle smile (Row 0, Col 0)
  TALKING: 1,         // Normal speaking open mouth (Row 0, Col 1)
  SMILE_OPEN: 2,      // Smile with upper teeth (Row 0, Col 2)
  SURPRISED_O: 3,     // Small round 'O' mouth (Row 0, Col 3)
  HAPPY_TALK: 4,      // Happy open smile (Row 0, Col 4)
  WIDE_LAUGH: 17,     // Wide cheerful laugh (Row 2, Col 1)
  PANIC_SHOUT: 33,    // Screaming / panicking mouth for pickup (Row 4, Col 1)
  BIG_CRY: 25,        // Wide shouting mouth (Row 3, Col 1)
  POUT: 14            // Pouting small line (Row 1, Col 6)
};

if (typeof AFRAME !== 'undefined' && !AFRAME.components['model-animator']) {
  AFRAME.registerComponent('model-animator', {
    schema: {
      idleList: {
        type: 'array',
        default: ['CH0145_Formation_Idle', 'CH0145_Cafe_Idle', 'CH0145_Normal_Idle']
      },
      defaultIdle: {
        type: 'string',
        default: 'CH0145_Formation_Idle'
      },
      pickupClip: {
        type: 'string',
        default: 'CH0145_Formation_Pickup'
      },
      atlasSrc: {
        type: 'string',
        default: './assets/common/mouths/Character_Mouth_High-BgFqI_9W.png'
      },
      atlasExtraSrc: {
        type: 'string',
        default: './assets/common/mouths/All_Mouths_Transparent.png'
      },
      idleMouthIndex: {
        type: 'number',
        default: MOUTH_PRESETS.IDLE_SMILE // 0
      },
      pickupMouthIndex: {
        type: 'number',
        default: MOUTH_PRESETS.PANIC_SHOUT // 33
      },
      mouthStyle: {
        type: 'string',
        default: 'dynamic' // 'dynamic' | 'fixed'
      },
      currentMouthIndex: {
        type: 'number',
        default: 0
      },
      crossFadeDuration: {
        type: 'number',
        default: 0.25
      },
      mouthTimelines: {
        type: 'string',
        default: ''
      }
    },

    init: function () {
      this.mixer = null;
      this.clips = {};
      this.currentAction = null;
      this.currentClipName = '';
      this.currentIdleName = '';
      this.isDragging = false;
      this.modelLoaded = false;
      this.mouthMaterials = [];
      this.mouthMeshes = [];
      this.atlasImage = null;
      this.atlasLoaded = false;
      this.mouthCanvas = null;
      this.mouthCtx = null;
      this.mouthTexture = null;
      this.activeMouthIndex = this.data.currentMouthIndex || this.data.idleMouthIndex;

      // Animation mouth timeline mappings (passed dynamically from model config)
      this.animationMouthTimelines = {};
      if (this.data.mouthTimelines) {
        try {
          const parsed = typeof this.data.mouthTimelines === 'string'
            ? JSON.parse(this.data.mouthTimelines)
            : this.data.mouthTimelines;
          if (parsed && typeof parsed === 'object') {
            this.animationMouthTimelines = parsed;
          }
        } catch (e) {
          console.warn('[model-animator] Failed to parse mouthTimelines', e);
        }
      }

      // Check localStorage for runtime overrides (key = anim_mouth_<clipName>)
      try {
        Object.keys(this.animationMouthTimelines).forEach((clipName) => {
          const saved = localStorage.getItem(`anim_mouth_${clipName}`) || localStorage.getItem(`miyu_mouth_${clipName}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.animationMouthTimelines[clipName] = parsed;
            }
          }
        });
      } catch (e) {}

      this.onModelLoaded = this.onModelLoaded.bind(this);
      this.onDragStart = this.onDragStart.bind(this);
      this.onDragEnd = this.onDragEnd.bind(this);

      this.el.addEventListener('model-loaded', this.onModelLoaded);
      this.el.addEventListener('dragstart', this.onDragStart);
      this.el.addEventListener('dragend', this.onDragEnd);

      // Pre-load the Character_Mouth_High atlas
      this.loadMouthAtlas();

      // Check if mesh is already present (e.g. cached or synchronous)
      if (this.el.getObject3D('mesh')) {
        this.onModelLoaded({ detail: { model: this.el.getObject3D('mesh') } });
      }
    },

    play: function () {
      if (!this.modelLoaded && this.el.getObject3D('mesh')) {
        this.onModelLoaded({ detail: { model: this.el.getObject3D('mesh') } });
      }
    },

    loadMouthAtlas: function () {
      const THREE = getTHREE();
      if (!THREE) return;

      this.mouthCanvas = document.createElement('canvas');
      this.mouthCanvas.width = 256;
      this.mouthCanvas.height = 256;
      this.mouthCtx = this.mouthCanvas.getContext('2d');

      this.mouthTexture = new THREE.CanvasTexture(this.mouthCanvas);
      this.mouthTexture.flipY = false;

      // Immediately render placeholder smile so frame 0 has a mouth
      this.renderMouthToCanvas(this.activeMouthIndex);

      this.atlasImage = new Image();
      this.atlasImage.crossOrigin = 'anonymous';

      this.atlasImage.onload = () => {
        this.atlasLoaded = true;
        console.log(`[model-animator] Character_Mouth_High atlas loaded: ${this.atlasImage.width}x${this.atlasImage.height}`);
        this.setMouthShapeIndex(this.activeMouthIndex);
      };

      this.atlasImage.onerror = () => {
        console.warn(`[model-animator] Could not load from ${this.atlasImage.src}, trying alternate path...`);
        const alt = './assets/common/mouths/Character_Mouth_High-BgFqI_9W.png';
        if (this.atlasImage.src !== alt) {
          this.atlasImage.src = alt;
        }
      };

      this.atlasImage.src = this.data.atlasSrc || './assets/common/mouths/Character_Mouth_High-BgFqI_9W.png';

      // Load Extra UI Transparent Mouth Atlas
      this.atlasExtraImage = new Image();
      this.atlasExtraImage.crossOrigin = 'anonymous';
      this.atlasExtraImage.onload = () => {
        this.atlasExtraLoaded = true;
        console.log(`[model-animator] Extra UI mouth atlas loaded: ${this.atlasExtraImage.width}x${this.atlasExtraImage.height}`);
        if (typeof this.activeMouthIndex === 'string' && this.activeMouthIndex.startsWith('e')) {
          this.setMouthShapeIndex(this.activeMouthIndex);
        }
      };
      this.atlasExtraImage.src = this.data.atlasExtraSrc || './assets/common/mouths/All_Mouths_Transparent.png';
    },

    findMouthMaterials: function (model) {
      this.mouthMaterials = [];
      this.mouthMeshes = [];

      model.traverse((child) => {
        if (child.isMesh && child.material) {
          // Check if this mesh belongs to CH0145_Face_Outline (these are EYES - DO NOT TOUCH!)
          const isFaceOutline = child.name.includes('Face_Outline') || (child.parent && child.parent.name.includes('Face_Outline'));
          if (isFaceOutline) {
            child.userData.isEyeMesh = true;
            return;
          }

          // In CH0145_Body, the mouth primitive has 96 indices (25 vertices)
          // and its material in glTF is named CH0145_EyeMouth
          const idxCount = child.geometry?.index ? child.geometry.index.count : 0;
          const currentMats = Array.isArray(child.material) ? child.material : [child.material];
          const hasEyeMouthMat = currentMats.some(m => m && (m.name === 'CH0145_EyeMouth' || m.name === 'CH0145_Mouth_Dynamic'));

          const isMouthMesh = idxCount === 96 || (hasEyeMouthMat && !isFaceOutline);

          if (isMouthMesh) {
            child.userData.isMouthMesh = true;

            // CLONE the material so mouth texture NEVER touches or overrides the eye material!
            if (!child.userData.hasClonedMouthMat) {
              const baseMat = Array.isArray(child.material) ? child.material[0] : child.material;
              const clonedMat = baseMat.clone ? baseMat.clone() : Object.assign({}, baseMat);
              clonedMat.name = 'CH0145_Mouth_Dynamic';
              child.material = clonedMat;
              child.userData.hasClonedMouthMat = true;
            }

            const currentMat = child.material;
            if (!this.mouthMaterials.includes(currentMat)) {
              this.mouthMaterials.push(currentMat);
            }
            if (!this.mouthMeshes.includes(child)) {
              this.mouthMeshes.push(child);
            }
          }
        }
      });

      console.log(`[model-animator] Bound ${this.mouthMaterials.length} dedicated mouth materials (eyes preserved 100%)`);
    },

    onModelLoaded: function (e) {
      const THREE = getTHREE();
      const model = e?.detail?.model || this.el.getObject3D('mesh');
      if (!model || !THREE) return;
      this.modelLoaded = true;

      // 1. Initialize Animation Mixer and catalog clips
      const animations = model.animations || (e?.detail?.model && e.detail.model.animations) || [];
      if (animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(model);
        this.clips = {};
        animations.forEach((clip) => {
          this.clips[clip.name] = clip;
        });
        console.log(`[model-animator] Loaded ${animations.length} clips for ${this.el.id}`);

        // Pick a random idle animation on spawn
        this.currentIdleName = this.pickRandomIdle(false);
        this.playClip(this.currentIdleName, true);
      }

      // 2. Locate mouth materials
      this.findMouthMaterials(model);

      // 3. Apply mouth shape
      this.setMouthShapeIndex(this.activeMouthIndex);
    },

    /**
     * Renders mouth shape onto the 256x256 offscreen canvas
     * Supports standard atlas (0..60) and Extra UI transparent atlas ('e0'..'e129')
     */
    renderMouthToCanvas: function (val) {
      if (!this.mouthCtx) return;
      const ctx = this.mouthCtx;
      ctx.clearRect(0, 0, 256, 256);

      const isExtra = typeof val === 'string' && val.startsWith('e');
      if (isExtra) {
        const extraIdx = Math.max(0, Math.min(129, parseInt(val.substring(1), 10) || 0));
        if (this.atlasExtraLoaded && this.atlasExtraImage && this.atlasExtraImage.complete) {
          const col = extraIdx % 12;
          const row = Math.floor(extraIdx / 12);
          const sx = col * 128;
          const sy = row * 128;

          // Scale 128x128 cell by 0.25 to 32x32 centered inside 64x64 slots
          ctx.drawImage(this.atlasExtraImage, sx, sy, 128, 128, 16, 16, 32, 32);
          ctx.drawImage(this.atlasExtraImage, sx, sy, 128, 128, 16, 208, 32, 32);
        }
      } else {
        const numIdx = Math.max(0, Math.min(60, parseInt(val, 10) || 0));
        if (this.atlasLoaded && this.atlasImage && this.atlasImage.complete) {
          const col = numIdx % 8;
          const row = Math.floor(numIdx / 8);
          const sx = col * 256;
          const sy = row * 256;

          // Draw into both top-left (0, 0, 64, 64) and bottom-left (0, 192, 64, 64)
          ctx.drawImage(this.atlasImage, sx, sy, 256, 256, 0, 0, 64, 64);
          ctx.drawImage(this.atlasImage, sx, sy, 256, 256, 0, 192, 64, 64);
        } else {
          // Fallback procedural mouth curve while atlas loads
          ctx.save();
          ctx.strokeStyle = '#5a1924';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          // Top slot
          ctx.beginPath();
          ctx.arc(32, 28, 12, 0.2 * Math.PI, 0.8 * Math.PI, false);
          ctx.stroke();
          // Bottom slot
          ctx.beginPath();
          ctx.arc(32, 220, 12, 0.2 * Math.PI, 0.8 * Math.PI, false);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (this.mouthTexture) {
        this.mouthTexture.needsUpdate = true;
      }
    },

    /**
     * Sets any mouth shape: Standard (0..60) or Extra UI ('e0'..'e129')
     */
    setMouthShapeIndex: function (val) {
      const THREE = getTHREE();
      const isExtra = typeof val === 'string' && val.startsWith('e');
      if (isExtra) {
        const num = parseInt(val.substring(1), 10) || 0;
        this.activeMouthIndex = `e${Math.max(0, Math.min(129, num))}`;
      } else {
        const num = parseInt(val, 10);
        this.activeMouthIndex = isNaN(num) ? 0 : Math.max(0, Math.min(60, num));
      }

      this.renderMouthToCanvas(this.activeMouthIndex);

      // Re-find mouth materials if list is empty
      if (this.mouthMaterials.length === 0 && this.el.getObject3D('mesh')) {
        this.findMouthMaterials(this.el.getObject3D('mesh'));
      }

      // Apply to all mouth materials
      this.mouthMaterials.forEach((mat) => {
        if (!mat) return;
        mat.map = this.mouthTexture;
        mat.transparent = true;
        mat.opacity = 1.0;
        mat.visible = true;
        mat.depthWrite = true;
        mat.alphaTest = 0.02;
        if (THREE && THREE.DoubleSide) {
          mat.side = THREE.DoubleSide;
        }
        mat.needsUpdate = true;
      });

      console.log(`[model-animator] Active mouth shape ${this.activeMouthIndex} applied to ${this.mouthMaterials.length} materials`);
    },

    pickRandomIdle: function (excludeCurrent = false) {
      const idles = this.data.idleList;
      if (Array.isArray(idles) && idles.length > 0) {
        let pool = idles.map(s => s.trim()).filter(name => this.clips[name]);
        if (pool.length === 0) pool = idles;
        // Prefer picking a different idle if there are multiple options
        if (excludeCurrent && pool.length > 1 && this.currentIdleName) {
          const filtered = pool.filter(name => name !== this.currentIdleName);
          if (filtered.length > 0) pool = filtered;
        }
        const randomIdle = pool[Math.floor(Math.random() * pool.length)];
        return randomIdle || this.data.defaultIdle;
      }
      return this.data.defaultIdle;
    },

    playClip: function (clipName, loop = true) {
      if (!this.mixer || !clipName) return;

      const THREE = getTHREE();
      const clip = this.clips[clipName];
      if (!clip) {
        console.warn(`[model-animator] Animation clip "${clipName}" not found in model!`);
        return;
      }

      const newAction = this.mixer.clipAction(clip);
      if (loop) {
        newAction.setLoop(THREE.LoopRepeat, Infinity);
        newAction.clampWhenFinished = false;
      } else {
        newAction.setLoop(THREE.LoopOnce, 1);
        newAction.clampWhenFinished = true;
      }

      if (this.currentAction && this.currentAction !== newAction) {
        newAction.reset();
        newAction.fadeIn(this.data.crossFadeDuration);
        this.currentAction.fadeOut(this.data.crossFadeDuration);
        newAction.play();
      } else {
        newAction.reset();
        newAction.play();
      }

      this.currentAction = newAction;
      this.currentClipName = clipName;
    },

    onDragStart: function () {
      this.isDragging = true;
      const pickup = this.data.pickupClip;
      if (pickup && this.clips[pickup]) {
        this.playClip(pickup, true);
      }

      // In dynamic mode: if animation has custom mouth timeline, let tick handle it; otherwise fallback to panic shout
      if (this.data.mouthStyle === 'dynamic') {
        const hasTimeline = this.animationMouthTimelines && this.animationMouthTimelines[pickup];
        if (!hasTimeline) {
          this.setMouthShapeIndex(this.data.pickupMouthIndex || MOUTH_PRESETS.PANIC_SHOUT);
        }
      }
    },

    onDragEnd: function () {
      this.isDragging = false;

      // Randomize to a new idle animation after each pickup/drop
      this.currentIdleName = this.pickRandomIdle(true);
      if (this.currentIdleName) {
        this.playClip(this.currentIdleName, true);
        console.log(`[model-animator] Switched to new random idle after drop: ${this.currentIdleName}`);
        if (window.pixelHUD && window.pixelHUD.showToast) {
          window.pixelHUD.showToast(`IDLE: ${this.currentIdleName}`, 'blue');
        }
      }

      // In dynamic mode, automatically return to gentle closed smile (#00)
      if (this.data.mouthStyle === 'dynamic') {
        this.setMouthShapeIndex(this.data.idleMouthIndex || MOUTH_PRESETS.IDLE_SMILE);
      }
    },

    tick: function (time, timeDelta) {
      if (!this.mixer || !timeDelta) return;
      this.mixer.update(timeDelta / 1000);

      // Dynamically evaluate keyframed mouth expression along the animation timeline
      if (this.currentClipName && this.animationMouthTimelines && this.animationMouthTimelines[this.currentClipName]) {
        const timeline = this.animationMouthTimelines[this.currentClipName];
        if (timeline && timeline.length > 0 && this.currentAction) {
          const clip = this.currentAction.getClip();
          const duration = clip ? clip.duration : 1;
          const t = duration > 0 ? (this.currentAction.time % duration) : this.currentAction.time;

          let activeKF = timeline[0];
          for (let i = 0; i < timeline.length; i++) {
            if (t >= timeline[i].time - 0.001) {
              activeKF = timeline[i];
            } else {
              break;
            }
          }
          if (activeKF && String(activeKF.mouth) !== String(this.activeMouthIndex)) {
            this.setMouthShapeIndex(activeKF.mouth);
          }
        }
      }
    },

    remove: function () {
      this.el.removeEventListener('model-loaded', this.onModelLoaded);
      this.el.removeEventListener('dragstart', this.onDragStart);
      this.el.removeEventListener('dragend', this.onDragEnd);
      if (this.mixer) {
        this.mixer.stopAllAction();
        this.mixer = null;
      }
      if (this.mouthTexture) {
        this.mouthTexture.dispose();
      }
    }
  });
}
