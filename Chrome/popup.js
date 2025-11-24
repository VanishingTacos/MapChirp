// Update stats when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  updateStats();
  setupEventListeners();
});

// Notification helper
function showNotification(message, type = 'info', duration = 4000) {
  const notificationEl = document.getElementById('notification');
  if (!notificationEl) return;

  notificationEl.textContent = message;
  notificationEl.className = `notification show ${type}`;

  if (duration > 0) {
    setTimeout(() => {
      notificationEl.classList.remove('show');
    }, duration);
  }
}

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
  // Clear cache button
  const clearCacheButton = document.getElementById('clearCache');
  if (clearCacheButton) {
    clearCacheButton.addEventListener('click', clearCache);
  }

  // Options button
  const optionsButton = document.getElementById('openOptions');
  if (optionsButton) {
    optionsButton.addEventListener('click', openOptions);
  }
}

/**
 * Updates the statistics displayed in popup
 */
async function updateStats() {
  chrome.storage.local.get(null, (items) => {
    // Count cache entries
    const cacheEntries = Object.keys(items).filter(key => key.startsWith('loc_'));
    const cacheCountElement = document.getElementById('cacheCount');
    if (cacheCountElement) {
      cacheCountElement.textContent = cacheEntries.length;
    }

    // Update status
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = 'Active';
      statusElement.style.color = '#00ba7c';
    }
  });
}

/**
 * Clears the location cache
 */
function clearCache() {
  chrome.storage.local.get(null, (items) => {
    const keysToRemove = Object.keys(items).filter(key => key.startsWith('loc_'));

    if (keysToRemove.length === 0) {
      showNotification('Cache is already empty!', 'info');
      return;
    }

    chrome.storage.local.remove(keysToRemove, () => {
      showNotification(`Cleared ${keysToRemove.length} cached locations!`, 'success');
      updateStats();
    });
  });
}

/**
 * Opens options page (placeholder for future settings)
 */
function openOptions() {
  chrome.runtime.openOptionsPage();
}
