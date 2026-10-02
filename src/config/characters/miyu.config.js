/**
 * Miyu (CH0145) Character & Model Configuration
 * Packaged settings, metadata, animations and mouth setup for Miyu.
 */

export const MIYU_MODEL_CONFIG = {
  id: 'Miyu',
  name: 'MIYU // MODEL',
  subtitle: 'assets/models/miyu/Miyu.glb',
  src: './assets/models/miyu/Miyu.glb',
  scale: { x: 100, y: 100, z: 100 },
  animations: {
    idleList: [
      'CH0145_Formation_Idle',
      'CH0145_Cafe_Idle',
      'CH0145_Normal_Idle'
    ],
    defaultIdle: 'CH0145_Formation_Idle',
    pickup: 'CH0145_Formation_Pickup',
    metadataSrc: './assets/models/miyu/animations.json',
    timelines: {
      'CH0145_Formation_Pickup': [
        { time: 0, mouth: 54, label: '0.00s: Bone Base (Smile/Talk)' },
        { time: 0.33, mouth: 56, label: '0.33s: #56' },
        { time: 2.79, mouth: 8, label: '2.46s: Bone Base (Smile/Talk)' },
        { time: 7.53, mouth: 54, label: '7.53s: Bone Base (Smile/Talk)' }
      ]
    }
  },
  audio: {
    spawn: [
      'https://static.wikitide.net/bluearchivewiki/b/be/Miyu_Formation_In_1.ogg',
      'https://static.wikitide.net/bluearchivewiki/4/4b/Miyu_Formation_In_2.ogg'
    ],
    idle: [
      './assets/models/miyu/audio/idle/Miyu_Cafe_monolog_1.ogg',
      './assets/models/miyu/audio/idle/Miyu_Cafe_monolog_2.ogg',
      './assets/models/miyu/audio/idle/Miyu_Cafe_monolog_3.ogg',
      './assets/models/miyu/audio/idle/Miyu_Cafe_monolog_4.ogg'
    ],
    pickup: [
      './assets/models/miyu/audio/pickup/Miyu_Formation_Select.ogg'
    ],
    intervalSeconds: 20
  },
  mouthConfig: {
    enableMouthAtlas: true,
    atlasSrc: './assets/common/mouths/Character_Mouth_High-BgFqI_9W.png',
    atlasExtraSrc: './assets/common/mouths/All_Mouths_Transparent.png',
    mouthStyle: 'dynamic', // 'dynamic' | 'fixed'
    idleMouthIndex: 0,     // Shape 00: Closed gentle smile
    pickupMouthIndex: 33,  // Shape 33: Panic / shouting mouth
    currentMouthIndex: 0   // Shape 0 to 60 from Character_Mouth_High
  },
  placed: false,
  entityEl: null,
  iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
};

export default MIYU_MODEL_CONFIG;
