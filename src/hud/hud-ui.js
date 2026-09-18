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

    <!-- Top HUD Bar -->
    <div class="pixel-hud-bar" id="hud-top-bar">
      <div class="brand-container">
        <div class="pulse-dot"></div>
        <span class="brand-title">HOLOLAB // SKY.AR</span>
      </div>
      <div class="hud-center-status">
        <span class="status-badge green" id="status-slam">SLAM ACTIVE</span>
        <span class="status-badge yellow" id="status-debug-grid">DEBUG GRIDS ON</span>
        <span class="status-badge blue" id="status-count">SPAWNED 0/1 MAX</span>
      </div>
      <div class="hud-actions">
        <button class="hud-icon-btn" id="btn-toggle-remote-console" title="Remote Logs Console">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
        </button>
        <button class="hud-icon-btn" id="btn-toggle-hud" title="Toggle HUD">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
        </button>
      </div>
    </div>

    <!-- Show HUD Floating FAB -->
    <button class="hud-show-fab hidden" id="hud-show-fab" title="Show HUD">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
    </button>

    <!-- Bento Grid Drawer -->
    <div class="bento-drawer-container closed" id="bento-drawer">
      <div class="bento-header">
        <div class="bento-nav-tabs">
          <button class="bento-tab-btn active" data-tab="models">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            MODELS
          </button>
          <button class="bento-tab-btn" data-tab="telemetry">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            TELEMETRY
          </button>
          <button class="bento-tab-btn" data-tab="lights">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            LIGHTS
          </button>
          <button class="bento-tab-btn" data-tab="system">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            SYSTEM
          </button>
          <button class="bento-tab-btn" data-tab="console">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
            CONSOLE (<span id="bento-console-count">0</span>)
          </button>
        </div>
        <button class="bento-close-btn" id="btn-close-drawer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="bento-body">
        <!-- Panel 1: Models -->
        <div class="bento-panel" id="panel-models">
          <div class="single-spawn-notice">
            <div class="notice-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </div>
            <div class="notice-text">
              SINGLE-SPAWN RULE: Exactly 1 object allowed in AR scene. Touch object to show ground ring, drag to move & lift. Rotate & pinch pause automatically during drag.
            </div>
          </div>

          <div class="models-grid" id="models-list">
            <!-- Rendered via JS -->
          </div>
        </div>

        <!-- Panel 2: Telemetry & Debug Matrix -->
        <div class="bento-panel hidden" id="panel-telemetry">
          <div class="matrix-box">
            <span>MATRIX XYZ</span>
            <span id="matrix-coords">X: 0.0m | Y: 0.0m | Z: 0.0m</span>
          </div>

          <!-- Debug Grid Legend -->
          <div class="single-spawn-notice" style="background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.3);">
            <div class="notice-text" style="font-size: 9px; line-height: 1.4;">
              <div><strong style="color: #10B981;">🟢 EMERALD GRID:</strong> THREE.JS WORLD ORIGIN (0,0,0) + AXES</div>
              <div><strong style="color: #06B6D4;">🔵 CYAN GRID:</strong> 8TH WALL SLAM DETECTED SURFACE</div>
            </div>
          </div>

          <div class="control-group">
            <div class="control-header">
              <span class="control-label">SCALE FACTOR</span>
              <span class="control-value" id="val-scale">1.0x</span>
            </div>
            <input type="range" class="pixel-range" id="input-scale" min="0.1" max="5.0" step="0.1" value="1.0">
          </div>

          <div class="control-group">
            <div class="control-header">
              <span class="control-label">ALTITUDE (Y)</span>
              <span class="control-value" id="val-pos-y">0.0m</span>
            </div>
            <input type="range" class="pixel-range" id="input-pos-y" min="-5.0" max="15.0" step="0.5" value="0.0">
          </div>

          <div class="control-group">
            <div class="control-header">
              <span class="control-label">DISTANCE (Z)</span>
              <span class="control-value" id="val-pos-z">0.0m</span>
            </div>
            <input type="range" class="pixel-range" id="input-pos-z" min="-20.0" max="5.0" step="0.5" value="0.0">
          </div>

          <div class="control-group">
            <div class="control-header">
              <span class="control-label">HEADING YAW (DEG)</span>
              <span class="control-value" id="val-rot-y">0°</span>
            </div>
            <input type="range" class="pixel-range" id="input-rot-y" min="0" max="360" step="15" value="0">
          </div>

          <div class="control-group">
            <div class="control-header">
              <span class="control-label">MOUTH SHAPE (0-60)</span>
              <span class="control-value" id="val-mouth-shape">#00 SMILE</span>
            </div>
            <input type="range" class="pixel-range" id="input-mouth-shape" min="0" max="60" step="1" value="0">
            <div class="quick-mouth-presets" style="display: flex; gap: 4px; margin-top: 6px;">
              <button class="pixel-btn-sm" data-mouth="0" style="flex: 1; font-size: 8px; padding: 4px 0; background: rgba(0,255,200,0.1); border: 1px solid rgba(0,255,200,0.3); color: #00ffc8; cursor: pointer;">#0 IDLE</button>
              <button class="pixel-btn-sm" data-mouth="1" style="flex: 1; font-size: 8px; padding: 4px 0; background: rgba(0,255,200,0.1); border: 1px solid rgba(0,255,200,0.3); color: #00ffc8; cursor: pointer;">#1 TALK</button>
              <button class="pixel-btn-sm" data-mouth="3" style="flex: 1; font-size: 8px; padding: 4px 0; background: rgba(0,255,200,0.1); border: 1px solid rgba(0,255,200,0.3); color: #00ffc8; cursor: pointer;">#3 O</button>
              <button class="pixel-btn-sm" data-mouth="17" style="flex: 1; font-size: 8px; padding: 4px 0; background: rgba(0,255,200,0.1); border: 1px solid rgba(0,255,200,0.3); color: #00ffc8; cursor: pointer;">#17 LAUGH</button>
              <button class="pixel-btn-sm" data-mouth="33" style="flex: 1; font-size: 8px; padding: 4px 0; background: rgba(0,255,200,0.1); border: 1px solid rgba(0,255,200,0.3); color: #00ffc8; cursor: pointer;">#33 SHOUT</button>
            </div>
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
              SHADER: <span id="lbl-shader-status">FLAT</span>
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

        <!-- Panel 4: System & Debug -->
        <div class="bento-panel hidden" id="panel-system">
          <div class="action-grid">
            <button class="panel-action-btn" id="btn-toggle-debug-grids">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
              DEBUG GRIDS: <span id="lbl-debug-grids-status">ON</span>
            </button>
            <button class="panel-action-btn" id="btn-recenter-system">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>
              RECENTER AR
            </button>
          </div>
          <div class="action-grid" style="margin-top: 8px;">
            <a href="./debug-studio.html" target="_blank" class="panel-action-btn" style="grid-column: span 2; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; border-color: #00ffc8; color: #00ffc8; font-weight: 600;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              OPEN DEBUG STUDIO ↗
            </a>
          </div>
          <div class="action-grid" style="margin-top: 8px;">
            <button class="panel-action-btn danger" id="btn-reset-all" style="grid-column: span 2;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              DESPAWN ALL
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

        <!-- Panel 5: Remote Console Logs -->
        <div class="bento-panel hidden" id="panel-console">
          <div class="action-grid">
            <button class="panel-action-btn" id="btn-clear-console">CLEAR LOGS</button>
            <button class="panel-action-btn" id="btn-copy-console">COPY ALL LOGS</button>
          </div>
          <div class="remote-console-body" id="drawer-console-list" style="height: 180px; margin-top: 8px; background: rgba(0,0,0,0.5); border-radius: 6px; border: 1px solid var(--border-subtle);">
            <!-- Log lines appended dynamically -->
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

    <!-- Floating Remote Console Overlay Panel -->
    <div class="remote-console-floating hidden" id="remote-console-overlay">
      <div class="remote-console-header">
        <div class="remote-console-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          REMOTE CONSOLE LOGS (<span id="floating-console-count">0</span>)
        </div>
        <div class="remote-console-actions">
          <button class="console-mini-btn" id="btn-floating-clear">CLEAR</button>
          <button class="console-mini-btn" id="btn-floating-copy">COPY</button>
          <button class="console-mini-btn" id="btn-floating-close">✕</button>
        </div>
      </div>
      <div class="remote-console-body" id="floating-console-list">
        <!-- Log lines appended dynamically -->
      </div>
    </div>
  `;
}
