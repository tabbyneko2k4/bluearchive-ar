/**
 * Built-in 3D Model Catalog Configuration
 */
export const MODEL_CONFIGS = [
  {
    id: 'kazusa',
    name: 'KAZUSA // MODEL',
    subtitle: 'assets/models/kazusa.glb',
    src: './assets/models/kazusa.glb',
    scale: { x: 1, y: 1, z: 1 },
    placed: false,
    entityEl: null,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
  },
  {
    id: 'reimu',
    name: 'REIMU // FUMO',
    subtitle: 'assets/models/reimu_fumo.glb',
    src: './assets/models/reimu_fumo.glb',
    scale: { x: 1, y: 1, z: 1 },
    placed: false,
    entityEl: null,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
  },
  {
    id: 'vietjet',
    name: 'VIETJET // AIRPLANE',
    subtitle: 'assets/models/vietjet.glb',
    src: './assets/models/vietjet.glb',
    scale: { x: 0.3, y: 0.3, z: 0.3 },
    placed: false,
    entityEl: null,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"></path></svg>`
  }
];
