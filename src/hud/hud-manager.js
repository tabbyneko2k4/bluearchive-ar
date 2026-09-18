/**
 * Core Pixel HUD & AR Controller Manager
 * Orchestrates HUD UI layout, bento grid tabs, AR object spawning/swapping/despawning,
 * light intensity, flat shader toggling, and debug coordinate grids.
 */

import { MODEL_CONFIGS } from '../config/models.config';
import {
  getGroundIntersectionFromScreen,
  applyFlatShaderToMesh,
  createDualDebugGrids
} from '../utils/three-helpers';
import { ConsoleManager } from './console-manager';
import { getHUDHTMLTemplate } from './hud-ui';
import { CharacterAudioManager } from '../audio/character-audio-manager';

// Ensure custom A-Frame components are registered
import '../components/three-ar-drag';
import '../components/model-animator';

export class PixelHUDManager {
  constructor() {
    this.models = MODEL_CONFIGS;
    this.activeModelId = (this.models && this.models.length > 0) ? this.models[0].id : null;
    this.audioManager = new CharacterAudioManager({
      onToast: (msg, type) => this.showToast(msg, type)
    });
    this.hudVisible = true;
    this.drawerOpen = false;
    this.activeTab = 'models';
    this.autoHideEnabled = true;
    this.autoHideTimer = null;
    this.toastTimer = null;

    // Lighting, Shader & Debug States
    this.lightsEnabled = true;
    this.lightIntensity = 1.2;
    this.flatShader = true;
    this.debugGridsEnabled = false;
    this.debugGridsGroup = null;

    // Selected object transform state
    this.transformState = {
      scale: 1.0,
      posY: 0,
      posZ: 0,
      posX: 0,
      rotY: 0
    };

    // Remote Console Log Manager
    this.consoleManager = new ConsoleManager((msg, type) => this.showToast(msg, type));

    this.init();
  }

  get consoleLogs() {
    return this.consoleManager.consoleLogs;
  }

  get remoteConsoleVisible() {
    return this.consoleManager.remoteConsoleVisible;
  }

  init() {
    this.consoleManager.setupConsoleInterceptor();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.buildUI());
    } else {
      this.buildUI();
    }
  }

  buildUI() {
    if (!document.querySelector('link[href*="hud.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './assets/css/hud.css';
      document.head.appendChild(link);
    }

    let overlay = document.getElementById('mobile-ui-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mobile-ui-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = getHUDHTMLTemplate();

    this.populateAssetsTag();
    this.attachEventListeners();
    this.updateAudioButtonUI();
    this.renderModelsList();
    this.resetAutoHideTimer();
    this.showToast('BLUE ARCHIVE AR READY', 'blue');
    this.setupAFrameListeners();
    this.initDebugGrids();
  }

  populateAssetsTag() {
    const scene = document.querySelector('a-scene');
    if (!scene) return;
    let assets = scene.querySelector('a-assets');
    if (!assets) {
      assets = document.createElement('a-assets');
      scene.prepend(assets);
    }
    this.models.forEach((model) => {
      const assetId = `model-${model.id}`;
      if (!document.getElementById(assetId)) {
        const item = document.createElement('a-asset-item');
        item.setAttribute('id', assetId);
        item.setAttribute('src', model.src);
        assets.appendChild(item);
      }
    });
  }

  initDebugGrids() {
    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) return;

    const attach = () => {
      if (sceneEl.object3D && !sceneEl.object3D.getObjectByName('dualDebugGridsGroup')) {
        this.debugGridsGroup = createDualDebugGrids();
        if (this.debugGridsGroup) {
          sceneEl.object3D.add(this.debugGridsGroup);
        }
        this.updateDebugGridsVisibility();
      }
    };

    if (sceneEl.hasLoaded) {
      attach();
    } else {
      sceneEl.addEventListener('loaded', attach, { once: true });
    }
  }

  updateDebugGridsVisibility() {
    if (this.debugGridsGroup) {
      this.debugGridsGroup.visible = this.debugGridsEnabled;
    }
    const badge = document.getElementById('status-debug-grid');
    if (badge) {
      badge.textContent = this.debugGridsEnabled ? 'DEBUG GRIDS ON' : 'DEBUG GRIDS OFF';
      badge.className = `status-badge ${this.debugGridsEnabled ? 'yellow' : 'blue'}`;
    }
    const lbl = document.getElementById('lbl-debug-grids-status');
    if (lbl) {
      lbl.textContent = this.debugGridsEnabled ? 'ON' : 'OFF';
    }
  }

  toggleDebugGrids() {
    this.debugGridsEnabled = !this.debugGridsEnabled;
    this.updateDebugGridsVisibility();
    this.showToast(`DEBUG GRIDS: ${this.debugGridsEnabled ? 'ENABLED' : 'DISABLED'}`);
  }

  renderModelsList() {
    const container = document.getElementById('models-list');
    if (!container) return;

    const anyPlaced = this.models.some(m => m.placed);

    container.innerHTML = this.models.map((model) => {
      const isPlaced = model.placed;
      return `
        <div class="model-card ${isPlaced ? 'placed' : ''}" data-model-id="${model.id}">
          <div class="model-info">
            <div class="model-icon">
              ${model.iconSvg}
            </div>
            <div class="model-details">
              <span class="model-title">${model.name}</span>
              <span class="model-subtitle">${model.subtitle}</span>
            </div>
          </div>
          <div class="model-actions">
            ${
              isPlaced
                ? `
                <button class="despawn-btn" data-action="toggle" data-id="${model.id}" title="Tap to remove object">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  DESPAWN
                </button>
              `
                : `
                <button class="spawn-btn" data-action="toggle" data-id="${model.id}">
                  ${anyPlaced ? 'SWAP' : 'SPAWN'}
                </button>
              `
            }
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-action="toggle"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.spawnModelById(id);
      });
    });

    const placedCount = this.models.filter(m => m.placed).length;
    const countBadge = document.getElementById('status-count');
    if (countBadge) {
      countBadge.textContent = `SPAWNED ${placedCount}/1 MAX`;
      countBadge.className = `status-badge ${placedCount === 1 ? 'yellow' : 'blue'}`;
    }
  }

  updateAudioButtonUI() {
    const btn = document.getElementById('btn-toggle-audio');
    if (!btn) return;
    const isMuted = this.audioManager.isMuted;
    const unmutedIcon = btn.querySelector('.audio-icon-unmuted');
    const mutedIcon = btn.querySelector('.audio-icon-muted');

    if (isMuted) {
      btn.classList.add('muted');
      btn.setAttribute('title', 'Unmute Character Audio');
      if (unmutedIcon) unmutedIcon.classList.add('hidden');
      if (mutedIcon) mutedIcon.classList.remove('hidden');
    } else {
      btn.classList.remove('muted');
      btn.setAttribute('title', 'Mute Character Audio');
      if (unmutedIcon) unmutedIcon.classList.remove('hidden');
      if (mutedIcon) mutedIcon.classList.add('hidden');
    }
  }

  attachEventListeners() {
    document.getElementById('mobile-ui-overlay').addEventListener('pointerdown', () => {
      this.resetAutoHideTimer();
    });

    const btnToggleAudio = document.getElementById('btn-toggle-audio');
    if (btnToggleAudio) {
      btnToggleAudio.addEventListener('click', () => {
        const isMuted = this.audioManager.toggleMute();
        this.updateAudioButtonUI();
        this.showToast(`SOUND: ${isMuted ? 'MUTED' : 'UNMUTED'}`, isMuted ? 'yellow' : 'green');
      });
    }

    document.getElementById('btn-toggle-hud').addEventListener('click', () => {
      this.setHUDVisibility(false);
    });

    document.getElementById('hud-show-fab').addEventListener('click', () => {
      this.setHUDVisibility(true);
    });

    document.querySelectorAll('.bento-tab-btn').forEach((tabBtn) => {
      tabBtn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    document.getElementById('btn-close-drawer').addEventListener('click', () => {
      this.toggleDrawer(false);
    });

    document.getElementById('dock-btn-spawn').addEventListener('click', () => {
      this.switchTab('models');
      this.toggleDrawer(true);
    });

    document.getElementById('dock-btn-recenter').addEventListener('click', () => {
      this.recenterScene();
    });

    document.getElementById('dock-btn-lights').addEventListener('click', () => {
      this.toggleLights();
    });

    document.getElementById('dock-btn-controls').addEventListener('click', () => {
      this.toggleDrawer();
    });

    const inputScale = document.getElementById('input-scale');
    const inputPosY = document.getElementById('input-pos-y');
    const inputPosZ = document.getElementById('input-pos-z');
    const inputRotY = document.getElementById('input-rot-y');

    inputScale.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.transformState.scale = val;
      document.getElementById('val-scale').textContent = `${val.toFixed(1)}x`;
      this.applyTransformToActive();
    });

    inputPosY.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.transformState.posY = val;
      document.getElementById('val-pos-y').textContent = `${val.toFixed(1)}m`;
      this.applyTransformToActive();
    });

    inputPosZ.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.transformState.posZ = val;
      document.getElementById('val-pos-z').textContent = `${val.toFixed(1)}m`;
      this.applyTransformToActive();
    });

    inputRotY.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.transformState.rotY = val;
      document.getElementById('val-rot-y').textContent = `${val}°`;
      this.applyTransformToActive();
    });

    const inputMouth = document.getElementById('input-mouth-shape');
    if (inputMouth) {
      inputMouth.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.setMouthShape(val);
      });
    }

    document.querySelectorAll('.quick-mouth-presets button').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const val = parseInt(e.currentTarget.getAttribute('data-mouth'), 10);
        if (inputMouth) inputMouth.value = val;
        this.setMouthShape(val);
      });
    });

    document.getElementById('btn-toggle-lights').addEventListener('click', () => {
      this.toggleLights();
    });

    document.getElementById('btn-toggle-shader').addEventListener('click', () => {
      this.flatShader = !this.flatShader;
      document.getElementById('lbl-shader-status').textContent = this.flatShader ? 'FLAT' : 'PBR';
      this.showToast(`SHADER: ${this.flatShader ? 'FLAT UNLIT' : 'PBR STANDARD'}`);
      this.applyShaderToModels();
    });

    document.getElementById('input-light-intensity').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.lightIntensity = val;
      document.getElementById('val-light-intensity').textContent = val.toFixed(1);
      this.updateLightIntensity();
    });

    document.getElementById('btn-toggle-debug-grids').addEventListener('click', () => {
      this.toggleDebugGrids();
    });

    document.getElementById('btn-recenter-system').addEventListener('click', () => {
      this.recenterScene();
    });

    document.getElementById('btn-reset-all').addEventListener('click', () => {
      this.resetAllModels();
    });

    document.getElementById('btn-toggle-autohide').addEventListener('click', () => {
      this.autoHideEnabled = !this.autoHideEnabled;
      document.getElementById('lbl-autohide').textContent = this.autoHideEnabled ? 'ENABLED' : 'DISABLED';
      this.showToast(`AUTO-HIDE ${this.autoHideEnabled ? 'ENABLED' : 'DISABLED'}`);
      if (!this.autoHideEnabled && this.autoHideTimer) {
        clearTimeout(this.autoHideTimer);
      } else {
        this.resetAutoHideTimer();
      }
    });

    const btnToggleInstructions = document.getElementById('btn-toggle-instructions');
    if (btnToggleInstructions) {
      btnToggleInstructions.addEventListener('click', () => {
        this.toggleInstructions();
      });
    }

    const btnCloseInstructions = document.getElementById('btn-close-instructions');
    if (btnCloseInstructions) {
      btnCloseInstructions.addEventListener('click', () => {
        this.toggleInstructions(false);
      });
    }

    const btnAckInstructions = document.getElementById('btn-ack-instructions');
    if (btnAckInstructions) {
      btnAckInstructions.addEventListener('click', () => {
        this.toggleInstructions(false);
      });
    }

    const btnToggleRemoteConsole = document.getElementById('btn-toggle-remote-console');
    if (btnToggleRemoteConsole) {
      btnToggleRemoteConsole.addEventListener('click', () => {
        this.consoleManager.toggleRemoteConsole();
      });
    }

    const btnClearConsole = document.getElementById('btn-clear-console');
    if (btnClearConsole) btnClearConsole.addEventListener('click', () => this.consoleManager.clearConsoleLogs());

    const btnCopyConsole = document.getElementById('btn-copy-console');
    if (btnCopyConsole) btnCopyConsole.addEventListener('click', () => this.consoleManager.copyConsoleLogs());

    const btnFloatingClear = document.getElementById('btn-floating-clear');
    if (btnFloatingClear) btnFloatingClear.addEventListener('click', () => this.consoleManager.clearConsoleLogs());

    const btnFloatingCopy = document.getElementById('btn-floating-copy');
    if (btnFloatingCopy) btnFloatingCopy.addEventListener('click', () => this.consoleManager.copyConsoleLogs());

    const btnFloatingClose = document.getElementById('btn-floating-close');
    if (btnFloatingClose) btnFloatingClose.addEventListener('click', () => this.consoleManager.toggleRemoteConsole(false));
  }

  toggleInstructions(forceState) {
    const modal = document.getElementById('instruction-modal');
    if (!modal) return;
    const isHidden = modal.classList.contains('hidden');
    const show = forceState !== undefined ? forceState : isHidden;
    if (show) {
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.bento-tab-btn').forEach((btn) => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.bento-panel').forEach((panel) => {
      if (panel.id === `panel-${tabName}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });
  }

  toggleDrawer(forceState) {
    this.drawerOpen = forceState !== undefined ? forceState : !this.drawerOpen;
    const drawer = document.getElementById('bento-drawer');
    const controlsBtn = document.getElementById('dock-btn-controls');

    if (this.drawerOpen) {
      drawer.classList.remove('closed');
      controlsBtn.classList.add('active');
    } else {
      drawer.classList.add('closed');
      controlsBtn.classList.remove('active');
    }
  }

  setHUDVisibility(visible) {
    this.hudVisible = visible;
    const topBar = document.getElementById('hud-top-bar');
    const dock = document.getElementById('mobile-dock');
    const fab = document.getElementById('hud-show-fab');

    if (visible) {
      topBar.classList.remove('hidden');
      dock.classList.remove('hidden');
      fab.classList.add('hidden');
      this.resetAutoHideTimer();
    } else {
      topBar.classList.add('hidden');
      dock.classList.add('hidden');
      fab.classList.remove('hidden');
      this.toggleDrawer(false);
    }
  }

  resetAutoHideTimer() {
    if (!this.autoHideEnabled) return;
    if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
    this.autoHideTimer = setTimeout(() => {
      if (this.hudVisible && !this.drawerOpen) {
        this.setHUDVisibility(false);
      }
    }, 5000);
  }

  showToast(message, type = 'normal') {
    const toast = document.getElementById('pixel-toast');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = message;
    toast.className = 'visible';

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.className = 'hidden';
    }, 2500);
  }

  triggerShutterFlash() {
    const flash = document.getElementById('shutter-flash');
    if (!flash) return;
    flash.classList.remove('flash');
    void flash.offsetWidth;
    flash.classList.add('flash');
  }

  getCenterGroundPosition() {
    const scene = document.querySelector('a-scene');
    if (scene && scene.camera) {
      const canvas = scene.canvas || document.body;
      const point = getGroundIntersectionFromScreen(
        window.innerWidth / 2,
        window.innerHeight / 2,
        scene.camera,
        canvas
      );
      if (point) {
        return { x: point.x, y: 0, z: point.z };
      }
    }
    return { x: 0, y: 0, z: -1.5 };
  }

  spawnModelById(modelId, customPosition = null) {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return;

    const currentlyPlaced = this.models.find(m => m.placed);
    if (currentlyPlaced) {
      if (currentlyPlaced.id === modelId) {
        this.removeModelById(modelId);
        return;
      } else {
        this.removeModelById(currentlyPlaced.id);
      }
    }

    const scene = document.querySelector('a-scene');
    if (!scene) {
      console.error('A-Frame scene not found!');
      return;
    }

    const pos = customPosition || this.getCenterGroundPosition();

    const entity = document.createElement('a-entity');
    entity.setAttribute('id', `spawned-entity-${model.id}`);
    entity.setAttribute('gltf-model', model.src);
    entity.setAttribute('class', 'cantap spawned-object');
    entity.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);

    const baseScale = model.scale;
    const finalScaleX = baseScale.x * this.transformState.scale;
    const finalScaleY = baseScale.y * this.transformState.scale;
    const finalScaleZ = baseScale.z * this.transformState.scale;
    entity.setAttribute('scale', `${finalScaleX} ${finalScaleY} ${finalScaleZ}`);
    entity.setAttribute('rotation', `0 ${this.transformState.rotY} 0`);

    entity.setAttribute('three-ar-drag', '');
    entity.setAttribute('xrextras-pinch-scale', 'min: 0.05; max: 20; scale: 0');
    entity.setAttribute('xrextras-one-finger-rotate', 'factor: 6');
    entity.setAttribute('xrextras-two-finger-rotate', 'factor: 5');

    if (model.animations) {
      const mouthCfg = model.mouthConfig || {};
      const timelines = (model.animations && model.animations.timelines) || {};
      entity.setAttribute('model-animator', {
        idleList: model.animations.idleList,
        defaultIdle: model.animations.defaultIdle,
        pickupClip: model.animations.pickup,
        atlasSrc: mouthCfg.atlasSrc || './assets/common/mouths/Character_Mouth_High-BgFqI_9W.png',
        atlasExtraSrc: mouthCfg.atlasExtraSrc || './assets/common/mouths/All_Mouths_Transparent.png',
        idleMouthIndex: mouthCfg.idleMouthIndex ?? 0,
        pickupMouthIndex: mouthCfg.pickupMouthIndex ?? 33,
        mouthStyle: mouthCfg.mouthStyle || 'dynamic',
        currentMouthIndex: mouthCfg.currentMouthIndex ?? 0,
        mouthTimelines: JSON.stringify(timelines)
      });
    }

    entity.addEventListener('model-loaded', () => {
      if (this.flatShader && entity.object3D) {
        applyFlatShaderToMesh(entity.object3D, true);
      }
    });

    // Character voice lines event hooks
    entity.addEventListener('dragstart', () => {
      this.audioManager.startPickup();
    });

    entity.addEventListener('dragend', () => {
      this.audioManager.startIdle({ immediate: false });
    });

    scene.appendChild(entity);

    // Initialize and start character voice audio
    if (model.audio) {
      this.audioManager.loadCharacter(model.audio, model.name);
      this.audioManager.startIdle({ immediate: true });
    }

    const dragComp = entity.components ? entity.components['three-ar-drag'] : null;
    if (dragComp && dragComp.targetPosition) {
      dragComp.targetPosition.set(pos.x, pos.y, pos.z);
    }

    model.placed = true;
    model.entityEl = entity;
    this.activeModelId = model.id;

    this.transformState.posX = pos.x;
    this.transformState.posY = pos.y;
    this.transformState.posZ = pos.z;

    const promptBanner = document.getElementById('spawn-prompt-banner');
    if (promptBanner) promptBanner.classList.add('hidden');

    console.log(`[SPAWNED MODEL] ${model.name} at (${Number(pos.x).toFixed(2)}, ${Number(pos.y).toFixed(2)}, ${Number(pos.z).toFixed(2)})`);
    this.triggerShutterFlash();
    this.showToast(`SPAWNED: ${model.name} AT (${Number(pos.x).toFixed(1)}, ${Number(pos.y).toFixed(1)}, ${Number(pos.z).toFixed(1)})`, 'green');
    this.renderModelsList();
    this.updateMatrixDisplay(pos.x, pos.y, pos.z);
  }

  removeModelById(modelId) {
    const model = this.models.find(m => m.id === modelId);
    if (!model || !model.placed) return;

    // Stop all character voice audio
    this.audioManager.stop();

    if (model.entityEl && model.entityEl.parentNode) {
      model.entityEl.parentNode.removeChild(model.entityEl);
    }

    model.placed = false;
    model.entityEl = null;

    const anyPlaced = this.models.some(m => m.placed);
    if (!anyPlaced) {
      const promptBanner = document.getElementById('spawn-prompt-banner');
      if (promptBanner) promptBanner.classList.remove('hidden');
    }

    this.showToast(`DESPAWNED: ${model.name}`);
    this.renderModelsList();
  }

  resetAllModels() {
    this.audioManager.stop();

    this.models.forEach((m) => {
      if (m.placed && m.entityEl && m.entityEl.parentNode) {
        m.entityEl.parentNode.removeChild(m.entityEl);
      }
      m.placed = false;
      m.entityEl = null;
    });

    const promptBanner = document.getElementById('spawn-prompt-banner');
    if (promptBanner) promptBanner.classList.remove('hidden');

    this.triggerShutterFlash();
    this.showToast('DESPAWNED ALL OBJECTS');
    this.renderModelsList();
  }

  recenterScene() {
    this.triggerShutterFlash();

    const centerPos = this.getCenterGroundPosition();

    this.models.forEach((m) => {
      if (m.placed && m.entityEl) {
        m.entityEl.setAttribute('position', `${centerPos.x} ${centerPos.y} ${centerPos.z}`);
        const dragComp = m.entityEl.components ? m.entityEl.components['three-ar-drag'] : null;
        if (dragComp && dragComp.targetPosition) {
          dragComp.targetPosition.set(centerPos.x, centerPos.y, centerPos.z);
        }
        this.transformState.posX = centerPos.x;
        this.transformState.posY = centerPos.y;
        this.transformState.posZ = centerPos.z;
        this.updateMatrixDisplay(centerPos.x, centerPos.y, centerPos.z);
      }
    });

    this.showToast('AR SCENE RECENTERED AT (0,0,0)');
  }

  applyTransformToActive() {
    const activeModel = this.models.find(m => m.id === this.activeModelId && m.placed) || this.models.find(m => m.placed);

    if (activeModel && activeModel.entityEl) {
      const baseScale = activeModel.scale;
      const s = this.transformState.scale;
      activeModel.entityEl.setAttribute('scale', `${baseScale.x * s} ${baseScale.y * s} ${baseScale.z * s}`);
      activeModel.entityEl.setAttribute('position', `${this.transformState.posX} ${this.transformState.posY} ${this.transformState.posZ}`);
      const dragComp = activeModel.entityEl.components ? activeModel.entityEl.components['three-ar-drag'] : null;
      if (dragComp && dragComp.targetPosition) {
        dragComp.targetPosition.set(this.transformState.posX, this.transformState.posY, this.transformState.posZ);
      }
      activeModel.entityEl.setAttribute('rotation', `0 ${this.transformState.rotY} 0`);

      this.updateMatrixDisplay(this.transformState.posX, this.transformState.posY, this.transformState.posZ);
    }
  }

  setMouthShape(val) {
    const lbl = document.getElementById('val-mouth-shape');
    const presetNames = {
      0: '#00 SMILE',
      1: '#01 TALK',
      2: '#02 SMILE-TEETH',
      3: '#03 O-SHAPE',
      4: '#04 HAPPY',
      17: '#17 LAUGH',
      25: '#25 CRY',
      33: '#33 SHOUT'
    };
    if (lbl) {
      lbl.textContent = presetNames[val] || `#${String(val).padStart(2, '0')}`;
    }
    const activeModel = this.models.find(m => m.placed);
    const entity = (activeModel && activeModel.entityEl) || document.querySelector('.spawned-object');
    if (entity && entity.components) {
      const animator = entity.components['model-animator'];
      if (animator) {
        animator.data.mouthStyle = 'fixed';
        animator.setMouthShapeIndex(val);
      }
    }
  }

  updateMatrixDisplay(x, y, z) {
    const el = document.getElementById('matrix-coords');
    if (el) {
      el.textContent = `X: ${Number(x).toFixed(1)}m | Y: ${Number(y).toFixed(1)}m | Z: ${Number(z).toFixed(1)}m`;
    }
  }

  toggleLights() {
    this.lightsEnabled = !this.lightsEnabled;
    const lights = document.querySelectorAll('a-light');
    lights.forEach((light) => {
      light.setAttribute('visible', this.lightsEnabled);
    });

    const statusLbl = document.getElementById('lbl-lights-status');
    if (statusLbl) statusLbl.textContent = this.lightsEnabled ? 'ON' : 'OFF';

    const dockBtn = document.getElementById('dock-btn-lights');
    if (dockBtn) {
      if (this.lightsEnabled) dockBtn.classList.add('active');
      else dockBtn.classList.remove('active');
    }

    this.showToast(`LIGHTS: ${this.lightsEnabled ? 'ENABLED' : 'DISABLED'}`);
  }

  updateLightIntensity() {
    const directionalLight = document.querySelector('a-light[type="directional"]');
    if (directionalLight) {
      directionalLight.setAttribute('intensity', this.lightIntensity);
    }
    const ambientLight = document.querySelector('a-light[type="ambient"]');
    if (ambientLight) {
      ambientLight.setAttribute('intensity', this.lightIntensity);
    }
  }

  applyShaderToModels() {
    this.models.forEach((m) => {
      if (m.placed && m.entityEl && m.entityEl.object3D) {
        applyFlatShaderToMesh(m.entityEl.object3D, this.flatShader);
      }
    });
  }

  setupAFrameListeners() {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    const getTouchScreenCoords = (e) => {
      let clientX, clientY;
      if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.clientX !== undefined && e.clientY !== undefined) {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return { clientX, clientY };
    };

    const handleTapToSpawn = (e) => {
      if (e.target && e.target.closest && e.target.closest('#mobile-ui-overlay')) return;

      const placedModel = this.models.find(m => m.placed);
      if (placedModel) return;

      const camera = scene.camera;
      const canvas = scene.canvas || document.body;
      const coords = getTouchScreenCoords(e);

      let groundPoint = null;

      if (e.detail && e.detail.intersection && e.detail.intersection.point) {
        groundPoint = e.detail.intersection.point;
      }

      if (!groundPoint && coords.clientX !== undefined && coords.clientY !== undefined && camera && canvas) {
        groundPoint = getGroundIntersectionFromScreen(coords.clientX, coords.clientY, camera, canvas);
      }

      if (!groundPoint) {
        groundPoint = this.getCenterGroundPosition();
      }

      const spawnPos = {
        x: Number(groundPoint.x),
        y: 0,
        z: Number(groundPoint.z)
      };

      console.log(`[TAP SPRAWN] Ground Point: (${spawnPos.x.toFixed(2)}, ${spawnPos.y.toFixed(2)}, ${spawnPos.z.toFixed(2)})`);

      this.spawnModelById(this.activeModelId || 'kazusa', spawnPos);
    };

    scene.addEventListener('click', handleTapToSpawn);
  }
}
