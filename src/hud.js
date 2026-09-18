/**
 * MINIMALIST PIXEL HUD & AR OBJECT SPAWNER (DESIGN.md)
 * Entry module exporting and initializing the PixelHUDManager instance.
 */

import { PixelHUDManager } from './hud/hud-manager';

// Initialize HUD instance globally
window.pixelHUD = new PixelHUDManager();

export { PixelHUDManager };
