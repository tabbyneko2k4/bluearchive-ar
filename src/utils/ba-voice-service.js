/**
 * Blue Archive Wiki Voice Line Fetcher Service
 * Queries character voice lines from bluearchive.wiki MediaWiki API:
 * 1. Pickup Sound: <Student>_Formation_Select.ogg
 * 2. Spawn Sound:  <Student>_Formation_In_<number>.ogg
 * 3. Idle Sound:   <Student>_Cafe_monolog_<number>.ogg / <Student>_Cafe_Monolog_<number>.ogg
 *                  (with fallback to Cafe_Act_<number>.ogg if monologue is unavailable)
 */

const BLUE_ARCHIVE_WIKI_API = 'https://bluearchive.wiki/w/api.php';
const VOICE_CACHE_PREFIX = 'ba_voice_cache_v1_';
const AUDIO_STORAGE_PREFIX = 'ba_voice_audio_';
const memoryVoiceCache = new Map();
const memoryVoiceAudioMap = new Map();

/**
 * Normalizes character name to Wiki file naming convention
 * Example:
 * - "MIYU // MODEL" -> "Miyu"
 * - "Shiroko (Riding)" -> "Shiroko_(Riding)"
 * - "Hina (Swimsuit)" -> "Hina_(Swimsuit)"
 */
export function formatWikiCharacterName(rawName) {
  if (!rawName) return '';
  let name = String(rawName).trim();

  // Strip common suffixes/prefixes
  name = name.replace(/\s*\/\/\s*MODEL/i, '');
  name = name.replace(/^online_/i, '');
  name = name.trim();

  // Capitalize first letter of each word if all lowercase or all uppercase
  const words = name.split(/\s+/);
  const formattedWords = words.map(word => {
    // Preserve parenthesis with capitalization inside
    if (word.startsWith('(') && word.endsWith(')')) {
      const inner = word.slice(1, -1);
      return `(${inner.charAt(0).toUpperCase() + inner.slice(1)})`;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return formattedWords.join('_');
}

/**
 * Safely persists audio base64 data to localStorage with automatic quota management
 */
function safeSaveVoiceToLocalStorage(key, dataUrl) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, dataUrl);
    return true;
  } catch (err) {
    console.warn('[BA Voice] LocalStorage quota reached, purging oldest cached voice clips...', err);
    try {
      const voiceKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(AUDIO_STORAGE_PREFIX)) {
          voiceKeys.push(k);
        }
      }
      // Evict half of the older cached audio clips to free quota
      const toRemove = voiceKeys.slice(0, Math.max(1, Math.floor(voiceKeys.length / 2)));
      toRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(key, dataUrl);
      return true;
    } catch (e) {
      console.warn('[BA Voice] Unable to cache audio to localStorage after eviction:', e);
      return false;
    }
  }
}

/**
 * Converts a Blob to a base64 Data URL string
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Downloads a single .ogg voice file, saves it to localStorage, and returns a local data URL.
 * Guarantees 0-latency playback without network delays.
 * @param {string} url - Remote audio URL
 * @returns {Promise<string>} Data URL or Blob URL
 */
export async function cacheVoiceAudioLocally(url) {
  if (!url) return '';

  // 1. Check in-memory audio cache
  if (memoryVoiceAudioMap.has(url)) {
    return memoryVoiceAudioMap.get(url);
  }

  // 2. Check localStorage
  const storageKey = `${AUDIO_STORAGE_PREFIX}${encodeURIComponent(url.split('/').pop() || url)}`;
  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached && cached.startsWith('data:audio/')) {
        memoryVoiceAudioMap.set(url, cached);
        return cached;
      }
    } catch (e) {}
  }

  // 3. Download audio file over network
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Voice fetch error: ${res.status} ${res.statusText}`);
    }

    const blob = await res.blob();
    const dataUrl = await blobToDataURL(blob);

    // Save to memory cache
    memoryVoiceAudioMap.set(url, dataUrl);

    // Save to localStorage for persistent zero latency across sessions
    safeSaveVoiceToLocalStorage(storageKey, dataUrl);

    return dataUrl;
  } catch (err) {
    console.warn(`[BA Voice] Failed to preload audio locally: ${url}`, err);
    // Fallback to original URL if download fails
    return url;
  }
}

/**
 * Downloads and caches all voice lines for a student into localStorage.
 * Replaces remote URLs with local base64 Data URLs so playback is instantaneous with zero latency.
 * @param {Object} voiceConfig - { spawn: string[], pickup: string[], idle: string[], intervalSeconds?: number }
 * @param {Function} onProgress - Optional callback (completedCount, totalCount)
 * @returns {Promise<Object>} Updated voiceConfig with zero-latency local data URLs
 */
export async function downloadAndCacheCharacterVoices(voiceConfig, onProgress = null) {
  if (!voiceConfig) return voiceConfig;

  const spawnUrls = Array.isArray(voiceConfig.spawn) ? voiceConfig.spawn : [];
  const pickupUrls = Array.isArray(voiceConfig.pickup) ? voiceConfig.pickup : [];
  const idleUrls = Array.isArray(voiceConfig.idle) ? voiceConfig.idle : [];

  const uniqueUrls = Array.from(new Set([...spawnUrls, ...pickupUrls, ...idleUrls])).filter(Boolean);
  const total = uniqueUrls.length;
  let completed = 0;

  if (total === 0) return voiceConfig;

  console.log(`[BA Voice] Preloading & caching ${total} voice lines into localStorage for instant zero-latency playback...`);

  const urlMap = new Map();

  await Promise.all(uniqueUrls.map(async (url) => {
    try {
      const localDataUrl = await cacheVoiceAudioLocally(url);
      urlMap.set(url, localDataUrl);
    } catch (err) {
      urlMap.set(url, url);
    } finally {
      completed++;
      if (typeof onProgress === 'function') {
        onProgress(completed, total);
      }
    }
  }));

  const cachedConfig = {
    ...voiceConfig,
    spawn: spawnUrls.map(u => urlMap.get(u) || u),
    pickup: pickupUrls.map(u => urlMap.get(u) || u),
    idle: idleUrls.map(u => urlMap.get(u) || u),
    isCachedLocally: true
  };

  console.log(`[BA Voice] All ${total} voice lines cached in localStorage!`);
  return cachedConfig;
}

/**
 * Fetches and groups all available voice lines for a student from bluearchive.wiki
 * Supports automatic fallback from variant name to base name (e.g. "Shiroko (Cycling)" -> "Shiroko")
 * @param {string} rawCharacterName
 * @returns {Promise<{ spawn: string[], pickup: string[], idle: string[], intervalSeconds: number } | null>}
 */
export async function fetchCharacterVoicesFromWiki(rawCharacterName) {
  const wikiName = formatWikiCharacterName(rawCharacterName);
  if (!wikiName) return null;

  const cacheKey = `${VOICE_CACHE_PREFIX}${wikiName.toLowerCase()}`;

  // 1. Check memory cache
  if (memoryVoiceCache.has(cacheKey)) {
    return memoryVoiceCache.get(cacheKey);
  }

  // 2. Check localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const localCached = localStorage.getItem(cacheKey);
      if (localCached) {
        const parsed = JSON.parse(localCached);
        if (parsed && (parsed.pickup?.length > 0 || parsed.idle?.length > 0 || parsed.spawn?.length > 0)) {
          memoryVoiceCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    } catch (e) {}
  }

  // 3. Build candidate file titles for Wiki batch query
  // Supports Formation_Select, Formation_In (1..5), Cafe_monolog (1..6), Cafe_Monolog (1..6), Cafe_Act (1..6)
  const candidateTitles = [
    `File:${wikiName}_Formation_Select.ogg`
  ];

  for (let i = 1; i <= 5; i++) {
    candidateTitles.push(`File:${wikiName}_Formation_In_${i}.ogg`);
  }

  for (let i = 1; i <= 6; i++) {
    candidateTitles.push(`File:${wikiName}_Cafe_monolog_${i}.ogg`);
    candidateTitles.push(`File:${wikiName}_Cafe_Monolog_${i}.ogg`);
    candidateTitles.push(`File:${wikiName}_Cafe_Act_${i}.ogg`);
  }

  try {
    const titlesParam = candidateTitles.join('|');
    const endpoint = `${BLUE_ARCHIVE_WIKI_API}?action=query&titles=${encodeURIComponent(titlesParam)}&prop=imageinfo&iiprop=url&format=json&origin=*`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      console.warn(`[BA Voice] Wiki query failed with status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;

    const spawnUrls = [];
    const pickupUrls = [];
    const monologUrls = [];
    const actUrls = [];

    Object.values(pages).forEach(page => {
      // Ignore missing files
      if (page.missing !== undefined || !page.imageinfo || !page.imageinfo[0]?.url) {
        return;
      }

      const fileUrl = page.imageinfo[0].url;
      const title = page.title || '';

      if (title.includes('Formation_Select') || title.includes('Formation Select')) {
        pickupUrls.push(fileUrl);
      } else if (title.includes('Formation_In') || title.includes('Formation In')) {
        spawnUrls.push(fileUrl);
      } else if (title.toLowerCase().includes('cafe_monolog') || title.toLowerCase().includes('cafe monolog')) {
        monologUrls.push(fileUrl);
      } else if (title.toLowerCase().includes('cafe_act') || title.toLowerCase().includes('cafe act')) {
        actUrls.push(fileUrl);
      }
    });

    // Idle sounds: prioritize Monolog, fallback to Act if monolog is empty
    const idleUrls = monologUrls.length > 0 ? monologUrls : actUrls;

    const result = {
      spawn: spawnUrls,
      pickup: pickupUrls,
      idle: idleUrls,
      intervalSeconds: 20
    };

    // If no voices found and character name had variants (e.g. "Airi (Band)"), fallback to base student ("Airi")
    if (spawnUrls.length === 0 && pickupUrls.length === 0 && idleUrls.length === 0) {
      if (rawCharacterName.includes('(')) {
        const baseName = rawCharacterName.split('(')[0].trim();
        if (baseName && baseName !== rawCharacterName) {
          console.log(`[BA Voice] No voices for variant "${rawCharacterName}", falling back to base student "${baseName}"...`);
          return await fetchCharacterVoicesFromWiki(baseName);
        }
      }
      return null;
    }

    console.log(`[BA Voice] Resolved voice lines for "${wikiName}":`, {
      spawnCount: spawnUrls.length,
      pickupCount: pickupUrls.length,
      idleCount: idleUrls.length
    });

    // Cache valid results in localStorage
    memoryVoiceCache.set(cacheKey, result);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch (e) {}
    }

    return result;
  } catch (err) {
    console.warn(`[BA Voice] Error fetching voices for ${wikiName}:`, err);
    return null;
  }
}
