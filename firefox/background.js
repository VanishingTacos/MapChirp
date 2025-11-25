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

// Clear old cache entries on startup and periodically
clearOldCache();
setInterval(clearOldCache, 60 * 60 * 1000); // Every hour
