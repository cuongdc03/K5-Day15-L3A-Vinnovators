/* OCP2 geographic 3D pilot: MapLibre + OpenFreeMap, lazy loaded without keys.
   Buildings use provider geometry/heights; no procedural buildings are added. */
(function () {
  'use strict';
  const VERSION = '6.20.0';
  const CDN = `https://unpkg.com/maplibre-gl@${VERSION}/dist/`;
  const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
  const REGION = [[105.960, 20.929], [105.998, 20.958]];
  const CENTER = [105.977, 20.9508];
  const container = document.getElementById('geo3dMap');
  const status = document.getElementById('geo3dStatus');
  const overview = document.getElementById('geo3dOverview');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let map = null, library = null, loading = null, ready = false, attempt = 0;
  let places = [], selected = null, lastSelected = null, popup = null, active = false;
  let buildingLayer = null, lastError = '', lastDataKey = '';
  let generation = 0;

  function showStatus(message, failed = false) {
    const sourceInfo = document.getElementById('mapSourceInfo');
    if (failed && sourceInfo) sourceInfo.open = true;
    status.replaceChildren();
    status.hidden = false;
    status.classList.toggle('is-error', failed);
    const text = document.createElement('span');
    text.textContent = message;
    status.appendChild(text);
    if (failed) {
      const back = document.createElement('button');
      back.type = 'button';
      back.textContent = 'Dùng bản đồ 2D';
      back.addEventListener('click', () => window.setMapMode('real'));
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Thử lại';
      retry.addEventListener('click', () => {
        ready = false;
        if (map) map.remove();
        map = null; ready = false; loading = null; lastDataKey = ''; lastSelected = null;
        sync(places, selected);
      });
      status.append(back, retry);
    }
  }

  function loadCSS() {
    const existing = document.getElementById('maplibreCSS');
    if (existing && existing.sheet) return Promise.resolve();
    if (existing) existing.remove();
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.id = 'maplibreCSS'; link.rel = 'stylesheet'; link.href = CDN + 'maplibre-gl.css';
      link.onload = resolve; link.onerror = () => reject(new Error('Không tải được CSS bản đồ'));
      document.head.appendChild(link);
    });
  }

  const collection = (features) => ({ type: 'FeatureCollection', features });
  const feature = (p) => ({ type: 'Feature', id: p.id,
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    properties: { place_id: p.id, name: p.name, label: p.v,
      color: ({ local: '#4d6b1f', chain: '#9a2f1f', tourist: '#7a5c00', unsure: '#3b4c63' })[p.v] || '#3b4c63' } });

  function addBuildings() {
    const layers = map.getStyle().layers || [];
    for (const layer of layers) if (layer.type === 'symbol' && /poi/i.test(layer.id)) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
    const footprint = layers.find((layer) => layer['source-layer'] === 'building');
    if (!footprint) return;
    buildingLayer = 'ocp2-buildings-3d';
    const before = layers.find((layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']);
    const height = ['max', 0, ['to-number', ['get', 'render_height'], ['get', 'height'], 0]];
    map.addLayer({ id: buildingLayer, type: 'fill-extrusion', source: footprint.source,
      'source-layer': 'building', minzoom: 14,
      // Vector tiles merge many separate footprints into MultiPolygons. A
      // `within` filter would discard a whole merged feature at the boundary.
      // Keep geographic context; maxBounds + the OSM outline define the pilot.
      filter: ['all', ['!=', ['get', 'hide_3d'], true], ['>', height, 0]],
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], height, 0, '#d9c6a3', 15, '#b7bda0', 60, '#8caaa3'],
        'fill-extrusion-height': height,
        'fill-extrusion-base': ['max', 0, ['to-number', ['get', 'render_min_height'], ['get', 'min_height'], 0]],
        'fill-extrusion-opacity': 0.88,
      },
    }, before ? before.id : undefined);
  }

  function addPlaces() {
    map.addSource('ocp2-places', { type: 'geojson', data: collection([]), cluster: true, clusterRadius: 70, clusterMaxZoom: 18 });
    map.addSource('ocp2-selection', { type: 'geojson', data: collection([]) });
    map.addLayer({ id: 'ocp2-clusters', type: 'circle', source: 'ocp2-places', filter: ['has', 'point_count'],
      paint: { 'circle-color': '#fffaf0', 'circle-radius': ['step', ['get', 'point_count'], 12, 10, 15, 30, 18], 'circle-stroke-width': 1.5, 'circle-stroke-color': '#2a2622', 'circle-opacity': 0.9 } });
    map.addLayer({ id: 'ocp2-cluster-count', type: 'symbol', source: 'ocp2-places', filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-allow-overlap': false },
      paint: { 'text-color': '#2a2622' } });
    map.addLayer({ id: 'ocp2-points', type: 'circle', source: 'ocp2-places', filter: ['!', ['has', 'point_count']],
      paint: { 'circle-color': ['get', 'color'], 'circle-radius': 4.5, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fffaf0', 'circle-opacity': 0.85 } });
    map.addLayer({ id: 'ocp2-selected', type: 'circle', source: 'ocp2-selection',
      paint: { 'circle-color': ['get', 'color'], 'circle-radius': 7, 'circle-stroke-width': 3, 'circle-stroke-color': '#c2410c' } });
    for (const layer of ['ocp2-points', 'ocp2-selected']) {
      map.on('click', layer, (event) => {
        const id = event.features && event.features[0].properties.place_id;
        if (id) window.select(id);
      });
    }
    map.on('click', 'ocp2-clusters', async (event) => {
      try {
        const cluster = event.features[0];
        const zoom = await map.getSource('ocp2-places').getClusterExpansionZoom(cluster.properties.cluster_id);
        map.easeTo({ center: cluster.geometry.coordinates, zoom: Math.min(zoom, 19), duration: reduced ? 0 : 350 });
      } catch (error) { showStatus('Chưa mở được cụm địa điểm. Bạn có thể phóng to bằng nút +.'); }
    });
    for (const layer of ['ocp2-points', 'ocp2-selected', 'ocp2-clusters']) {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    }
  }

  function showSelected(p) {
    if (popup) { popup.remove(); popup = null; }
    if (!p) return;
    const body = document.createElement('div'); body.className = 'geo3d-popup';
    const name = document.createElement('b'); name.textContent = p.name;
    const address = document.createElement('p'); address.textContent = p.address;
    const detail = document.createElement('button'); detail.type = 'button'; detail.textContent = 'Xem thông tin quán';
    detail.addEventListener('click', () => {
      if (window.isMobileLayout()) window.setMobileTab('list');
      const card = document.querySelector(`.card[data-id="${CSS.escape(String(p.id))}"]`);
      if (card) { window.scrollToPlaceCard(p.id, 'auto'); card.querySelector('.card-toggle').focus({ preventScroll: true }); }
    });
    const directions = document.createElement('a'); directions.textContent = 'Chỉ đường ↗';
    directions.href = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
    directions.target = '_blank'; directions.rel = 'noopener noreferrer';
    body.append(name, address, detail, directions);
    popup = new library.Popup({ offset: 16, maxWidth: '260px', closeOnClick: false })
      .setLngLat([p.lng, p.lat]).setDOMContent(body).addTo(map);
    map.easeTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 16.5), pitch: 55,
      duration: reduced ? 0 : 400 });
  }

  function updateData() {
    if (!ready || !active) return;
    const showPOI = !window.state || state.showPOI !== false;
    for (const layer of ['ocp2-clusters', 'ocp2-cluster-count', 'ocp2-points', 'ocp2-selected']) {
      map.setLayoutProperty(layer, 'visibility', showPOI ? 'visible' : 'none');
    }
    map.setPaintProperty('ocp2-points', 'circle-opacity', selected ? 0.22 : 0.85);
    map.setPaintProperty('ocp2-clusters', 'circle-opacity', selected ? 0.4 : 0.9);
    const chosen = places.find((p) => p.id === selected);
    const key = places.map((p) => p.id).join(',') + ':' + (chosen ? chosen.id : '');
    if (key !== lastDataKey) {
      map.getSource('ocp2-places').setData(collection(places.filter((p) => !chosen || p.id !== chosen.id).map(feature)));
      map.getSource('ocp2-selection').setData(collection(chosen ? [feature(chosen)] : []));
      lastDataKey = key;
    }
    const popupId = showPOI && chosen ? chosen.id : null;
    if (popupId !== lastSelected) {
      lastSelected = popupId;
      showSelected(showPOI ? chosen : null);
    }
  }

  function coverageNotice() {
    if (!active || !ready) return;
    const count = buildingLayer ? map.queryRenderedFeatures({ layers: [buildingLayer] }).length : 0;
    showStatus(count
      ? 'OCP2 · Hình khối OSM/OpenFreeMap. Chiều cao theo nguồn, có thể là giá trị suy ra.'
      : 'OCP2 · Chưa thấy khối nhà từ nguồn ở góc nhìn này. Thử phóng to; dữ liệu có thể chưa phủ đủ.');
    container.dataset.renderedBuildings = String(count);
  }

  async function initialize() {
    const epoch = ++generation;
    showStatus('Đang tải bản đồ 3D Ocean Park 2…');
    lastError = ''; container.dataset.ready = 'false';
    attempt++;
    let timer;
    try {
      const result = await Promise.race([
        Promise.all([import(CDN + 'maplibre-gl.mjs' + (attempt > 1 ? `?retry=${attempt}` : '')), loadCSS(),
          fetch('./data/ocp2-boundary.geojson').then((response) => {
            if (!response.ok) throw new Error('Không tải được ranh giới OCP2');
            return response.json();
          })]),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Hết thời gian tải thư viện')), 20000); }),
      ]);
      clearTimeout(timer);
      if (epoch !== generation) return;
      library = result[0];
      const boundary = result[2];
      map = new library.Map({ container, style: STYLE, center: CENTER, zoom: 16,
        pitch: 55, bearing: -25, maxBounds: REGION, minZoom: 13, maxZoom: 19,
        canvasContextAttributes: { antialias: true }, attributionControl: { compact: true } });
      map.addControl(new library.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(new library.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
      const currentMap = map;
      let failLoad;
      map.on('error', (event) => {
        if (epoch !== generation) return;
        lastError = event.error ? event.error.message : 'Lỗi tải bản đồ';
        if (!ready) showStatus('Chưa tải được bản đồ 3D. Kiểm tra kết nối hoặc dùng bản đồ 2D.', true);
        if (!currentMap.getStyle() && failLoad) failLoad(event.error || new Error('Không tải được style'));
      });
      map.on('webglcontextlost', () => showStatus('Thiết bị tạm mất khả năng hiển thị 3D. Bạn có thể chuyển về 2D.', true));
      await new Promise((resolve, reject) => {
        failLoad = reject;
        timer = setTimeout(() => reject(new Error('Hết thời gian tải nền bản đồ')), 25000);
        currentMap.once('load', resolve);
      });
      clearTimeout(timer);
      if (epoch !== generation) return;
      addBuildings();
      map.addSource('ocp2-boundary', { type: 'geojson', data: boundary });
      map.addLayer({ id: 'ocp2-boundary-line', type: 'line', source: 'ocp2-boundary',
        paint: { 'line-color': '#c2410c', 'line-width': 2, 'line-dasharray': [3, 2] } });
      addPlaces();
      ready = true; container.dataset.ready = 'true';
      map.on('idle', coverageNotice);
      resize(); updateData(); coverageNotice();
    } catch (error) {
      clearTimeout(timer);
      if (epoch !== generation) return;
      lastError = error.message;
      if (map) { map.remove(); map = null; }
      ready = false; container.dataset.ready = 'false';
      showStatus('Không tải được bản đồ 3D. Kiểm tra kết nối hoặc dùng bản đồ 2D.', true);
    }
  }

  function resize() {
    if (map && active && container.clientWidth && container.clientHeight) map.resize();
  }

  function sync(shown, selectedId) {
    active = !!(window.state && window.state.district === 'van_giang' && window.state.mapMode === '3d');
    places = (shown || []).filter((p) => p.district === 'van_giang' && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    selected = selectedId;
    if (!active) { if (popup) popup.remove(); popup = null; lastSelected = null; if (map) map.stop(); return; }
    if (!loading) loading = initialize();
    resize(); updateData();
  }

  if (overview) overview.addEventListener('click', () => {
    if (ready) map.fitBounds([[105.9630619, 20.9323887], [105.9941753, 20.9543815]],
      { padding: { top: 100, bottom: 90, left: 35, right: 55 }, pitch: 50, bearing: -25, duration: reduced ? 0 : 500 });
  });
  window.OCP2Map = { sync, resize, getMap: () => map,
    diagnostics: () => ({ ready, active, placeCount: places.length, selected, buildingLayer, lastError, version: VERSION }) };
})();
