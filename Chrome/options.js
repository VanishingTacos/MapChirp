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

// Load settings from storage
function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || getDefaultSettings();

    // Load toggle display
    const toggleDisplay = document.getElementById('toggleDisplay');
    if (toggleDisplay && settings.displayEnabled) {
      toggleDisplay.classList.add('on');
    }

    // Load badge style
    document.getElementById('badgeColor').value = settings.badgeColor;
    document.getElementById('textColor').value = settings.textColor;
    document.getElementById('badgeIcon').value = settings.badgeIcon;
    updateBadgePreview();

    // Load country filter
    document.getElementById('countryFilter').value = settings.countryFilter.join('\n');
  });
}

// Save settings to storage
function saveSettings() {
  const toggleDisplay = document.getElementById('toggleDisplay');
  const settings = {
    displayEnabled: toggleDisplay.classList.contains('on'),
    badgeColor: document.getElementById('badgeColor').value,
    textColor: document.getElementById('textColor').value,
    badgeIcon: document.getElementById('badgeIcon').value,
    countryFilter: document
      .getElementById('countryFilter')
      .value.split('\n')
      .map(c => c.trim())
      .filter(c => c.length > 0)
  };

  chrome.storage.local.set({ settings }, () => {
    showNotification('Settings saved successfully!', 'success');
  });
}

// Reset to default settings
function resetSettings() {
  if (confirm('Are you sure you want to reset to default settings?')) {
    const defaults = getDefaultSettings();
    chrome.storage.local.set({ settings: defaults }, () => {
      loadSettings();
      showNotification('Settings reset to defaults!', 'success');
    });
  }
}

// Get default settings
function getDefaultSettings() {
  return {
    displayEnabled: true,
    badgeColor: '#1d9bf0',
    textColor: '#ffffff',
    badgeIcon: '📍',
    countryFilter: []
  };
}

// Update badge preview
function updateBadgePreview() {
  const preview = document.getElementById('badgePreview');
  const icon = document.getElementById('badgeIcon').value || '📍';
  const bgColor = document.getElementById('badgeColor').value;
  const textColor = document.getElementById('textColor').value;

  preview.textContent = `${icon} New York`;
  preview.style.backgroundColor = bgColor;
  preview.style.color = textColor;
}

// Export data
function exportData() {
  chrome.storage.local.get(null, (items) => {
    const locationData = {};
    const now = new Date().toISOString();

    // Extract cached locations
    for (const [key, value] of Object.entries(items)) {
      if (key.startsWith('loc_') && value && value.location) {
        const username = key.substring(4);
        locationData[username] = {
          location: value.location,
          cached_at: new Date(value.timestamp).toISOString()
        };
      }
    }

    const exportObj = {
      export_date: now,
      total_locations: Object.keys(locationData).length,
      locations: locationData
    };

    const dataStr = JSON.stringify(exportObj, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `x-locations-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification(`Exported ${Object.keys(locationData).length} locations!`, 'success');
  });
}

// Toggle token visibility
function toggleTokenVisibility() {
  const container = document.getElementById('tokenContainer');
  const textarea = document.getElementById('tokenText');
  const button = document.getElementById('viewToken');

  if (container.style.display === 'none') {
    // Show token
    chrome.storage.local.get(['x_bearer_token'], (items) => {
      const token = items.x_bearer_token;

      if (token) {
        textarea.value = token;
        container.style.display = 'block';
        button.textContent = 'Hide Token';
      } else {
        showNotification('No token found. Try reloading Twitter/X.', 'error');
      }
    });
  } else {
    // Hide token
    container.style.display = 'none';
    button.textContent = 'View Token';
    textarea.value = ''; // Clear for security
  }
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Toggle display
  document.getElementById('toggleDisplay').addEventListener('click', function () {
    this.classList.toggle('on');
    const label = document.getElementById('toggleDisplayLabel');
    const isOn = this.classList.contains('on');

    // Safely update label text and strong element without using innerHTML
    while (label.firstChild) label.removeChild(label.firstChild);
    label.appendChild(document.createTextNode('Location display is '));
    const strong = document.createElement('strong');
    strong.textContent = isOn ? 'ON' : 'OFF';
    label.appendChild(strong);
  });

  // Preview updates
  document.getElementById('badgeColor').addEventListener('input', updateBadgePreview);
  document.getElementById('textColor').addEventListener('input', updateBadgePreview);
  document.getElementById('badgeIcon').addEventListener('input', updateBadgePreview);

  // Buttons
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('viewToken').addEventListener('click', toggleTokenVisibility);
});
