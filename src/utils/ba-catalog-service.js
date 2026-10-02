/**
 * Blue Archive Online Catalog & Asset Streamer Service
 * Integrates:
 * 1. GitHub Models Repository: https://github.com/lihaohong6/BlueArchiveModels
 * 2. Wiki API: https://api.ennead.cc/buruaka/character (from torikushiii/BlueArchiveAPI)
 * 3. SchaleDB Avatar CDN: https://schaledb.com/images/student/icon/{id}.webp
 * 4. Automatic Blue Archive Animation Classifier & Mouth Configurator
 */

const GITHUB_TREES_API = 'https://api.github.com/repos/lihaohong6/BlueArchiveModels/git/trees/main';
const WIKI_API = 'https://api.ennead.cc/buruaka/character';
const SCHALE_ICON_BASE = 'https://schaledb.com/images/student/icon';

const CACHE_KEYS = {
  MODELS: 'ba_models_tree_cache_v1',
  WIKI: 'ba_wiki_cache_v1',
  TIMESTAMP: 'ba_catalog_timestamp_v1'
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for downloaded model Blobs / BlobURLs
const downloadedBlobCache = new Map();

/**
 * Normalizes student / model names for flexible matching
 * e.g. "Aru (New Year)" -> "arunewyear"
 */
export function normalizeName(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[\s\-_()[\]{}'".]/g, '');
}

/**
 * Fetches available GLB files from lihaohong6/BlueArchiveModels GitHub repo
 */
export async function fetchGitHubModelsList() {
  try {
    // Check localStorage cache first
    const cached = localStorage.getItem(CACHE_KEYS.MODELS);
    const cachedTime = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
    if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10) < CACHE_TTL_MS)) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('[BACatalog] Cache parse error:', e);
      }
    }

    const res = await fetch(GITHUB_TREES_API);
    if (!res.ok) {
      if (res.status === 403 && cached) {
        console.warn('[BACatalog] GitHub rate limited, using cached data.');
        return JSON.parse(cached);
      }
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const tree = data.tree || [];

    const glbList = tree
      .filter(item => item.path && item.path.toLowerCase().endsWith('.glb'))
      .map(item => {
        const fileName = item.path;
        const modelName = fileName.replace(/\.glb$/i, '');
        return {
          fileName,
          modelName,
          size: item.size || 0,
          // Raw GitHub URL & jsDelivr CDN
          downloadUrl: `https://raw.githubusercontent.com/lihaohong6/BlueArchiveModels/main/${encodeURIComponent(fileName)}`,
          cdnUrl: `https://cdn.jsdelivr.net/gh/lihaohong6/BlueArchiveModels@main/${encodeURIComponent(fileName)}`
        };
      });

    // Save to cache
    localStorage.setItem(CACHE_KEYS.MODELS, JSON.stringify(glbList));
    localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());

    return glbList;
  } catch (err) {
    console.error('[BACatalog] Error fetching GitHub models:', err);
    // Fallback to cache if available
    const cached = localStorage.getItem(CACHE_KEYS.MODELS);
    if (cached) {
      return JSON.parse(cached);
    }
    return [];
  }
}

/**
 * Fetches Character Wiki database from api.ennead.cc/buruaka/character
 */
export async function fetchCharacterWikiList() {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.WIKI);
    const cachedTime = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
    if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10) < CACHE_TTL_MS)) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('[BACatalog] Wiki cache parse error:', e);
      }
    }

    const res = await fetch(WIKI_API);
    if (!res.ok) {
      throw new Error(`Wiki API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      localStorage.setItem(CACHE_KEYS.WIKI, JSON.stringify(data));
      return data;
    }
    return [];
  } catch (err) {
    console.error('[BACatalog] Error fetching character wiki:', err);
    const cached = localStorage.getItem(CACHE_KEYS.WIKI);
    if (cached) {
      return JSON.parse(cached);
    }
    return [];
  }
}

/**
 * Builds unified catalog merging Wiki data and GitHub 3D GLB Models
 */
export async function getUnifiedCharacterCatalog() {
  const [wikiList, glbList] = await Promise.all([
    fetchCharacterWikiList(),
    fetchGitHubModelsList()
  ]);

  // Index GLB models by normalized name
  const glbMap = new Map();
  glbList.forEach(item => {
    glbMap.set(normalizeName(item.modelName), item);
  });

  const matchedGlbSet = new Set();
  const catalog = [];

  // 1. Process Wiki characters
  wikiList.forEach(student => {
    const normName = normalizeName(student.name);
    let matchedGlb = glbMap.get(normName);

    // If not direct match, try partial match (e.g. "Shiroko Cycling" vs "Shiroko (Cycling)")
    if (!matchedGlb) {
      for (const [key, val] of glbMap.entries()) {
        if (key.includes(normName) || normName.includes(key)) {
          matchedGlb = val;
          break;
        }
      }
    }

    if (matchedGlb) {
      matchedGlbSet.add(matchedGlb.fileName);
    }

    catalog.push({
      id: student.id,
      name: student.name,
      school: student.school || 'Unknown',
      role: student.role || 'Striker',
      bulletType: student.bulletType || 'Normal',
      armorType: student.armorType || 'Normal',
      rarity: student.rarity || 'SSR',
      profile: student.profile || 'No profile information available.',
      avatarUrl: `${SCHALE_ICON_BASE}/${student.id}.webp`,
      hasModel: Boolean(matchedGlb),
      modelFileName: matchedGlb ? matchedGlb.fileName : null,
      modelSize: matchedGlb ? matchedGlb.size : 0,
      downloadUrl: matchedGlb ? matchedGlb.downloadUrl : null,
      cdnUrl: matchedGlb ? matchedGlb.cdnUrl : null,
      source: 'wiki'
    });
  });

  // 2. Add remaining GLB models that might not have a Wiki match (NPCs, special variants)
  glbList.forEach(item => {
    if (!matchedGlbSet.has(item.fileName)) {
      catalog.push({
        id: `glb_${normalizeName(item.modelName)}`,
        name: item.modelName,
        school: 'Special / NPC',
        role: 'Unknown',
        bulletType: 'Special',
        armorType: 'Special',
        rarity: 'SSR',
        profile: `3D Model from Blue Archive archive (${item.fileName}).`,
        avatarUrl: './assets/preview.jpg',
        hasModel: true,
        modelFileName: item.fileName,
        modelSize: item.size,
        downloadUrl: item.downloadUrl,
        cdnUrl: item.cdnUrl,
        source: 'github-only'
      });
    }
  });

  return catalog;
}

/**
 * Downloads a GLB model file with stream progress callback
 * @param {string} url - Direct download URL
 * @param {function} onProgress - Callback (percent: 0-100, loadedBytes, totalBytes)
 * @returns {Promise<string>} Blob URL ready for Three.js / A-Frame
 */
export async function downloadGLBWithProgress(url, onProgress = null) {
  if (downloadedBlobCache.has(url)) {
    if (onProgress) onProgress(100, 1, 1);
    return downloadedBlobCache.get(url);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download model: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  if (!response.body || !total) {
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    downloadedBlobCache.set(url, blobUrl);
    if (onProgress) onProgress(100, blob.size, blob.size);
    return blobUrl;
  }

  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (onProgress && total > 0) {
      const pct = Math.min(100, Math.round((loaded / total) * 100));
      onProgress(pct, loaded, total);
    }
  }

  const blob = new Blob(chunks, { type: 'model/gltf-binary' });
  const blobUrl = URL.createObjectURL(blob);
  downloadedBlobCache.set(url, blobUrl);
  return blobUrl;
}

/**
 * Automatically classifies and configures Blue Archive animations & mouth setup
 * Compatible with A-Frame 'model-animator' component and debug-studio.html
 */
export function autoDetectBAAnimations(clips, modelId = 'Character', rawName = 'Character') {
  const names = clips.map(c => (typeof c === 'string' ? c : c.name)).filter(Boolean);

  // 1. Formation / Cafe / Normal Idle
  const formationIdle = names.find(n => /formation.*idle/i.test(n));
  const cafeIdle = names.find(n => /cafe.*idle/i.test(n));
  const normalIdle = names.find(n => /normal.*idle/i.test(n));
  const fallbackIdle = names.find(n => /idle/i.test(n)) || names[0] || '';

  const idleList = [formationIdle, cafeIdle, normalIdle].filter(Boolean);
  if (idleList.length === 0 && fallbackIdle) {
    idleList.push(fallbackIdle);
  }

  // 2. Pickup / Drag interaction
  const pickup = names.find(n => /pickup/i.test(n)) ||
                 names.find(n => /vital.*panic/i.test(n)) ||
                 names.find(n => /cafe.*reaction/i.test(n)) ||
                 (names.length > 1 ? names[1] : names[0]) || '';

  // 3. Movement / Combat / Victory categorizations
  const combatList = names.filter(n => /attack|reload|exs/i.test(n));
  const moveList = names.filter(n => /move|walk|run/i.test(n));
  const victoryList = names.filter(n => /victory/i.test(n));

  return {
    id: modelId,
    name: `${rawName.toUpperCase()} // BA ONLINE`,
    subtitle: `Online Streamed GLB (${names.length} clips)`,
    scale: { x: 100, y: 100, z: 100 }, // Blue Archive models are exported in cm (x0.01 scale)
    animations: {
      defaultIdle: formationIdle || fallbackIdle,
      idleList: idleList,
      pickup: pickup,
      combat: combatList,
      move: moveList,
      victory: victoryList,
      allClips: names
    },
    mouthConfig: {
      atlasSrc: './assets/common/mouths/Character_Mouth_High-BgFqI_9W.png',
      atlasExtraSrc: './assets/common/mouths/All_Mouths_Transparent.png',
      mouthStyle: 'dynamic',
      idleMouthIndex: 0,
      pickupMouthIndex: 33
    },
    placed: false,
    entityEl: null
  };
}

// Attach globally for debug studio or vanilla scripts
if (typeof window !== 'undefined') {
  window.BACatalogService = {
    fetchGitHubModelsList,
    fetchCharacterWikiList,
    getUnifiedCharacterCatalog,
    downloadGLBWithProgress,
    autoDetectBAAnimations,
    normalizeName
  };
}
