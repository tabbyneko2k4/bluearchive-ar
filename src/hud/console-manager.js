/**
 * Remote Console Log Interceptor and Manager
 * Captures console.log, warn, error, info and syncs with HUD Console Panel.
 */
import { escapeHTML } from '../utils/three-helpers';

export class ConsoleManager {
  constructor(toastCallback) {
    this.consoleLogs = [];
    this.remoteConsoleVisible = false;
    this.toastCallback = toastCallback || (() => {});
  }

  setupConsoleInterceptor() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    const self = this;
    function processLog(type, args) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const message = Array.from(args).map((arg) => {
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg); } catch (e) { return String(arg); }
        }
        return String(arg);
      }).join(' ');

      self.addConsoleEntry(type, timeStr, message);
    }

    console.log = function (...args) {
      originalLog.apply(console, args);
      processLog('log', args);
    };
    console.warn = function (...args) {
      originalWarn.apply(console, args);
      processLog('warn', args);
    };
    console.error = function (...args) {
      originalError.apply(console, args);
      processLog('error', args);
    };
    console.info = function (...args) {
      originalInfo.apply(console, args);
      processLog('info', args);
    };
  }

  addConsoleEntry(type, timestamp, message) {
    const entry = { type, timestamp, message };
    this.consoleLogs.push(entry);
    if (this.consoleLogs.length > 200) {
      this.consoleLogs.shift();
    }

    const count = this.consoleLogs.length;
    const bentoCountEl = document.getElementById('bento-console-count');
    if (bentoCountEl) bentoCountEl.textContent = count;
    const floatCountEl = document.getElementById('floating-console-count');
    if (floatCountEl) floatCountEl.textContent = count;

    const createLine = () => {
      const line = document.createElement('div');
      line.className = `console-log-line ${type}`;
      line.innerHTML = `
        <span class="log-timestamp">${timestamp}</span>
        <span class="log-tag ${type}">${type.toUpperCase()}</span>
        <span class="log-content">${escapeHTML(message)}</span>
      `;
      return line;
    };

    const floatList = document.getElementById('floating-console-list');
    if (floatList) {
      floatList.appendChild(createLine());
      floatList.scrollTop = floatList.scrollHeight;
    }

    const drawerList = document.getElementById('drawer-console-list');
    if (drawerList) {
      drawerList.appendChild(createLine());
      drawerList.scrollTop = drawerList.scrollHeight;
    }
  }

  toggleRemoteConsole(forceState) {
    this.remoteConsoleVisible = forceState !== undefined ? forceState : !this.remoteConsoleVisible;
    const overlay = document.getElementById('remote-console-overlay');
    const btn = document.getElementById('btn-toggle-remote-console');
    if (overlay) {
      if (this.remoteConsoleVisible) {
        overlay.classList.remove('hidden');
        if (btn) btn.classList.add('active');
      } else {
        overlay.classList.add('hidden');
        if (btn) btn.classList.remove('active');
      }
    }
  }

  clearConsoleLogs() {
    this.consoleLogs = [];
    const bentoCountEl = document.getElementById('bento-console-count');
    if (bentoCountEl) bentoCountEl.textContent = '0';
    const floatCountEl = document.getElementById('floating-console-count');
    if (floatCountEl) floatCountEl.textContent = '0';

    const floatList = document.getElementById('floating-console-list');
    if (floatList) floatList.innerHTML = '';
    const drawerList = document.getElementById('drawer-console-list');
    if (drawerList) drawerList.innerHTML = '';

    this.toastCallback('CONSOLE LOGS CLEARED');
  }

  copyConsoleLogs() {
    if (this.consoleLogs.length === 0) {
      this.toastCallback('NO LOGS TO COPY', 'yellow');
      return;
    }
    const text = this.consoleLogs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.toastCallback('COPIED LOGS TO CLIPBOARD', 'green');
      }).catch(() => {
        this.fallbackCopyText(text);
      });
    } else {
      this.fallbackCopyText(text);
    }
  }

  fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.toastCallback('COPIED LOGS TO CLIPBOARD', 'green');
    } catch (e) {
      this.toastCallback('FAILED TO COPY LOGS', 'red');
    }
    document.body.removeChild(textarea);
  }
}
