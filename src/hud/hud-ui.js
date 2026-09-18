/**
 * HUD UI Markup Templates
 * Generates HTML overlay structures for mobile HUD bar, Bento grid drawer, dock, and console windows.
 */
export function getHUDHTMLTemplate() {
  return `
    <!-- Shutter Flash Overlay -->
    <div class="shutter-flash-overlay" id="shutter-flash"></div>

    <!-- Toast Notification -->
    <div id="pixel-toast" class="hidden">
      <span class="toast-text" id="toast-text">SYSTEM READY</span>
    </div>

    <!-- Initial Tap-to-Place Prompt Fullscreen Overlay -->
    <div class="spawn-prompt-banner" id="spawn-prompt-banner">
      <div class="prompt-center-content">
        <!-- Crosshair Reticle with '+' mark on top -->
        <div class="prompt-crosshair">
          <div class="prompt-crosshair-ring">
            <svg class="prompt-crosshair-svg" width="60" height="60" viewBox="0 0 60 60" fill="none">
              <!-- Outer decorative dashed ring -->
              <circle cx="30" cy="30" r="27" stroke="rgba(96, 165, 250, 0.35)" stroke-width="1.5" stroke-dasharray="4 3" />
              <!-- Inner targeting circle -->
              <circle cx="30" cy="30" r="14" stroke="rgba(96, 165, 250, 0.55)" stroke-width="1.5" />
              <!-- Corner brackets -->
              <path d="M12 18V12H18" stroke="#93C5FD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M48 18V12H42" stroke="#93C5FD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M12 42V48H18" stroke="#93C5FD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M48 42V48H42" stroke="#93C5FD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <!-- Prominent '+' Crosshair -->
              <line x1="30" y1="18" x2="30" y2="42" stroke="#60A5FA" stroke-width="3" stroke-linecap="round" />
              <line x1="18" y1="30" x2="42" y2="30" stroke="#60A5FA" stroke-width="3" stroke-linecap="round" />
              <circle cx="30" cy="30" r="2.5" fill="#FFFFFF" />
            </svg>
          </div>
        </div>

        <!-- Instruction text below '+' -->
        <div class="prompt-text-group">
          <span class="prompt-badge">SLAM SURFACE DETECTION</span>
          <h2 class="prompt-title">AIM CAMERA & TAP SURFACE</h2>
          <p class="prompt-subtitle">Point camera at a well-lit flat surface & tap anywhere to place character</p>
          <div class="prompt-action-pill">
            <span class="prompt-action-text">TAP SCREEN TO PLACE</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Mobile HUD Bar -->
    <div class="pixel-hud-bar" id="hud-top-bar">
      <div class="brand-container" style="display: flex; align-items: center; gap: 8px; height: 100%; max-height: 48px; overflow: hidden; flex: 0 1 auto;">
        <img src="./assets/logo.png" alt="Blue Archive AR" class="brand-logo" style="height: 28px; max-height: 28px; width: auto; max-width: 140px; object-fit: contain; display: block;" />
      </div>
      <div class="hud-actions">
        <!-- Instruction Guide Button -->
        <button class="hud-icon-btn" id="btn-toggle-instructions" title="How to Play / Guide">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </button>
        <!-- Hide HUD Button -->
        <button class="hud-icon-btn" id="btn-toggle-hud" title="Toggle HUD Overlay">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
        </button>
      </div>
    </div>

    <!-- Show HUD Floating FAB -->
    <button class="hud-show-fab hidden" id="hud-show-fab" title="Show HUD">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
    </button>

    <!-- AR Instructions / Help Modal -->
    <div class="instruction-modal-overlay hidden" id="instruction-modal">
      <div class="instruction-card">
        <div class="instruction-header">
          <div class="instruction-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span>AR USER GUIDE</span>
          </div>
          <button class="bento-close-btn" id="btn-close-instructions">✕</button>
        </div>
        <div class="instruction-body">
          <div class="instruction-step">
            <div class="step-num">1</div>
            <div class="step-content">
              <strong>Scan Ground Surface</strong>
              <p>Move your phone slowly pointing toward a flat ground or tabletop in a well-lit environment (SLAM tracking).</p>
            </div>
          </div>
          <div class="instruction-step">
            <div class="step-num">2</div>
            <div class="step-content">
              <strong>Place Character (Spawn)</strong>
              <p>Tap anywhere on your screen or press the <strong>SPAWN</strong> button on the bottom dock to place the 3D character.</p>
            </div>
          </div>
          <div class="instruction-step">
            <div class="step-num">3</div>
            <div class="step-content">
              <strong>Interact & Move</strong>
              <p><strong>Touch & Drag:</strong> Move character across the room.<br>
              <strong>2-Finger Rotate / Pinch:</strong> Rotate heading and scale size freely.</p>
            </div>
          </div>
          <div class="instruction-step">
            <div class="step-num">4</div>
            <div class="step-content">
              <strong>Controls & Recenter</strong>
              <p>Tap <strong>RECENTER</strong> to bring character right in front of you, or open <strong>CONTROLS</strong> to change facial expressions and lighting.</p>
            </div>
          </div>
        </div>
        <div class="instruction-footer">
          <button class="instruction-ack-btn" id="btn-ack-instructions">GOT IT, LET'S START</button>
        </div>
      </div>
    </div>

    <!-- Bento Grid Control Drawer -->
    <div class="bento-drawer-container closed" id="bento-drawer">
      <div class="bento-header">
        <div class="bento-nav-tabs">
          <button class="bento-tab-btn active" data-tab="models">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            CHARACTERS
          </button>
          <button class="bento-tab-btn" data-tab="telemetry">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            EXPRESSION & POS
          </button>
          <button class="bento-tab-btn" data-tab="lights">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            LIGHTING
          </button>
          <button class="bento-tab-btn" data-tab="system">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            SETTINGS
          </button>
        </div>
        <button class="bento-close-btn" id="btn-close-drawer">✕</button>
      </div>

      <div class="bento-body">
        <!-- Panel 1: Models -->
        <div class="bento-panel" id="panel-models">
          <div class="models-grid" id="models-list">
            <!-- Rendered via JS -->
          </div>
        </div>

        <!-- Panel 2: Telemetry & Controls -->
        <div class="bento-panel hidden" id="panel-telemetry">
          <div class="control-group">
            <div class="control-header">
              <span class="control-label">MOUTH EXPRESSION</span>
              <span class="control-value" id="val-mouth-shape">#00 SMILE</span>
            </div>
            <input type="range" class="pixel-range" id="input-mouth-shape" min="0" max="60" step="1" value="0">
            <div class="quick-mouth-presets">
              <button class="bento-tab-btn" data-mouth="0">SMILE</button>
              <button class="bento-tab-btn" data-mouth="1">TALK</button>
              <button class="bento-tab-btn" data-mouth="3">SURPRISE</button>
              <button class="bento-tab-btn" data-mouth="17">LAUGH</button>
              <button class="bento-tab-btn" data-mouth="33">SHOUT</button>
            </div>
          </div>

          <div class="control-group">
            <div class="control-header">
              <span class="control-label">SCALE FACTOR</span>
              <span class="control-value" id="val-scale">1.0x</span>
            </div>
            <input type="range" class="pixel-range" id="input-scale" min="0.1" max="3.0" step="0.1" value="1.0">
          </div>

          <div class="control-group">
            <div class="control-header">
              <span class="control-label">ROTATION YAW</span>
              <span class="control-value" id="val-rot-y">0°</span>
            </div>
            <input type="range" class="pixel-range" id="input-rot-y" min="0" max="360" step="15" value="0">
          </div>

          <div class="control-group">
            <div class="control-header">
              <span class="control-label">ALTITUDE (Y)</span>
              <span class="control-value" id="val-pos-y">0.0m</span>
            </div>
            <input type="range" class="pixel-range" id="input-pos-y" min="-2.0" max="4.0" step="0.2" value="0.0">
          </div>

          <div class="control-group">
            <div class="control-header">
              <span class="control-label">DISTANCE (Z)</span>
              <span class="control-value" id="val-pos-z">0.0m</span>
            </div>
            <input type="range" class="pixel-range" id="input-pos-z" min="-10.0" max="2.0" step="0.5" value="0.0">
          </div>
        </div>

        <!-- Panel 3: Lights -->
        <div class="bento-panel hidden" id="panel-lights">
          <div class="action-grid">
            <button class="panel-action-btn" id="btn-toggle-lights">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line></svg>
              LIGHTS: <span id="lbl-lights-status">ON</span>
            </button>
            <button class="panel-action-btn" id="btn-toggle-shader">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"></path></svg>
              SHADER: <span id="lbl-shader-status">ANIME FLAT</span>
            </button>
          </div>

          <div class="control-group" style="margin-top: 8px;">
            <div class="control-header">
              <span class="control-label">LIGHT INTENSITY</span>
              <span class="control-value" id="val-light-intensity">1.2</span>
            </div>
            <input type="range" class="pixel-range" id="input-light-intensity" min="0.2" max="3.0" step="0.1" value="1.2">
          </div>
        </div>

        <!-- Panel 4: System & Advanced -->
        <div class="bento-panel hidden" id="panel-system">
          <div class="action-grid">
            <button class="panel-action-btn" id="btn-recenter-system">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>
              RECENTER SCENE
            </button>
            <button class="panel-action-btn" id="btn-toggle-debug-grids">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
              MEASURE GRID: <span id="lbl-debug-grids-status">OFF</span>
            </button>
          </div>
          <div class="action-grid" style="margin-top: 8px;">
            <button class="panel-action-btn danger" id="btn-reset-all" style="grid-column: span 2;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              DESPAWN CHARACTER
            </button>
          </div>
          <div class="control-group" style="margin-top: 10px;">
            <div class="control-header">
              <span class="control-label">AUTO-HIDE HUD (5S)</span>
              <span class="control-value" id="lbl-autohide">ENABLED</span>
            </div>
            <button class="panel-action-btn" id="btn-toggle-autohide">TOGGLE AUTO-HIDE</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Mobile Dock -->
    <div class="mobile-dock" id="mobile-dock">
      <button class="dock-btn primary" id="dock-btn-spawn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        SPAWN
      </button>
      <button class="dock-btn" id="dock-btn-recenter">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>
        RECENTER
      </button>
      <button class="dock-btn" id="dock-btn-lights">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line></svg>
        LIGHTS
      </button>
      <button class="dock-btn" id="dock-btn-controls">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
        CONTROLS
      </button>
    </div>
  `;
}
