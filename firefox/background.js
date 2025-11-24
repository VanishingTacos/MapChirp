// Persistent cache using chrome.storage
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Instrumentation: record when the background script is executed so popup can show load time
// Storage helpers: use `browser.storage.local` (Promise) when available,
// otherwise fall back to `chrome.storage.local` wrapped in Promises.
const storageGet = (keys) => {
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
    return browser.storage.local.get(keys);
  }
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (result) => resolve(result));
    } catch (e) {
      resolve({});
    }
  });
};

const storageSet = (items) => {
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
    return browser.storage.local.set(items);
  }
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set(items, () => resolve());
    } catch (e) {
      resolve();
    }
  });
};

const storageRemove = (keys) => {
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
    return browser.storage.local.remove(keys);
  }
  return new Promise((resolve) => {
    try {
      chrome.storage.local.remove(keys, () => resolve());
    } catch (e) {
      resolve();
    }
  });
};

// Record startup time (best-effort)
storageSet({ extension_loaded_time: Date.now() }).catch(() => {});

/**
 * Validates username format
 */
function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  // Twitter usernames: 1-15 chars, alphanumeric + underscore
  return /^[a-zA-Z0-9_]{1,15}$/.test(username);
}

/**
 * Fetches and parses location from user's About page
 */
async function fetchLocationFromAbout(username) {
  try {
    // Validate username
    if (!isValidUsername(username)) {
      return null;
    }

    // First check persistent cache
    const cached = await getCachedLocation(username);
    if (cached) {
      return cached;
    }

    // Fetch the about page
    const response = await fetch(`https://x.com/${username}/about`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Parse location from HTML
    const location = extractLocationFromHTML(html);

    if (location) {
      await cacheLocation(username, location);
    }

    return location;
  } catch (error) {
    return null;
  }
}

/**
 * Sanitizes location string
 */
function sanitizeLocation(location) {
  if (!location || typeof location !== 'string') return null;
  const trimmed = location.trim();
  // Validate reasonable length and not a placeholder
  if (trimmed.length < 1 || trimmed.length > 100) return null;
  if (['null', 'undefined', 'N/A', 'n/a'].includes(trimmed.toLowerCase())) return null;
  return trimmed;
}

/**
 * Extracts location from About page HTML
 */
function extractLocationFromHTML(html) {
  try {
    if (!html || typeof html !== 'string') return null;

    // Try to find location in various patterns
    const patterns = [
      // Pattern 1: Look for "Based in" text
      /Based in[:\s]+([^<>\"]+?)(?:<|\")/i,
      // Pattern 2: Look for location data attribute
      /data-location="([^"]+)"/i,
      // Pattern 3: Look for country/region text
      /Country\/region[:\s]+([^<>\"]+?)(?:<|\")/i,
      // Pattern 4: Look in JSON-LD data
      /"location"\s*:\s*"([^"]+)"/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const sanitized = sanitizeLocation(match[1]);
        if (sanitized) {
          return sanitized;
        }
      }
    }

    // Try to extract from script tags containing initial state
    const scriptMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
    if (scriptMatch) {
      try {
        const initialState = JSON.parse(scriptMatch[1]);
        // Navigate the object to find location data
        const entities = initialState?.entities?.users?.entities;
        if (entities && typeof entities === 'object') {
          for (const user of Object.values(entities)) {
            if (user?.location) {
              const sanitized = sanitizeLocation(user.location);
              if (sanitized) {
                return sanitized;
              }
            }
          }
        }
      } catch (e) {
        // Silently handle JSON parsing errors
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Gets cached location from storage
 */
async function getCachedLocation(username) {
  try {
    const result = await storageGet([`loc_${username}`]);
    const cached = result && result[`loc_${username}`];
    if (cached && cached.timestamp && typeof cached.timestamp === 'number') {
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        const sanitized = sanitizeLocation(cached.location);
        return sanitized;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Saves location to cache
 */
async function cacheLocation(username, location) {
  try {
    const sanitized = sanitizeLocation(location);
    if (!sanitized || !isValidUsername(username)) return;
    await storageSet({
      [`loc_${username}`]: {
        location: sanitized,
        timestamp: Date.now()
      }
    });
  } catch (e) {
    // Silently ignore
  }
}

/**
 * Clears old cache entries
 */
async function clearOldCache() {
  try {
    const items = await storageGet(null);
    const keysToRemove = [];
    const now = Date.now();

    for (const [key, value] of Object.entries(items || {})) {
      if (key.startsWith('loc_') && value && typeof value === 'object') {
        if (value.timestamp && typeof value.timestamp === 'number') {
          if (now - value.timestamp > CACHE_DURATION) {
            keysToRemove.push(key);
          }
        }
      }
    }

    if (keysToRemove.length > 0) {
      await storageRemove(keysToRemove);
    }
  } catch (error) {
    // Silently handle errors
  }
}

// Listen for messages from content script
// Use `browser.runtime.onMessage` when available for Promise-style APIs,
// fall back to `chrome.runtime.onMessage` if needed.
const runtimeOnMessage = (typeof browser !== 'undefined' && browser.runtime && browser.runtime.onMessage)
  ? browser.runtime.onMessage
  : chrome.runtime.onMessage;

runtimeOnMessage.addListener((request, sender, sendResponse) => {
  try {
    // Validate request
    if (!request || typeof request !== 'object') {
      sendResponse({ location: null });
      return false;
    }

    if (request.action === 'fetchLocation') {
      // Validate username
      if (!isValidUsername(request.username)) {
        sendResponse({ location: null });
        return false;
      }

      fetchLocationFromAbout(request.username)
        .then(location => sendResponse({ location: location || null }))
        .catch(error => {
          sendResponse({ location: null });
        });
      return true; // Keep the message channel open for async response
    }
  } catch (error) {
    sendResponse({ location: null });
    return false;
  }
});

// Clear old cache entries on startup and periodically
clearOldCache();
setInterval(clearOldCache, 60 * 60 * 1000); // Every hour
