/**
 * Character Audio Manager
 * Manages character voice lines for Spawn, Idle, and Pickup states.
 * Features:
 * - Spawn audio: Plays <Student>_Formation_In_<number>.ogg upon character deployment
 * - Pickup audio: Plays <Student>_Formation_Select.ogg instantly when picked up/dragged
 * - Idle audio: Plays random <Student>_Cafe_monolog_<number>.ogg every 20 seconds
 * - Strict non-overlap: 20-second timer ONLY counts down AFTER the previous voice finishes speaking
 * - Mute/Unmute state persisted in localStorage
 * - Safe autoplay policy handling
 */

export class CharacterAudioManager {
  constructor(options = {}) {
    this.intervalSeconds = options.intervalSeconds || 20;
    this.audioConfig = null;
    this.characterName = '';
    this.state = 'stopped'; // 'spawn' | 'idle' | 'pickup' | 'stopped'
    this.currentAudio = null;
    this.nextTimer = null;
    this.userInteracted = false;
    this.isDragging = false;
    this.lastIdleTrack = null;
    this.onToast = options.onToast || null;

    // Load persisted mute preference (default: false / unmuted)
    let savedMute = false;
    try {
      savedMute = localStorage.getItem('ba_ar_audio_muted') === 'true';
    } catch (e) {
      savedMute = false;
    }
    this.isMuted = savedMute;

    this.audioPool = new Map();
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
   * @param {Object} audioConfig - { spawn?: string[], pickup?: string[], idle?: string[], intervalSeconds?: number }
   * @param {string} characterName - Character display name
   */
  loadCharacter(audioConfig, characterName = '') {
    this.stop();
    this.audioConfig = audioConfig || null;
    this.characterName = characterName;
    this.lastIdleTrack = null;
    this.audioPool.clear();

    if (this.audioConfig && typeof this.audioConfig.intervalSeconds === 'number') {
      this.intervalSeconds = this.audioConfig.intervalSeconds;
    } else {
      this.intervalSeconds = 20;
    }

    // Preload audio elements for zero-latency playback
    if (this.audioConfig) {
      const allTracks = [
        ...(this.audioConfig.spawn || []),
        ...(this.audioConfig.pickup || []),
        ...(this.audioConfig.idle || [])
      ];
      allTracks.forEach(src => {
        if (!src || this.audioPool.has(src)) return;
        try {
          const a = new Audio(src);
          a.preload = 'auto';
          this.audioPool.set(src, a);
        } catch (e) {}
      });
    }

    console.log(`[CharacterAudio] Loaded audio config for ${characterName}:`, {
      spawnCount: this.audioConfig?.spawn?.length || 0,
      pickupCount: this.audioConfig?.pickup?.length || 0,
      idleCount: this.audioConfig?.idle?.length || 0,
      interval: `${this.intervalSeconds}s`,
      isCachedLocally: !!this.audioConfig?.isCachedLocally
    });
  }

  /**
   * Plays spawn sound (Formation_In_<number>.ogg) upon model creation.
   * Once finished, transitions to Idle and waits 20s before the first idle line.
   */
  playSpawn() {
    this.stopCurrentAudio();
    this.clearNextTimer();
    this.state = 'spawn';

    const spawnList = this.audioConfig?.spawn;
    if (Array.isArray(spawnList) && spawnList.length > 0) {
      // Pick random Formation_In sound
      const trackSrc = spawnList[Math.floor(Math.random() * spawnList.length)];
      this.playTrack(trackSrc, 'spawn', () => {
        // When spawn voice finishes, wait intervalSeconds before starting idle voice
        console.log(`[CharacterAudio] Spawn speech complete. Scheduling idle in ${this.intervalSeconds}s.`);
        this.startIdle({ immediate: false });
      });
    } else {
      // If no spawn track found, wait intervalSeconds before idle
      this.startIdle({ immediate: false });
    }
  }

  /**
   * Starts the Idle audio cycle
   * @param {Object} options - { immediate: boolean }
   */
  startIdle({ immediate = false } = {}) {
    if (!this.audioConfig || !this.audioConfig.idle || this.audioConfig.idle.length === 0) {
      return;
    }

    this.clearNextTimer();
    this.state = 'idle';

    if (immediate) {
      this.playRandomIdleTrack();
    } else {
      console.log(`[CharacterAudio] Idle state queued, next audio in ${this.intervalSeconds}s`);
      this.nextTimer = setTimeout(() => {
        if (this.state === 'idle') {
          this.playRandomIdleTrack();
        }
      }, this.intervalSeconds * 1000);
    }
  }

  /**
   * Starts the Pickup audio line immediately (<Student>_Formation_Select.ogg)
   */
  startPickup() {
    this.isDragging = true;
    if (!this.audioConfig || !this.audioConfig.pickup || this.audioConfig.pickup.length === 0) {
      return;
    }

    this.clearNextTimer();
    this.stopCurrentAudio();
    this.state = 'pickup';

    // Formation_Select sound
    const pickupList = this.audioConfig.pickup;
    const trackSrc = pickupList[Math.floor(Math.random() * pickupList.length)];

    this.playTrack(trackSrc, 'pickup', () => {
      console.log('[CharacterAudio] Pickup voice finished speaking.');
      // If the user already dropped the model while voice was playing, queue idle
      if (!this.isDragging && this.state === 'pickup') {
        this.startIdle({ immediate: false });
      }
    });
  }

  /**
   * Called when user drops / releases the character
   */
  onDrop() {
    this.isDragging = false;
    // If audio has already stopped speaking, start the 20s idle countdown
    if (!this.currentAudio && (this.state === 'pickup' || this.state === 'idle')) {
      this.startIdle({ immediate: false });
    }
  }

  /**
   * Plays a random idle line from audioConfig.idle (Cafe Monologue)
   * Avoids repeating the immediate previous line if multiple tracks are available.
   */
  playRandomIdleTrack() {
    if (this.state !== 'idle' || !this.audioConfig) return;

    const list = this.audioConfig.idle;
    if (!Array.isArray(list) || list.length === 0) return;

    let available = list;
    if (list.length > 1 && this.lastIdleTrack) {
      available = list.filter(t => t !== this.lastIdleTrack);
    }

    const trackSrc = available[Math.floor(Math.random() * available.length)];
    this.lastIdleTrack = trackSrc;

    this.playTrack(trackSrc, 'idle', () => {
      // Wait exactly 20s AFTER track finishes speaking before playing the next
      console.log(`[CharacterAudio] Idle line ended. Waiting ${this.intervalSeconds}s for next voice line.`);
      this.scheduleNextTrack('idle');
    });
  }

  /**
   * Internal helper to load and play an audio track
   * @param {string} trackSrc - Audio URL / path
   * @param {string} state - Expected state ('spawn' | 'pickup' | 'idle')
   * @param {Function} onEnded - Callback executed ONLY after audio completes speaking
   */
  playTrack(trackSrc, state, onEnded) {
    if (!trackSrc) return;

    const fileName = trackSrc.split('/').pop().replace(/\.[^/.]+$/, '');
    console.log(`[CharacterAudio] Playing [${state.toUpperCase()}] track: ${fileName}`);

    // If muted, do not produce sound but simulate delay + callback
    if (this.isMuted) {
      console.log(`[CharacterAudio] Muted. Skipping playback for: ${fileName}`);
      if (typeof onEnded === 'function') {
        onEnded();
      }
      return;
    }

    try {
      let audio = this.audioPool.get(trackSrc);
      if (audio) {
        audio.currentTime = 0;
      } else {
        audio = new Audio(trackSrc);
        audio.preload = 'auto';
        this.audioPool.set(trackSrc, audio);
      }
      this.currentAudio = audio;

      const handleEnded = () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (typeof onEnded === 'function') {
          onEnded();
        }
      };

      const handleError = (e) => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        console.warn(`[CharacterAudio] Failed to load/play audio: ${fileName}`, e);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (typeof onEnded === 'function') {
          onEnded();
        }
      };

      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[CharacterAudio] Audio play blocked or failed:', err);
          if (typeof onEnded === 'function') {
            onEnded();
          }
        });
      }
    } catch (e) {
      console.error('[CharacterAudio] Unexpected error in playTrack:', e);
      if (typeof onEnded === 'function') {
        onEnded();
      }
    }
  }

  /**
   * Schedules next track after intervalSeconds
   */
  scheduleNextTrack(state) {
    this.clearNextTimer();
    if (this.state !== state || this.state === 'stopped') return;

    this.nextTimer = setTimeout(() => {
      if (this.state === state) {
        if (state === 'idle') {
          this.playRandomIdleTrack();
        }
      }
    }, this.intervalSeconds * 1000);
  }

  /**
   * Stops currently playing audio
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
    this.isDragging = false;
    this.clearNextTimer();
    this.stopCurrentAudio();
    console.log('[CharacterAudio] Playback stopped.');
  }

  /**
   * Toggles mute state
   */
  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  /**
   * Sets mute state
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
      if (this.state === 'idle' && !this.currentAudio && !this.nextTimer) {
        this.playRandomIdleTrack();
      }
    }

    return this.isMuted;
  }
}

