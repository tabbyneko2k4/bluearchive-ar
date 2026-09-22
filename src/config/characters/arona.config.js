/**
 * Arona Chibi VRM Character & Model Configuration
 * Packaged settings, metadata, expressions and mouth setup for Arona.
 */

export const ARONA_MODEL_CONFIG = {
  id: 'Arona',
  name: 'ARONA // CHIBI VRM',
  subtitle: 'assets/models/arona/arona.vrm',
  src: './assets/models/arona/arona.vrm',
  isVRM: true,
  scale: { x: 1, y: 1, z: 1 },
  animations: {
    idleList: ['Neutral', 'Joy', 'Smug', 'Fun'],
    defaultIdle: 'Neutral',
    pickup: 'Afraid',
    timelines: {}
  },
  audio: {
    idle: [],
    pickup: [],
    intervalSeconds: 20
  },
  mouthConfig: {
    mouthStyle: 'vrm', // 'vrm' | 'dynamic' | 'fixed'
    vowels: ['A', 'I', 'U', 'E', 'O'],
    idleMouthIndex: 'Neutral',
    pickupMouthIndex: 'O',
    currentMouthIndex: 'Neutral'
  },
  vrmConfig: {
    expressions: [
      { id: 'Neutral', label: 'NEUTRAL' },
      { id: 'Joy', label: 'JOY' },
      { id: 'Angry', label: 'ANGRY' },
      { id: 'Sorrow', label: 'SORROW' },
      { id: 'Fun', label: 'FUN' },
      { id: 'Smug', label: 'SMUG' },
      { id: 'Love', label: 'LOVE' },
      { id: 'Afraid', label: 'AFRAID' },
      { id: 'Dizzy', label: 'DIZZY' },
      { id: 'Dumb', label: 'DUMB' },
      { id: 'Excited', label: 'EXCITED' },
      { id: 'Blink', label: 'BLINK' }
    ],
    mouthVowels: ['A', 'I', 'U', 'E', 'O']
  },
  placed: false,
  entityEl: null,
  iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"></path><path d="M4 11v1a8 8 0 0 0 16 0v-1"></path><path d="M12 19v3"></path><path d="M8 22h8"></path></svg>`
};

export default ARONA_MODEL_CONFIG;
