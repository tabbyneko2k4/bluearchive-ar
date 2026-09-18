/**
 * Character Audio Manager
 * Manages character voice lines for Idle and Pickup states.
 * Features:
 * - Sequential audio playback per state (0 -> 1 -> 2 -> ... -> 0)
 * - 20-second pause interval between tracks
 * - Instant state switching (Idle <-> Pickup)
 * - Mute/Unmute state persisted in localStorage
 * - Safe autoplay policy handling
 */

export class CharacterAudioManager {
  constructor(options = {}) {
    this.intervalSeconds = options.intervalSeconds || 20;
    this.audioConfig = null;
    this.characterName = '';
    this.state = 'stopped'; // 'idle' | 'pickup' | 'stopped'
    this.idleIndex = 0;
    this.pickupIndex = 0;
    this.currentAudio = null;
    this.nextTimer = null;
    this.userInteracted = false;
    this.onToast = options.onToast || null;

    // Load persisted mute preference (default: false / unmuted)
    let savedMute = false;
    try {
      savedMute = localStorage.getItem('ba_ar_audio_muted') === 'true';
    } catch (e) {
      savedMute = false;
    }
    this.isMuted = savedMute;

    this.setupUserInteractionListener();
  }

  setupUserInteractionListener() {
    const unlock = () => {
      this.userInteracted = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
  }

  /**
   * Loads a character's audio configuration
   * @param {Object} audioConfig - { idle: string[], pickup: string[], intervalSeconds?: number }
   * @param {string} characterName - Character display name
   */
  loadCharacter(audioConfig, characterName = '') {
    this.stop();
    this.audioConfig = audioConfig || null;
    this.characterName = characterName;
    this.idleIndex = 0;
    this.pickupIndex = 0;

    if (this.audioConfig && typeof this.audioConfig.intervalSeconds === 'number') {
      this.intervalSeconds = this.audioConfig.intervalSeconds;
    } else {
      this.intervalSeconds = 20;
    }

    console.log(`[CharacterAudio] Loaded audio config for ${characterName}:`, {
      idleCount: this.audioConfig?.idle?.length || 0,
      pickupCount: this.audioConfig?.pickup?.length || 0,
      interval: `${this.intervalSeconds}s`
    });
  }

  /**
   * Starts the Idle audio cycle
   * @param {Object} options - { immediate: boolean }
   */
  startIdle({ immediate = true } = {}) {
    if (!this.audioConfig || !this.audioConfig.idle || this.audioConfig.idle.length === 0) {
      return;
    }

    this.clearNextTimer();
    this.stopCurrentAudio();
    this.state = 'idle';

    if (immediate) {
      this.playCurrentStateTrack();
    } else {
      // Delay before next idle audio (e.g. 20s after drop)
      console.log(`[CharacterAudio] Idle state queued, next audio in ${this.intervalSeconds}s`);
      this.nextTimer = setTimeout(() => {
        if (this.state === 'idle') {
          this.playCurrentStateTrack();
        }
      }, this.intervalSeconds * 1000);
    }
  }

  /**
   * Starts the Pickup audio cycle immediately
   */
  startPickup() {
    if (!this.audioConfig || !this.audioConfig.pickup || this.audioConfig.pickup.length === 0) {
      return;
    }

    this.clearNextTimer();
    this.stopCurrentAudio();
    this.state = 'pickup';

    // Instantly play the pickup voice line
    this.playCurrentStateTrack();
  }

  /**
   * Plays the current track for the active state
   */
  playCurrentStateTrack() {
    if (this.state === 'stopped' || !this.audioConfig) return;

    const list = this.state === 'pickup' ? this.audioConfig.pickup : this.audioConfig.idle;
    if (!Array.isArray(list) || list.length === 0) return;

    const currentIndex = this.state === 'pickup' ? this.pickupIndex : this.idleIndex;
    const trackSrc = list[currentIndex % list.length];
    if (!trackSrc) return;

    // Advance index for subsequent play
    if (this.state === 'pickup') {
      this.pickupIndex = (this.pickupIndex + 1) % list.length;
    } else {
      this.idleIndex = (this.idleIndex + 1) % list.length;
    }

    // Extract clean name for logging/toast
    const fileName = trackSrc.split('/').pop().replace(/\.[^/.]+$/, '');
    console.log(`[CharacterAudio] Playing [${this.state.toUpperCase()}] track: ${fileName} (${trackSrc})`);

    // If muted, do not play audio sound, but schedule next cycle
    if (this.isMuted) {
      console.log(`[CharacterAudio] Audio is currently MUTED. Scheduling next track in ${this.intervalSeconds}s.`);
      this.scheduleNextTrack(this.state);
      return;
    }

    try {
      const audio = new Audio(trackSrc);
      audio.preload = 'auto';
      this.currentAudio = audio;

      audio.addEventListener('ended', () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        console.log(`[CharacterAudio] Track ended: ${fileName}. Waiting ${this.intervalSeconds}s for next audio.`);
        this.scheduleNextTrack(this.state);
      });

      audio.addEventListener('error', (e) => {
        console.warn(`[CharacterAudio] Failed to load/play audio: ${trackSrc}`, e);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        this.scheduleNextTrack(this.state);
      });

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[CharacterAudio] Audio play blocked or failed:', err);
          // Wait and retry on next interval
          this.scheduleNextTrack(this.state);
        });
      }
    } catch (e) {
      console.error('[CharacterAudio] Unexpected error in playCurrentStateTrack:', e);
      this.scheduleNextTrack(this.state);
    }
  }

  /**
   * Schedules the next audio after intervalSeconds
   * @param {string} state - The state to continue
   */
  scheduleNextTrack(state) {
    this.clearNextTimer();
    if (this.state !== state || this.state === 'stopped') return;

    this.nextTimer = setTimeout(() => {
      if (this.state === state) {
        this.playCurrentStateTrack();
      }
    }, this.intervalSeconds * 1000);
  }

  /**
   * Stops any currently playing audio track
   */
  stopCurrentAudio() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
  }

  /**
   * Clears the interval timer
   */
  clearNextTimer() {
    if (this.nextTimer) {
      clearTimeout(this.nextTimer);
      this.nextTimer = null;
    }
  }

  /**
   * Completely stops all playback and timers
   */
  stop() {
    this.state = 'stopped';
    this.clearNextTimer();
    this.stopCurrentAudio();
    console.log('[CharacterAudio] Playback stopped.');
  }

  /**
   * Toggles mute state
   * @returns {boolean} Current isMuted state
   */
  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  /**
   * Sets mute state
   * @param {boolean} muted
   * @returns {boolean}
   */
  setMuted(muted) {
    this.isMuted = !!muted;
    try {
      localStorage.setItem('ba_ar_audio_muted', this.isMuted ? 'true' : 'false');
    } catch (e) {}

    console.log(`[CharacterAudio] Mute set to: ${this.isMuted}`);

    if (this.isMuted) {
      this.stopCurrentAudio();
    } else {
      // If unmuted and in idle/pickup, start audio
      if (this.state === 'idle' && !this.currentAudio && !this.nextTimer) {
        this.playCurrentStateTrack();
      }
    }

    return this.isMuted;
  }
}
