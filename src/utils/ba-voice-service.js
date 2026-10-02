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
const memoryVoiceCache = new Map();

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
 * Fetches and groups all available voice lines for a student from bluearchive.wiki
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

    // Map normalized titles if needed
    const normalizedMap = new Map();
    if (Array.isArray(data.query?.normalized)) {
      data.query.normalized.forEach(n => {
        normalizedMap.set(n.to, n.from);
      });
    }

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

    console.log(`[BA Voice] Resolved voice lines for "${wikiName}":`, {
      spawnCount: spawnUrls.length,
      pickupCount: pickupUrls.length,
      idleCount: idleUrls.length
    });

    // Cache valid results
    if (spawnUrls.length > 0 || pickupUrls.length > 0 || idleUrls.length > 0) {
      memoryVoiceCache.set(cacheKey, result);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch (e) {}
      }
    }

    return result;
  } catch (err) {
    console.warn(`[BA Voice] Error fetching voices for ${wikiName}:`, err);
    return null;
  }
}
