/**
 * Blue Archive Online Catalog & Asset Streamer Service
 * Integrates:
 * 1. GitHub Models Repository: https://github.com/lihaohong6/BlueArchiveModels
 * 2. Official Community Wiki API: https://bluearchive.wiki/w/api.php
 * 3. Secondary Wiki API: https://api.ennead.cc/buruaka/character (from torikushiii/BlueArchiveAPI)
 * 4. Automatic Blue Archive Animation Classifier (Preserves native model mouth animations)
 */

const GITHUB_TREES_API = 'https://api.github.com/repos/lihaohong6/BlueArchiveModels/git/trees/main';
const BLUE_ARCHIVE_WIKI_API = 'https://bluearchive.wiki/w/api.php';
const MODEL_VIEWER_RAW_URL = 'https://bluearchive.wiki/wiki/Module:ModelViewer/data.json?action=raw';
const WIKI_API = 'https://api.ennead.cc/buruaka/character';
const SCHALE_ICON_BASE = 'https://schaledb.com/images/student/icon';
const SCHALE_PORTRAIT_BASE = 'https://schaledb.com/images/student/portrait';

// Clean SVG Fallback Avatar (eliminates 404 image errors)
export const FALLBACK_AVATAR = "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3e%3crect width='100%25' height='100%25' fill='%231e293b'/%3e%3ccircle cx='50' cy='38' r='18' fill='%2338bdf8'/%3e%3cpath d='M25 82c0-14 11-24 25-24s25 10 25 24' fill='%2338bdf8'/%3e%3c/svg%3e";

const CACHE_KEYS = {
  MODELS: 'ba_models_tree_cache_v4',
  WIKI: 'ba_wiki_cache_v4',
  MODEL_VIEWER: 'ba_model_viewer_cache_v5',
  TIMESTAMP: 'ba_catalog_timestamp_v4'
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for downloaded model Blobs / BlobURLs
const downloadedBlobCache = new Map();

/**
 * Smart normalizer for student and model names:
 * Bridges aliases (Bunny Girl -> Bunny, Riding -> Cycling, Camping -> Camp, Cheerleader -> Cheer Squad,
 * Kid -> Small, Pajama -> Pajamas, Pop Idol -> Idol, fullwidth asterisks, scenario/carrier props)
 */
export function cleanStudentName(s) {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/bunny girl/g, 'bunny')
    .replace(/arisu/g, 'aris')
    .replace(/riding/g, 'cycling')
    .replace(/camping/g, 'camp')
    .replace(/cheerleader/g, 'cheersquad')
    .replace(/kid/g, 'small')
    .replace(/sportswear|tracksuit|gym/g, 'track')
    .replace(/armed/g, 'battle')
    .replace(/pajamas?/g, 'pajamas')
    .replace(/pop\s*idol/g, 'idol')
    .replace(/\s*\(carrier.*?\)/g, '')
    .replace(/\s*\(scenario.*?\)/g, '')
    .replace(/\s*\(weapon.*?\)/g, '')
    .replace(/\s*\(no weapon.*?\)/g, '')
    .replace(/\s*\(cafe.*?\)/g, '')
    .replace(/\s*\(cut-in.*?\)/g, '')
    .replace(/\s*\(normal.*?\)/g, '')
    .replace(/\s*\(school uniform.*?\)/g, '')
    .replace(/\s*\(\d+\)/g, '')
    .replace(/＊/g, '*')
    .replace(/[\s\-_()[\]{}'"]/g, '');
}

export function normalizeName(str) {
  return cleanStudentName(str);
}

/**
 * Fetches Wiki ModelViewer official database:
 * https://bluearchive.wiki/wiki/Module:ModelViewer/data.json?action=raw
 * Provides exact mapping of students to their various 3D models/costumes.
 */
export async function fetchModelViewerDatabase() {
  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.MODEL_VIEWER);
      const cachedTime = localStorage.getItem(`${CACHE_KEYS.MODEL_VIEWER}_time`);
      if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10) < CACHE_TTL_MS)) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.characters) && parsed.characters.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
  }

  // 1. Fetch via MediaWiki API with origin=* (guarantees CORS in all browsers)
  try {
    const apiUrl = `${BLUE_ARCHIVE_WIKI_API}?action=query&prop=revisions&titles=Module:ModelViewer/data.json&rvprop=content&rvslots=main&format=json&origin=*`;
    const res = await fetch(apiUrl);
    if (res.ok) {
      const data = await res.json();
      const page = Object.values(data.query?.pages || {})[0];
      const rawContent = page?.revisions?.[0]?.slots?.main?.['*'];
      if (rawContent) {
        const parsed = JSON.parse(rawContent);
        if (parsed && Array.isArray(parsed.characters) && parsed.characters.length > 0) {
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem(CACHE_KEYS.MODEL_VIEWER, JSON.stringify(parsed));
              localStorage.setItem(`${CACHE_KEYS.MODEL_VIEWER}_time`, Date.now().toString());
            } catch (e) {}
          }
          console.log(`[BACatalog] Loaded ${parsed.characters.length} characters from Wiki ModelViewer database.`);
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[BACatalog] MediaWiki query for ModelViewer failed, trying raw fallback...', err);
  }

  // 2. Direct raw fetch fallback
  try {
    const res = await fetch(MODEL_VIEWER_RAW_URL);
    if (res.ok) {
      const parsed = await res.json();
      if (parsed && Array.isArray(parsed.characters) && parsed.characters.length > 0) {
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(CACHE_KEYS.MODEL_VIEWER, JSON.stringify(parsed));
            localStorage.setItem(`${CACHE_KEYS.MODEL_VIEWER}_time`, Date.now().toString());
          } catch (e) {}
        }
        return parsed;
      }
    }
  } catch (e) {}

  // 3. Fallback to cached version if exists
  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.MODEL_VIEWER);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
  }

  return { base: 'https://cdn.jsdelivr.net/gh/lihaohong6/BlueArchiveModels@main/', characters: [] };
}

/**
 * Fetches available GLB files from lihaohong6/BlueArchiveModels GitHub repo
 */
export async function fetchGitHubModelsList() {
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEYS.MODELS);
      const cachedTime = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
      if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10) < CACHE_TTL_MS)) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {}
      }
    }

    const res = await fetch(GITHUB_TREES_API);
    if (!res.ok) {
      if (res.status === 403 && typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(CACHE_KEYS.MODELS);
        if (cached) return JSON.parse(cached);
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
          downloadUrl: `https://raw.githubusercontent.com/lihaohong6/BlueArchiveModels/main/${encodeURIComponent(fileName)}`,
          cdnUrl: `https://cdn.jsdelivr.net/gh/lihaohong6/BlueArchiveModels@main/${encodeURIComponent(fileName)}`
        };
      });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CACHE_KEYS.MODELS, JSON.stringify(glbList));
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
    }

    return glbList;
  } catch (err) {
    console.error('[BACatalog] Error fetching GitHub models:', err);
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEYS.MODELS);
      if (cached) return JSON.parse(cached);
    }
    return [];
  }
}

/**
 * Fetches Character Wiki database from bluearchive.wiki (MediaWiki API)
 * with automatic fallback to api.ennead.cc/buruaka/character
 */
export async function fetchCharacterWikiList() {
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEYS.WIKI);
      const cachedTime = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
      if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10) < CACHE_TTL_MS)) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }

    // 1. Primary Source: official community bluearchive.wiki API
    try {
      const wikiUrl = `${BLUE_ARCHIVE_WIKI_API}?action=query&generator=categorymembers&gcmtitle=Category:Characters&gcmlimit=500&prop=pageprops|categories&cllimit=500&format=json&origin=*`;
      const res = await fetch(wikiUrl);
      if (res.ok) {
        const data = await res.json();
        const pages = Object.values(data.query?.pages || {});
        if (pages.length > 0) {
          const wikiList = pages.map(p => {
            const title = p.title;
            const props = p.pageprops || {};
            const cats = (p.categories || []).map(c => c.title.replace(/_/g, ' '));

            const schoolCat = cats.find(c => /Students of /i.test(c));
            const school = schoolCat ? schoolCat.replace(/.*Students of /i, '').trim() : 'Kivotos';

            const roleCat = cats.find(c => /Characters with role /i.test(c));
            const role = roleCat ? roleCat.replace(/.*Characters with role /i, '').trim() : 'Striker';

            const rarityCat = cats.find(c => /star rarity/i.test(c));
            const rarityMatch = rarityCat ? rarityCat.match(/(\d+)\s*star/i) : null;
            const rarity = rarityMatch ? `${rarityMatch[1]}★` : '3★';

            const safeTitle = encodeURIComponent(title.replace(/ /g, '_'));
            const avatarUrl = `https://bluearchive.wiki/wiki/Special:FilePath/Portrait_${safeTitle}.png`;
            const portraitUrl = `https://bluearchive.wiki/wiki/Special:FilePath/${safeTitle}.png`;
            const wikiUrl = `https://bluearchive.wiki/wiki/${safeTitle}`;

            return {
              id: cleanStudentName(title),
              name: title,
              school,
              role,
              rarity,
              profile: props.description || 'Student of Kivotos Academy.',
              avatarUrl,
              portraitUrl,
              wikiUrl,
              source: 'bluearchive.wiki'
            };
          });

          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(CACHE_KEYS.WIKI, JSON.stringify(wikiList));
          }
          return wikiList;
        }
      }
    } catch (wikiErr) {
      console.warn('[BACatalog] bluearchive.wiki query failed, trying secondary fallback...', wikiErr);
    }

    // 2. Secondary fallback: api.ennead.cc/buruaka/character
    const res = await fetch(WIKI_API);
    if (!res.ok) {
      throw new Error(`Wiki API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      const fallbackList = data.map(student => ({
        id: student.id,
        name: student.name,
        school: student.school || 'Kivotos',
        role: student.role || 'Striker',
        rarity: student.rarity || '3★',
        profile: student.profile || 'Student of Kivotos Academy.',
        avatarUrl: `${SCHALE_ICON_BASE}/${student.id}.webp`,
        portraitUrl: `${SCHALE_PORTRAIT_BASE}/${student.id}.webp`,
        wikiUrl: `https://bluearchive.wiki/wiki/${encodeURIComponent(student.name.replace(/ /g, '_'))}`,
        source: 'ennead'
      }));

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CACHE_KEYS.WIKI, JSON.stringify(fallbackList));
      }
      return fallbackList;
    }
    return [];
  } catch (err) {
    console.error('[BACatalog] Error fetching character wiki:', err);
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEYS.WIKI);
      if (cached) return JSON.parse(cached);
    }
    return [];
  }
}

/**
 * Builds unified catalog by integrating ModelViewer database (multi-model student support),
 * official Wiki dossiers, and GitHub GLB repositories.
 */
export async function getUnifiedCharacterCatalog() {
  const [wikiList, glbList, modelViewerData] = await Promise.all([
    fetchCharacterWikiList(),
    fetchGitHubModelsList(),
    fetchModelViewerDatabase()
  ]);

  const baseCdnUrl = modelViewerData.base || 'https://cdn.jsdelivr.net/gh/lihaohong6/BlueArchiveModels@main/';
  const modelViewerCharacters = modelViewerData.characters || [];

  // Matcher function linking character name to Wiki dossiers
  function findStudentInfo(charName) {
    let found = wikiList.find(w => w.name === charName);
    if (found) return found;

    const cClean = cleanStudentName(charName);
    found = wikiList.find(w => cleanStudentName(w.name) === cClean);
    if (found) return found;

    if (charName.includes('(')) {
      const baseName = charName.split('(')[0].trim();
      found = wikiList.find(w => cleanStudentName(w.name) === cleanStudentName(baseName));
    }
    return found;
  }

  const catalog = [];
  const processedModelFiles = new Set();

  // 1. Process characters from ModelViewer database (grouped with all costumes/variants)
  modelViewerCharacters.forEach(char => {
    const student = findStudentInfo(char.name);
    const safeTitle = encodeURIComponent((student ? student.name : char.name).replace(/ /g, '_'));

    const avatarUrl = student && student.avatarUrl
      ? student.avatarUrl
      : `https://bluearchive.wiki/wiki/Special:FilePath/Portrait_${safeTitle}.png`;

    const portraitUrl = student && student.portraitUrl
      ? student.portraitUrl
      : `https://bluearchive.wiki/wiki/Special:FilePath/${safeTitle}.png`;

    const wikiUrl = student && student.wikiUrl
      ? student.wikiUrl
      : `https://bluearchive.wiki/wiki/${safeTitle}`;

    // Transform models array with complete metadata
    const models = (char.models || []).map(m => {
      const file = m.file;
      const fileName = decodeURIComponent(file);
      processedModelFiles.add(fileName.toLowerCase());

      const skinName = m.skin && m.skin.trim() !== '' ? m.skin : 'Original';
      const modelId = m.id || fileName.replace(/\.glb$/i, '');
      const label = m.label || modelId;

      const glbMeta = glbList.find(g => g.fileName.toLowerCase() === fileName.toLowerCase());
      const size = glbMeta ? glbMeta.size : 0;

      return {
        id: modelId,
        label: label,
        skin: skinName,
        fileName: fileName,
        file: file,
        size: size,
        downloadUrl: `https://raw.githubusercontent.com/lihaohong6/BlueArchiveModels/main/${file}`,
        cdnUrl: `${baseCdnUrl}${file}`,
        hasModel: true
      };
    });

    const defaultModel = models.length > 0 ? models[0] : null;

    catalog.push({
      id: cleanStudentName(char.name),
      name: char.name,
      wikiName: student ? student.name : char.name,
      school: student ? (student.school || 'Kivotos') : 'Kivotos',
      role: student ? (student.role || 'Striker') : 'Striker',
      rarity: student ? (student.rarity || '3★') : '3★',
      profile: student ? student.profile : `Student of Kivotos Academy. Has ${models.length} 3D model variants.`,
      avatarUrl: avatarUrl,
      portraitUrl: portraitUrl,
      wikiUrl: wikiUrl,
      hasModel: models.length > 0,
      hasMultipleModels: models.length > 1,
      models: models,
      modelCount: models.length,
      defaultModel: defaultModel,
      modelFileName: defaultModel ? defaultModel.fileName : '',
      downloadUrl: defaultModel ? defaultModel.downloadUrl : '',
      cdnUrl: defaultModel ? defaultModel.cdnUrl : '',
      modelSize: defaultModel ? defaultModel.size : 0
    });
  });

  // 2. Add any standalone GLBs from GitHub that weren't in ModelViewer database
  glbList.forEach(glb => {
    if (processedModelFiles.has(glb.fileName.toLowerCase())) return;

    const student = findStudentInfo(glb.modelName);
    const safeTitle = encodeURIComponent((student ? student.name : glb.modelName).replace(/ /g, '_'));

    const singleModel = {
      id: glb.modelName,
      label: glb.modelName,
      skin: 'Original',
      fileName: glb.fileName,
      file: encodeURIComponent(glb.fileName),
      size: glb.size,
      downloadUrl: glb.downloadUrl,
      cdnUrl: glb.cdnUrl,
      hasModel: true
    };

    catalog.push({
      id: cleanStudentName(glb.modelName),
      name: glb.modelName,
      wikiName: student ? student.name : glb.modelName,
      school: student ? (student.school || 'Special / NPC') : 'Special / NPC',
      role: student ? (student.role || 'Special') : 'Special',
      rarity: student ? (student.rarity || '3★') : '3★',
      profile: student ? student.profile : `3D Model from Blue Archive archive (${glb.fileName}).`,
      avatarUrl: student && student.avatarUrl ? student.avatarUrl : `https://bluearchive.wiki/wiki/Special:FilePath/Portrait_${safeTitle}.png`,
      portraitUrl: student && student.portraitUrl ? student.portraitUrl : `https://bluearchive.wiki/wiki/Special:FilePath/${safeTitle}.png`,
      wikiUrl: student && student.wikiUrl ? student.wikiUrl : `https://bluearchive.wiki/wiki/${safeTitle}`,
      hasModel: true,
      hasMultipleModels: false,
      models: [singleModel],
      modelCount: 1,
      defaultModel: singleModel,
      modelFileName: glb.fileName,
      downloadUrl: glb.downloadUrl,
      cdnUrl: glb.cdnUrl,
      modelSize: glb.size
    });
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
 * Automatically classifies Blue Archive animations WITHOUT touching mouth animations or textures.
 * Model's native bone-driven mouth and face animations remain 100% active and untouched.
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
    subtitle: `Online Model (${names.length} clips)`,
    scale: { x: 1, y: 1, z: 1 }, // Blue Archive models from GitHub repository have native 1:1 scale (meters)
    animations: {
      defaultIdle: formationIdle || fallbackIdle,
      idleList: idleList,
      pickup: pickup,
      combat: combatList,
      move: moveList,
      victory: victoryList,
      allClips: names
    },
    // Mouth atlas is DISABLED for online models because they already have native mouth bone animations in the GLB
    mouthConfig: {
      enableMouthAtlas: false
    },
    placed: false,
    entityEl: null
  };
}

// Attach globally for debug studio or vanilla scripts
if (typeof window !== 'undefined') {
  window.BACatalogService = {
    fetchModelViewerDatabase,
    fetchGitHubModelsList,
    fetchCharacterWikiList,
    getUnifiedCharacterCatalog,
    downloadGLBWithProgress,
    autoDetectBAAnimations,
    cleanStudentName,
    normalizeName,
    FALLBACK_AVATAR
  };
}
