// Static map image display. Uses MapBox Static Images API.
(function() {
  const countryInput = document.getElementById('countryInput');
  const zoomSelect = document.getElementById('zoomSelect');
  const applyBtn = document.getElementById('applyBtn');
  const recenterBtn = document.getElementById('recenterBtn');
  const mapContainer = document.getElementById('map');
  const statText = document.getElementById('statText');

  let users = [];
  let points = [];

  function storageGet(keys) { 
    return new Promise((resolve) => chrome.storage.local.get(keys || null, (items) => resolve(items || {}))); 
  }
  function storageSet(obj) { 
    return new Promise((resolve) => chrome.storage.local.set(obj, resolve)); 
  }
  const geocodeCacheKey = (loc) => `geo_${encodeURIComponent(loc.toLowerCase())}`;
  async function geocodeLocation(loc) {
    const key = geocodeCacheKey(loc);
    const cachedAll = await storageGet([key]);
    if (cachedAll[key] && typeof cachedAll[key].lat === 'number' && typeof cachedAll[key].lon === 'number') {
      return cachedAll[key];
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}&limit=1`;
    try {
      const resp = await fetch(url, { headers: { 'accept': 'application/json', 'accept-language': 'en' } });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (Array.isArray(data) && data[0] && data[0].lat && data[0].lon) {
        const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), t: Date.now() };
        await storageSet({ [key]: result });
        return result;
      }
    } catch (e) {}
    return null;
  }
  function filterUsersByCountry(users, country) {
    if (!country) return users;
    const c = country.toLowerCase();
    return users.filter(u => (u.location || '').toLowerCase().includes(c));
  }
  function setStat(n) { statText.textContent = `${n} user${n===1?'':'s'}`; }

  function renderStaticMap() {
    mapContainer.innerHTML = '';
    if (!points.length) {
      mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#536471;font-size:14px;">No users to display</div>';
      return;
    }
    
    let sumLat = 0, sumLon = 0;
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const p of points) { 
      sumLat += p.lat; sumLon += p.lon;
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
      minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon);
    }
    const centerLat = sumLat / points.length;
    const centerLon = sumLon / points.length;
    
    const width = Math.min(mapContainer.clientWidth || 800, 1280);
    const height = Math.min(mapContainer.clientHeight || 600, 1280);
    const zoom = Number(zoomSelect.value);
    
    const markers = points.map(p => `pin-s+e74c3c(${p.lon},${p.lat})`).join(',');
    const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${markers}/${centerLon},${centerLat},${zoom}/${width}x${height}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`;
    
    const img = document.createElement('img');
    img.src = mapUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.alt = 'Map of user locations';
    img.onerror = () => { mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#536471;font-size:14px;">Map temporarily unavailable</div>'; };
    mapContainer.appendChild(img);
    
    const userList = document.createElement('div');
    userList.style.cssText = 'position:absolute;bottom:10px;left:10px;background:rgba(255,255,255,0.95);padding:10px;border-radius:8px;max-height:200px;overflow-y:auto;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
    userList.innerHTML = '<strong>Users:</strong><br>' + points.map(p => `• @${p.username} — ${p.location}`).join('<br>');
    mapContainer.appendChild(userList);
    console.log(`Static map rendered with ${points.length} points at zoom ${zoom}`);
  }

  async function loadUsersFromStorage() {
    const all = await storageGet(null);
    const list = [];
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith('loc_') && v && typeof v.location === 'string') {
        list.push({ username: k.substring(4), location: v.location });
      }
    }
    return list;
  }

  async function buildPoints(country) {
    const filtered = filterUsersByCountry(users, country);
    setStat(filtered.length);
    const uniqueLocs = new Map();
    for (const u of filtered) {
      const key = (u.location || '').trim().toLowerCase();
      if (key && !uniqueLocs.has(key)) uniqueLocs.set(key, []);
      if (key) uniqueLocs.get(key).push(u);
    }
    const results = [];
    for (const [locKey, arr] of uniqueLocs.entries()) {
      const geo = await geocodeLocation(locKey);
      if (geo) { for (const u of arr) results.push({ username: u.username, location: u.location, lat: geo.lat, lon: geo.lon }); }
      await new Promise(r => setTimeout(r, 250));
    }
    points = results;
  }

  async function init() {
    users = await loadUsersFromStorage();
    try {
      const { map_zoom } = await storageGet(['map_zoom']);
      if (map_zoom) zoomSelect.value = String(map_zoom);
      countryInput.value = '';
    } catch (e) {}
    await apply();
  }

  async function apply() {
    const z = Number(zoomSelect.value);
    const country = countryInput.value.trim();
    await storageSet({ map_zoom: z });
    await buildPoints(country);
    renderStaticMap();
  }

  function recenter() { if (points.length) renderStaticMap(); }

  applyBtn.addEventListener('click', () => apply());
  recenterBtn.addEventListener('click', () => recenter());
  window.addEventListener('resize', () => { if (points.length) renderStaticMap(); });
  init();
})();
