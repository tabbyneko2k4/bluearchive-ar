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
import {
  getUnifiedCharacterCatalog,
  downloadGLBWithProgress,
  autoDetectBAAnimations,
  FALLBACK_AVATAR
} from '../utils/ba-catalog-service';
import { fetchCharacterVoicesFromWiki } from '../utils/ba-voice-service';

// Ensure custom A-Frame components are registered
import '../components/three-ar-drag';
import '../components/model-animator';

export class PixelHUDManager {
  constructor() {
    this.models = [...MODEL_CONFIGS];
    this.activeModelId = (this.models && this.models.length > 0) ? this.models[0].id : null;
    this.audioManager = new CharacterAudioManager({
      onToast: (msg, type) => this.showToast(msg, type)
    });
    this.hudVisible = true;
    this.drawerOpen = true;
    this.activeTab = 'models';
    this.autoHideEnabled = true;
    this.autoHideTimer = null;
    this.toastTimer = null;

    // Online Kivotos Roster State
    this.rosterTab = 'builtin'; // 'builtin' | 'online'
    this.onlineCatalog = [];
    this.selectedSchool = 'all';
    this.searchQuery = '';
    this.activeBioStudent = null;
    this.isCatalogLoading = false;

    // Lighting, Shader & Debug States
    this.lightsEnabled = true;
    this.lightIntensity = 1.2;
    this.flatShader = true;
    this.debugGridsGroup = null;
    this.mouthMode = 'std'; // 'std' (0..60) or 'extra' ('e0'..'e129')

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

    // Show character selection modal / drawer first on project load
    this.switchTab('models');
    this.toggleDrawer(true);
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

    const dockBtnModels = document.getElementById('dock-btn-models');
    if (dockBtnModels) {
      dockBtnModels.addEventListener('click', () => {
        if (this.drawerOpen && this.activeTab === 'models') {
          this.toggleDrawer(false);
        } else {
          this.switchTab('models');
          this.toggleDrawer(true);
        }
      });
    }

    const dockBtnSpawn = document.getElementById('dock-btn-spawn');
    if (dockBtnSpawn) {
      dockBtnSpawn.addEventListener('click', () => {
        const placed = this.models.find(m => m.placed);
        if (!placed) {
          const idToSpawn = this.activeModelId || (this.models[0] && this.models[0].id);
          if (idToSpawn) {
            this.spawnModelById(idToSpawn);
          }
        } else {
          this.recenterScene();
          this.showToast(`RECENTERED: ${placed.name}`, 'blue');
        }
      });
    }

    document.getElementById('dock-btn-recenter').addEventListener('click', () => {
      this.recenterScene();
    });

    document.getElementById('dock-btn-lights').addEventListener('click', () => {
      this.toggleLights();
    });

    const dockBtnControls = document.getElementById('dock-btn-controls');
    if (dockBtnControls) {
      dockBtnControls.addEventListener('click', () => {
        if (this.drawerOpen && this.activeTab !== 'models') {
          this.toggleDrawer(false);
        } else {
          this.switchTab('telemetry');
          this.toggleDrawer(true);
        }
      });
    }

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

    const btnMouthStd = document.getElementById('btn-mouth-mode-std');
    const btnMouthExtra = document.getElementById('btn-mouth-mode-extra');
    const presetsStd = document.getElementById('presets-mouth-std');
    const presetsExtra = document.getElementById('presets-mouth-extra');
    const inputMouth = document.getElementById('input-mouth-shape');

    if (btnMouthStd && btnMouthExtra) {
      btnMouthStd.addEventListener('click', () => {
        this.mouthMode = 'std';
        btnMouthStd.classList.add('active');
        btnMouthExtra.classList.remove('active');
        if (inputMouth) {
          inputMouth.min = '0';
          inputMouth.max = '60';
          inputMouth.value = '0';
        }
        if (presetsStd) presetsStd.style.display = 'flex';
        if (presetsExtra) presetsExtra.style.display = 'none';
        this.setMouthShape(0);
      });

      btnMouthExtra.addEventListener('click', () => {
        this.mouthMode = 'extra';
        btnMouthExtra.classList.add('active');
        btnMouthStd.classList.remove('active');
        if (inputMouth) {
          inputMouth.min = '0';
          inputMouth.max = '129';
          inputMouth.value = '0';
        }
        if (presetsStd) presetsStd.style.display = 'none';
        if (presetsExtra) presetsExtra.style.display = 'flex';
        this.setMouthShape('e0');
      });
    }

    if (inputMouth) {
      inputMouth.addEventListener('input', (e) => {
        if (this.mouthMode === 'extra') {
          const val = `e${e.target.value}`;
          this.setMouthShape(val);
        } else {
          const val = parseInt(e.target.value, 10);
          this.setMouthShape(val);
        }
      });
    }

    document.querySelectorAll('.quick-mouth-presets button').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const raw = e.currentTarget.getAttribute('data-mouth');
        if (raw && raw.startsWith('e')) {
          if (inputMouth) inputMouth.value = parseInt(raw.substring(1), 10);
          this.setMouthShape(raw);
        } else {
          const val = parseInt(raw, 10);
          if (inputMouth) inputMouth.value = val;
          this.setMouthShape(val);
        }
      });
    });

    // VRM Expressions listeners
    document.querySelectorAll('#presets-vrm-exp button').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const exp = e.currentTarget.getAttribute('data-vrm-exp');
        document.querySelectorAll('#presets-vrm-exp button').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const lbl = document.getElementById('val-vrm-expression');
        if (lbl) lbl.textContent = exp.toUpperCase();
        this.setVRMExpression(exp);
      });
    });

    // VRM Mouth Vowels listeners
    document.querySelectorAll('#presets-vrm-vowels button[data-vrm-vowel]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const vowel = e.currentTarget.getAttribute('data-vrm-vowel') || null;
        document.querySelectorAll('#presets-vrm-vowels button[data-vrm-vowel]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const lbl = document.getElementById('val-vrm-vowel');
        if (lbl) lbl.textContent = vowel ? vowel.toUpperCase() : 'REST';
        this.setVRMVowel(vowel);
      });
    });

    // VRM Talk / Lip-sync toggle
    const btnVrmTalk = document.getElementById('btn-vrm-lip-sync');
    if (btnVrmTalk) {
      btnVrmTalk.addEventListener('click', () => {
        this.toggleVRMLipSync();
      });
    }

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

    // Online Kivotos Roster Subtab Switching
    const tabBuiltin = document.getElementById('tab-roster-builtin');
    const tabOnline = document.getElementById('tab-roster-online');
    if (tabBuiltin && tabOnline) {
      tabBuiltin.addEventListener('click', () => this.switchRosterTab('builtin'));
      tabOnline.addEventListener('click', () => this.switchRosterTab('online'));
    }

    // Search and Filter Events for Online Roster
    const searchInput = document.getElementById('roster-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target.value || '').trim().toLowerCase();
        this.renderOnlineRoster();
      });
    }

    const schoolFilters = document.getElementById('roster-school-filters');
    if (schoolFilters) {
      schoolFilters.querySelectorAll('.school-chip').forEach((chip) => {
        chip.addEventListener('click', (e) => {
          schoolFilters.querySelectorAll('.school-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.selectedSchool = chip.getAttribute('data-school') || 'all';
          this.renderOnlineRoster();
        });
      });
    }

    // Student Bio Modal Events
    const modalBio = document.getElementById('student-bio-modal');
    const btnCloseBio = document.getElementById('btn-close-bio-modal');
    const btnDismissBio = document.getElementById('btn-bio-dismiss');

    const handleDismissBio = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.closeStudentBioModal();
    };

    if (btnCloseBio) {
      btnCloseBio.addEventListener('click', handleDismissBio);
      btnCloseBio.addEventListener('touchend', handleDismissBio);
    }
    if (btnDismissBio) {
      btnDismissBio.addEventListener('click', handleDismissBio);
      btnDismissBio.addEventListener('touchend', handleDismissBio);
    }

    if (modalBio) {
      modalBio.addEventListener('click', (e) => {
        if (e.target === modalBio) {
          handleDismissBio(e);
        }
      });
      const bioCard = modalBio.querySelector('.student-bio-card');
      if (bioCard) {
        bioCard.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeStudentBioModal();
      }
    });

    const btnBioSpawn = document.getElementById('btn-bio-spawn-action');
    if (btnBioSpawn) {
      btnBioSpawn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.activeBioStudent) {
          this.spawnOnlineStudent(this.activeBioStudent);
        }
      });
    }
  }

  switchRosterTab(tab) {
    this.rosterTab = tab;
    const tabBuiltin = document.getElementById('tab-roster-builtin');
    const tabOnline = document.getElementById('tab-roster-online');
    const viewBuiltin = document.getElementById('view-roster-builtin');
    const viewOnline = document.getElementById('view-roster-online');

    if (tab === 'online') {
      if (tabOnline) tabOnline.classList.add('active');
      if (tabBuiltin) tabBuiltin.classList.remove('active');
      if (viewOnline) viewOnline.classList.remove('hidden');
      if (viewBuiltin) viewBuiltin.classList.add('hidden');

      if (this.onlineCatalog.length === 0 && !this.isCatalogLoading) {
        this.loadOnlineCatalog();
      }
    } else {
      if (tabBuiltin) tabBuiltin.classList.add('active');
      if (tabOnline) tabOnline.classList.remove('active');
      if (viewBuiltin) viewBuiltin.classList.remove('hidden');
      if (viewOnline) viewOnline.classList.add('hidden');
    }
  }

  async loadOnlineCatalog() {
    this.isCatalogLoading = true;
    const container = document.getElementById('online-roster-list');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px; font-family: var(--font-mono); font-size: 11px; color: #60A5FA;">
          <div style="margin-bottom: 8px;">⏳ FETCHING KIVOTOS STUDENTS & 3D MODELS...</div>
          <span style="font-size: 9px; color: var(--text-muted);">Syncing from GitHub BlueArchiveModels & Wiki API</span>
        </div>
      `;
    }

    try {
      this.onlineCatalog = await getUnifiedCharacterCatalog();
      this.isCatalogLoading = false;
      this.showToast(`LOADED ${this.onlineCatalog.length} STUDENTS`, 'blue');
      this.renderOnlineRoster();
    } catch (err) {
      this.isCatalogLoading = false;
      console.error('[HUD] Error loading online catalog:', err);
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 20px; font-family: var(--font-mono); font-size: 11px; color: #f87171;">
            Failed to load online catalog. Please check connection.
          </div>
        `;
      }
    }
  }

  renderOnlineRoster() {
    const container = document.getElementById('online-roster-list');
    if (!container) return;

    if (this.onlineCatalog.length === 0) {
      if (!this.isCatalogLoading) {
        container.innerHTML = `
          <div style="text-align: center; padding: 20px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
            No students found.
          </div>
        `;
      }
      return;
    }

    let filtered = this.onlineCatalog;

    // School filter
    if (this.selectedSchool && this.selectedSchool !== 'all') {
      const sch = this.selectedSchool.toLowerCase();
      filtered = filtered.filter(s => (s.school || '').toLowerCase().includes(sch));
    }

    // Search query filter
    if (this.searchQuery) {
      filtered = filtered.filter(s =>
        (s.name || '').toLowerCase().includes(this.searchQuery) ||
        (s.school || '').toLowerCase().includes(this.searchQuery) ||
        (s.role || '').toLowerCase().includes(this.searchQuery)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
          No student matching "${this.searchQuery || this.selectedSchool}".
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((item) => {
      const isPlaced = this.models.some(m => m.id === `online_${item.id}` && m.placed);
      return `
        <div class="online-student-card ${item.hasModel ? 'has-glb' : ''}">
          <div class="student-meta-left" data-student-id="${item.id}">
            <div class="student-avatar-wrap">
              <img class="student-avatar-img" src="${item.avatarUrl}" onerror="this.onerror=null;this.src='${FALLBACK_AVATAR}'" loading="lazy" alt="${item.name}" />
            </div>
            <div class="student-info-col">
              <div class="student-name-row">
                <span class="student-name-text">${item.name}</span>
                <span class="tag-badge ${item.hasModel ? 'tag-3d-ready' : 'tag-3d-none'}">${item.hasModel ? '3D GLB' : 'NO 3D'}</span>
              </div>
              <div class="student-tags-row">
                <span class="tag-badge tag-school">${item.school}</span>
                <span class="tag-badge tag-role">${item.role}</span>
              </div>
            </div>
          </div>
          <div class="student-actions-right">
            <button class="btn-student-info" data-action="info" data-student-id="${item.id}" title="Student Dossier / Bio">ℹ</button>
            ${
              item.hasModel
                ? `
                <button class="btn-online-spawn" data-action="spawn" data-student-id="${item.id}" id="spawn-btn-${item.id}">
                  ${isPlaced ? 'DESPAWN' : 'SPAWN'}
                </button>
              `
                : ''
            }
          </div>
        </div>
      `;
    }).join('');

    // Attach click for opening bio info
    container.querySelectorAll('.student-meta-left, [data-action="info"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        const studentId = e.currentTarget.getAttribute('data-student-id');
        const student = this.onlineCatalog.find(s => String(s.id) === String(studentId));
        if (student) this.openStudentBioModal(student);
      });
    });

    // Attach click for online spawning
    container.querySelectorAll('[data-action="spawn"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const studentId = e.currentTarget.getAttribute('data-student-id');
        const student = this.onlineCatalog.find(s => String(s.id) === String(studentId));
        if (student) this.spawnOnlineStudent(student);
      });
    });
  }

  openStudentBioModal(student) {
    this.activeBioStudent = student;
    const modal = document.getElementById('student-bio-modal');
    if (!modal) return;

    const imgAvatar = document.getElementById('bio-avatar');
    const txtName = document.getElementById('bio-name');
    const txtSchool = document.getElementById('bio-school');
    const txtRole = document.getElementById('bio-role');
    const txtArmor = document.getElementById('bio-armor');
    const txtId = document.getElementById('bio-id');
    const txtDesc = document.getElementById('bio-desc');
    const btnSpawn = document.getElementById('btn-bio-spawn-action');

    if (imgAvatar) {
      imgAvatar.src = student.portraitUrl || student.avatarUrl || FALLBACK_AVATAR;
      imgAvatar.onerror = () => {
        imgAvatar.src = student.avatarUrl || FALLBACK_AVATAR;
        imgAvatar.onerror = () => { imgAvatar.src = FALLBACK_AVATAR; };
      };
    }
    if (txtName) txtName.textContent = student.name;
    if (txtSchool) txtSchool.textContent = student.school;
    if (txtRole) txtRole.textContent = student.role;
    if (txtArmor) txtArmor.textContent = student.rarity || '3★';
    if (txtId) txtId.textContent = `${student.school} • ${student.role}`;
    if (txtDesc) txtDesc.textContent = student.profile || 'No biography dossier recorded in Kivotos database.';

    const linkWiki = document.getElementById('btn-bio-wiki-link');
    if (linkWiki) {
      const safeTitle = encodeURIComponent((student.wikiName || student.name).replace(/ /g, '_'));
      linkWiki.href = student.wikiUrl || `https://bluearchive.wiki/wiki/${safeTitle}`;
    }

    if (btnSpawn) {
      if (student.hasModel) {
        btnSpawn.classList.remove('hidden');
        const isPlaced = this.models.some(m => m.id === `online_${student.id}` && m.placed);
        btnSpawn.textContent = isPlaced ? 'DESPAWN FROM AR' : 'SPAWN 3D IN AR';
      } else {
        btnSpawn.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
  }

  closeStudentBioModal() {
    const modal = document.getElementById('student-bio-modal');
    if (modal) modal.classList.add('hidden');
    this.activeBioStudent = null;
  }

  async spawnOnlineStudent(student) {
    if (!student.hasModel || !student.downloadUrl) {
      this.showToast(`NO 3D GLB FOUND FOR ${student.name}`, 'yellow');
      return;
    }

    const modelId = `online_${student.id}`;
    const currentlyPlaced = this.models.find(m => m.id === modelId && m.placed);
    if (currentlyPlaced) {
      this.removeModelById(modelId);
      this.renderOnlineRoster();
      this.closeStudentBioModal();
      return;
    }

    const btn = document.getElementById(`spawn-btn-${student.id}`);
    const bioBtn = document.getElementById('btn-bio-spawn-action');
    if (btn) {
      btn.classList.add('downloading');
      btn.textContent = 'DL 0%';
    }
    if (bioBtn) {
      bioBtn.classList.add('downloading');
      bioBtn.textContent = 'DOWNLOADING...';
    }

    this.showToast(`DOWNLOADING ${student.name.toUpperCase()} GLB...`, 'blue');

    try {
      const blobUrl = await downloadGLBWithProgress(student.downloadUrl, (pct) => {
        if (btn) btn.textContent = `DL ${pct}%`;
        if (bioBtn) bioBtn.textContent = `DL ${pct}%`;
      });

      let existingModel = this.models.find(m => m.id === modelId);
      if (!existingModel) {
        existingModel = {
          id: modelId,
          name: `${student.name.toUpperCase()}`,
          subtitle: `${student.school} • ${student.role}`,
          src: blobUrl,
          scale: { x: 1, y: 1, z: 1 },
          iconSvg: `<img src="${student.avatarUrl}" style="width:20px;height:20px;border-radius:4px;object-fit:cover;" onerror="this.onerror=null;this.src='${FALLBACK_AVATAR}'"/>`,
          animations: null, // Auto-detected when loaded into scene!
          mouthConfig: {
            enableMouthAtlas: false // Native model mouth bone animations preserved
          },
          isOnline: true,
          studentData: student,
          placed: false,
          entityEl: null
        };
        this.models.push(existingModel);
      } else {
        existingModel.src = blobUrl;
      }

      this.closeStudentBioModal();
      this.spawnModelById(modelId);
      this.renderOnlineRoster();
      this.showToast(`SPAWNED ONLINE: ${student.name}`, 'green');
    } catch (err) {
      console.error('[HUD] Error downloading/spawning online model:', err);
      this.showToast(`DOWNLOAD FAILED: ${err.message}`, 'yellow');
    } finally {
      if (btn) {
        btn.classList.remove('downloading');
        btn.textContent = 'SPAWN';
      }
      if (bioBtn) {
        bioBtn.classList.remove('downloading');
        bioBtn.textContent = 'SPAWN 3D IN AR';
      }
    }
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

    if (tabName === 'telemetry') {
      this.updateControlsPanelForActiveModel();
    }
    this.updateDockButtonsState();
  }

  updateDockButtonsState() {
    const modelsBtn = document.getElementById('dock-btn-models');
    const controlsBtn = document.getElementById('dock-btn-controls');

    if (modelsBtn) {
      modelsBtn.classList.toggle('active', this.drawerOpen && this.activeTab === 'models');
    }
    if (controlsBtn) {
      controlsBtn.classList.toggle('active', this.drawerOpen && this.activeTab !== 'models');
    }
  }

  toggleDrawer(forceState) {
    this.drawerOpen = forceState !== undefined ? forceState : !this.drawerOpen;
    const drawer = document.getElementById('bento-drawer');

    if (this.drawerOpen) {
      drawer.classList.remove('closed');
      this.updateControlsPanelForActiveModel();
    } else {
      drawer.classList.add('closed');
    }
    this.updateDockButtonsState();
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
        mouthTimelines: JSON.stringify(timelines),
        isVRM: !!model.isVRM,
        enableMouthAtlas: !!(mouthCfg && mouthCfg.enableMouthAtlas)
      });
    }

    entity.addEventListener('model-loaded', () => {
      const mesh = entity.getObject3D('mesh');
      if (mesh) {
        // Auto scale detection for Blue Archive models (raw bounds in cm vs m)
        const THREE = window.THREE;
        if (THREE) {
          const bbox = new THREE.Box3().setFromObject(mesh);
          const size = bbox.getSize(new THREE.Vector3());
          // Auto scale detection: cm scale (< 0.15m height when scale is 1) vs m scale (0.5m - 2.5m)
          if (size.y < 0.15 && (!model.scale || model.scale.y <= 1)) {
            model.scale = { x: 100, y: 100, z: 100 };
            const s = 100 * this.transformState.scale;
            entity.setAttribute('scale', `${s} ${s} ${s}`);
          } else if (size.y > 15 && model.scale && model.scale.y >= 50) {
            model.scale = { x: 1, y: 1, z: 1 };
            const s = 1 * this.transformState.scale;
            entity.setAttribute('scale', `${s} ${s} ${s}`);
          }
        }

        // Auto animation detection if not pre-configured (Online Models)
        if (!model.animations && mesh.animations && mesh.animations.length > 0) {
          const detected = autoDetectBAAnimations(mesh.animations, model.id, model.name);
          model.animations = detected.animations;
          model.mouthConfig = detected.mouthConfig;

          entity.setAttribute('model-animator', {
            idleList: model.animations.idleList,
            defaultIdle: model.animations.defaultIdle,
            pickupClip: model.animations.pickup,
            atlasSrc: model.mouthConfig.atlasSrc,
            atlasExtraSrc: model.mouthConfig.atlasExtraSrc,
            idleMouthIndex: model.mouthConfig.idleMouthIndex,
            pickupMouthIndex: model.mouthConfig.pickupMouthIndex,
            mouthStyle: model.mouthConfig.mouthStyle,
            currentMouthIndex: 0,
            enableMouthAtlas: false
          });
          console.log(`[HUD] Auto-detected ${mesh.animations.length} clips for ${model.name}. Default idle: ${model.animations.defaultIdle}`);
        }
      }

      if (this.flatShader && entity.object3D) {
        applyFlatShaderToMesh(entity.object3D, true);
      }
      this.updateControlsPanelForActiveModel();
    });

    // Character voice lines event hooks
    entity.addEventListener('dragstart', () => {
      this.audioManager.startPickup();
    });

    entity.addEventListener('dragend', () => {
      this.audioManager.onDrop();
    });

    scene.appendChild(entity);

    // Initialize and start character voice audio (Spawn sound -> 20s -> Random Idle Monologue)
    (async () => {
      let audioCfg = model.audio;
      if (!audioCfg || (!audioCfg.spawn && !audioCfg.idle && !audioCfg.pickup)) {
        const queryName = model.name || model.id;
        const fetchedCfg = await fetchCharacterVoicesFromWiki(queryName);
        if (fetchedCfg) {
          audioCfg = fetchedCfg;
          model.audio = fetchedCfg;
        }
      }

      if (this.activeModelId === model.id && audioCfg) {
        this.audioManager.loadCharacter(audioCfg, model.name);
        this.audioManager.playSpawn();
      }
    })();

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
      if (typeof val === 'string' && val.startsWith('e')) {
        const num = val.substring(1);
        lbl.textContent = `EXTRA #${String(num).padStart(2, '0')}`;
      } else {
        lbl.textContent = presetNames[val] || `#${String(val).padStart(2, '0')}`;
      }
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

  updateControlsPanelForActiveModel() {
    const activeModel = this.models.find(m => m.id === this.activeModelId) || this.models.find(m => m.placed);
    const grpAtlas = document.getElementById('grp-atlas-controls');
    const grpVrm = document.getElementById('grp-vrm-controls');
    if (activeModel && activeModel.isVRM) {
      if (grpAtlas) grpAtlas.style.display = 'none';
      if (grpVrm) grpVrm.style.display = 'block';
    } else {
      if (grpAtlas) grpAtlas.style.display = 'block';
      if (grpVrm) grpVrm.style.display = 'none';
    }
  }

  setVRMExpression(expressionName, weight = 1.0) {
    const activeModel = this.models.find(m => m.id === this.activeModelId && m.placed) || this.models.find(m => m.placed && m.isVRM);
    if (activeModel && activeModel.entityEl) {
      activeModel.entityEl.dispatchEvent(new CustomEvent('set-vrm-expression', {
        detail: { expression: expressionName, weight }
      }));
      this.showToast(`EXPRESSION: ${expressionName.toUpperCase()}`, 'blue');
    }
  }

  setVRMVowel(vowel, weight = 1.0) {
    const activeModel = this.models.find(m => m.id === this.activeModelId && m.placed) || this.models.find(m => m.placed && m.isVRM);
    if (activeModel && activeModel.entityEl) {
      activeModel.entityEl.dispatchEvent(new CustomEvent('set-vrm-vowel', {
        detail: { vowel, weight }
      }));
      this.showToast(`MOUTH: ${vowel ? vowel.toUpperCase() : 'REST'}`, 'blue');
    }
  }

  toggleVRMLipSync() {
    const activeModel = this.models.find(m => m.id === this.activeModelId && m.placed) || this.models.find(m => m.placed && m.isVRM);
    if (!activeModel || !activeModel.entityEl) {
      this.showToast('HÃY ĐẶT NHÂN VẬT VÀO SCENE ĐỂ TEST TALK');
      return;
    }
    const comp = activeModel.entityEl.components && activeModel.entityEl.components['model-animator'];
    const vrm = comp && comp.vrmController;
    if (vrm) {
      if (vrm.lipSyncActive) {
        vrm.stopLipSyncTest();
        this.showToast('ĐÃ DỪNG NÓI CHUYỆN');
        document.getElementById('btn-vrm-lip-sync')?.classList.remove('active');
      } else {
        vrm.startLipSyncTest(180);
        this.showToast('ARONA ĐANG NÓI CHUYỆN (LIP-SYNC)...', 'green');
        document.getElementById('btn-vrm-lip-sync')?.classList.add('active');
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
