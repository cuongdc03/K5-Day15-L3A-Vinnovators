/* Logic UI đọc đúng dữ liệu phân loại quán ăn theo chuẩn đề bài
   và giữ đủ cầu nối với web-demo/map3d-multi.js:
   PLACES, state, matches, hiddenReason, select, Map3D.sync(). */

const FALLBACK_PLACES = [
  {
    place_id: 'p_gl_001', name: 'Bún Chả Quanh Trâu Quỳ (mẫu)', dish: 'Bún chả',
    address: 'Khu Trâu Quỳ, gần VinUni', district: 'gia_lam', lat: 21.0068, lng: 105.9375, x: 220, y: 180,
    price_min_k: 35, price_max_k: 45, label: 'local', confidence: 91,
    reason: '1 địa chỉ độc lập, giá 0.85× trung vị Gia Lâm, 100% review tiếng Việt.',
    signals: [
      { key: 'Chi nhánh HN', value: '1 địa chỉ (≤3 là local)' },
      { key: 'Giá vs quận', value: '35k–45k (0.85× trung vị)' },
      { key: 'Review ngoại', value: '0% (toàn tiếng Việt)' }
    ],
    review_links: [
      { source: 'Google', lang: 'VI', published_at: '2026-10', text_excerpt: 'Chả nướng than thơm, suất 40k đầy đặn hợp sinh viên.', url: 'https://maps.google.com/?q=Trau+Quy+Gia+Lam+Ha+Noi' }
    ]
  },
  {
    place_id: 'p_gl_002', name: 'Phở Bò 4 Cơ Sở OCP1 (mẫu ca xám)', dish: 'Phở bò',
    address: 'Khu shophouse Ocean Park 1', district: 'gia_lam', lat: 20.9942, lng: 105.9481, x: 385, y: 235,
    price_min_k: 50, price_max_k: 60, label: 'unsure', confidence: 48,
    reason: 'Trùng tên chuẩn ở đúng 4 địa chỉ tại Hà Nội, chưa có trong danh mục chuỗi.',
    signals: [
      { key: 'Chi nhánh HN', value: '4 địa chỉ (ca xám: >3 và <5)' },
      { key: 'Danh mục chuỗi', value: 'Chưa có trong danh sách chuỗi' },
      { key: 'Hàng đợi', value: 'Đã chuyển người kiểm duyệt' }
    ],
    review_links: [
      { source: 'Google', lang: 'VI', published_at: '2026-11', text_excerpt: 'Nước dùng ổn, quán sạch nhưng giá nhỉnh hơn bên Trâu Quỳ.', url: 'https://maps.google.com/?q=Ocean+Park+1+Gia+Lam' }
    ]
  },
  {
    place_id: 'p_gl_003', name: 'Cơm Tấm Cổng Học Viện (mẫu)', dish: 'Cơm tấm',
    address: 'Đường Thành Trung, Gia Lâm', district: 'gia_lam', lat: 21.0031, lng: 105.9410, x: 295, y: 140,
    price_min_k: 30, price_max_k: 40, label: 'local', confidence: 89,
    reason: '1 địa chỉ độc lập, giá bình dân, lên món nhanh.',
    signals: [
      { key: 'Chi nhánh HN', value: '1 địa chỉ' },
      { key: 'Giá vs quận', value: '30k–40k (0.8× trung vị)' }
    ],
    review_links: []
  },
  {
    place_id: 'p_gl_004', name: 'Highlands Coffee — OCP1', dish: 'Cà phê',
    address: 'Vinhomes Ocean Park 1, Gia Lâm', district: 'gia_lam', lat: 20.9915, lng: 105.9512, x: 470, y: 355,
    price_min_k: 45, price_max_k: 65, label: 'chain', confidence: 99,
    reason: 'Có trong danh sách chuỗi toàn quốc (>60 địa chỉ tại Hà Nội).',
    signals: [{ key: 'Danh mục chuỗi', value: 'Chuỗi toàn quốc đã kiểm chứng' }],
    review_links: []
  },
  {
    place_id: 'p_hk_001', name: 'Bún Chả Ngõ Nhỏ (mẫu)', dish: 'Bún chả',
    address: 'Phố Hàng Mành, Hoàn Kiếm', district: 'hoan_kiem', lat: 21.0322, lng: 105.8479, x: 232, y: 176,
    price_min_k: 50, price_max_k: 60, label: 'local', confidence: 92,
    reason: '1 địa chỉ độc lập, review khen mùi than hoa, giá ngang trung vị quận.',
    signals: [{ key: 'Chi nhánh HN', value: '1 địa chỉ' }, { key: 'Giá vs quận', value: '55k (1.0× trung vị)' }],
    review_links: [{ source: 'Google', lang: 'VI', published_at: '2026-10', text_excerpt: 'Mùi than hoa đúng kiểu cũ, nước chấm vừa miệng.', url: 'https://maps.google.com/?q=Hang+Manh+Hoan+Kiem' }]
  },
  {
    place_id: 'p_hk_003', name: 'Phở Gia Truyền Cầu Gỗ (mẫu ca xám)', dish: 'Phở bò',
    address: 'Phố Cầu Gỗ, Hoàn Kiếm', district: 'hoan_kiem', lat: 21.0320, lng: 105.8522, x: 312, y: 206,
    price_min_k: 55, price_max_k: 65, label: 'unsure', confidence: 52,
    reason: 'Đúng 4 địa chỉ cùng tên tại Hà Nội, chưa xác minh thuộc chuỗi hay hộ gia đình.',
    signals: [{ key: 'Chi nhánh HN', value: '4 địa chỉ (ca xám)' }, { key: 'Hàng đợi', value: 'Chờ người kiểm duyệt' }],
    review_links: []
  },
  {
    place_id: 'p_hk_004', name: 'Hanoi Authentic Pho House (mẫu)', dish: 'Phở bò',
    address: 'Phố Tạ Hiện, Hoàn Kiếm', district: 'hoan_kiem', lat: 21.0348, lng: 105.8521, x: 396, y: 168,
    price_min_k: 120, price_max_k: 140, label: 'tourist', confidence: 87,
    reason: 'Đủ 3/4 tín hiệu: menu song ngữ, giá 2.0× trung vị quận, 82% review tiếng nước ngoài.',
    signals: [{ key: 'Tín hiệu du lịch', value: 'Menu song ngữ · giá 2× · nhiều review ngoại' }],
    review_links: [{ source: 'Google', lang: 'EN', published_at: '2026-10', text_excerpt: 'Nice photo spot right on the corner, English menu outside.', url: 'https://maps.google.com/?q=Ta+Hien+Hoan+Kiem' }]
  },
  {
    place_id: 'p_hk_005', name: 'Cà phê Cộng — Nhà Thờ', dish: 'Cà phê cốt dừa',
    address: 'Phố Nhà Thờ, Hoàn Kiếm', district: 'hoan_kiem', lat: 21.0289, lng: 105.8492, x: 130, y: 350,
    price_min_k: 45, price_max_k: 60, label: 'chain', confidence: 94,
    reason: 'Chuỗi gốc Hà Nội, xuất hiện ở >5 địa chỉ.',
    signals: [{ key: 'Danh mục chuỗi', value: 'Chuỗi gốc Hà Nội (>5 cơ sở)' }],
    review_links: []
  },
  {
    place_id: 'p_cg_001', name: 'Bún Đậu Ngõ Duy Tân (mẫu)', dish: 'Bún đậu mẹt',
    address: 'Ngõ 76 Duy Tân, Cầu Giấy', district: 'cau_giay', lat: 21.0312, lng: 105.7834, x: 240, y: 210,
    price_min_k: 40, price_max_k: 55, label: 'local', confidence: 90,
    reason: '1 địa chỉ trong ngõ, giá 0.9× trung vị Cầu Giấy, khách Việt ăn đông.',
    signals: [{ key: 'Chi nhánh HN', value: '1 địa chỉ' }, { key: 'Giá vs quận', value: '45k (0.9× trung vị)' }],
    review_links: []
  },
  {
    place_id: 'p_hbt_001', name: 'Miến Lươn Khu Bách Khoa (mẫu)', dish: 'Miến lươn trộn',
    address: 'Tạ Quang Bửu, Hai Bà Trưng', district: 'hai_ba_trung', lat: 21.0045, lng: 105.8468, x: 265, y: 240,
    price_min_k: 40, price_max_k: 50, label: 'local', confidence: 93,
    reason: 'Quán gia đình 1 địa chỉ lâu năm khu Bách Khoa, giá 0.9× trung vị quận.',
    signals: [{ key: 'Chi nhánh HN', value: '1 địa chỉ' }, { key: 'Giá vs quận', value: '45k (0.9× trung vị)' }],
    review_links: []
  },
  {
    place_id: 'p_hm_001', name: 'Quán Cơm Mới Mở Linh Đàm (mẫu)', dish: 'Cơm bình dân',
    address: 'Bán đảo Linh Đàm, Hoàng Mai', district: 'hoang_mai', lat: 20.9662, lng: 105.8291, x: 320, y: 290,
    price_min_k: 40, price_max_k: 50, label: 'unsure', confidence: 41,
    reason: 'Mới có 2 review công khai (<3 tối thiểu) — chưa đủ tín hiệu để kết luận.',
    signals: [{ key: 'Số review', value: '2 review (<3 tối thiểu)' }, { key: 'Hàng đợi', value: 'Chờ người kiểm duyệt' }],
    review_links: []
  }
];

const DISTRICTS = {
  gia_lam: 'Gia Lâm · VinUni/OCP',
  hoan_kiem: 'Hoàn Kiếm',
  cau_giay: 'Cầu Giấy',
  hai_ba_trung: 'Hai Bà Trưng',
  hoang_mai: 'Hoàng Mai',
  van_giang: 'Ocean Park 2 · Hưng Yên'
};

const SUPPORTED_3D = new Set(['gia_lam', 'van_giang', 'hoan_kiem', 'cau_giay', 'hai_ba_trung', 'hoang_mai']);
const DISTANCE_ORIGIN = { gia_lam: 'VinUni', van_giang: 'VinUni' };

const VINUNI_POS = [20.9889, 105.9447];
const OCP2_CENTER_POS = [20.9468, 105.9752];

const DISTRICT_CENTER = {
  gia_lam: [VINUNI_POS, 15],
  hoan_kiem: [[21.0315, 105.8505], 15],
  cau_giay: [[21.0335, 105.7850], 15],
  hai_ba_trung: [[21.0055, 105.8475], 15],
  hoang_mai: [[20.9685, 105.8300], 14],
  van_giang: [[20.9516, 105.9764], 15]
};

const PIN_COLOR = {
  local: '#4d6b1f',
  chain: '#9a2f1f',
  tourist: '#7a5c00',
  unsure: '#3b4c63'
};

const LABEL_VI = {
  local: 'Local',
  chain: 'Chuỗi',
  tourist: 'Bẫy du lịch',
  unsure: 'Chưa chắc'
};

const ICON = {
  local: '<svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>',
  chain: '<svg viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="2" fill="currentColor"/></svg>',
  tourist: '<svg viewBox="0 0 12 12"><path d="M6 .5 11.5 6 6 11.5.5 6Z" fill="currentColor"/></svg>',
  unsure: '<svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
};

const REFUSE_RE = /(an toan|attp|ve sinh|sach khong|ngo doc|review xau|boc phot|lua dao|danh gia 1 sao|bo qua huong dan)/i;
const VIEW_STORAGE_KEY = 'qthn_view_mode';
const QUEUE_STORAGE_KEY = 'qthn_flag_queue';

function loadSavedQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}

function saveQueue() {
  try { localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(state.flagQueue)); } catch (e) { /* noop */ }
}

function calcDistText(p) {
  if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return '';
  const m = Number.isFinite(p.distance_m) ? p.distance_m : distanceFromVinUni(p.lat, p.lng);
  if (m < 1000) return `${Math.round(m / 10) * 10}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function distanceFromVinUni(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Infinity;
  const ref = VINUNI_POS;
  const R = 6371000;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat - ref[0]);
  const dLng = toRad(lng - ref[1]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(ref[0])) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(Math.min(1, a))));
}

/* Minh hoạ ký họa món ăn theo phong cách "Nét bút phố cổ" */
function dishThumbSVG(dish) {
  const s = strip(dish);
  if (/(pho|bun|mien)/.test(s)) {
    return '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h24a12 12 0 0 1-24 0z" fill="rgba(77,107,31,0.16)"/><path d="M12 18v-2m6 2v-3m6 3v-2"/><path d="M13 12c0-2.5 2-2.5 2-5M19 11c0-2.5 2-2.5 2-5"/><path d="M23 15l8-6M25 17l7-4"/><path d="M12 31h12"/></svg>';
  }
  if (/(ca phe|coffee|tra|nuoc)/.test(s)) {
    return '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14h15v10a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6V14z" fill="rgba(194,65,12,0.16)"/><path d="M23 16h3.5a3 3 0 0 1 0 6H23"/><path d="M12 10c0-2 2-2 2-4M17 10c0-2 2-2 2-4"/><path d="M6 31h20"/></svg>';
  }
  if (/(com|ga)/.test(s)) {
    return '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="18" cy="22" rx="12" ry="7" fill="rgba(224,165,38,0.2)"/><path d="M10 21c1-5 15-5 16 0" fill="rgba(255,250,240,0.9)"/><circle cx="15" cy="21" r="2.2" fill="rgba(194,65,12,0.35)"/><circle cx="21" cy="22" r="2" fill="rgba(77,107,31,0.35)"/><path d="M6 26c4 4 20 4 24 0"/></svg>';
  }
  if (/(banh)/.test(s)) {
    return '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="18" cy="23" rx="12" ry="6" fill="rgba(214,180,120,0.28)"/><path d="M10 20c3-4 13-4 16 0" fill="rgba(255,250,240,0.9)"/><path d="M12 22c3-2 9-2 12 0"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/><circle cx="20" cy="17.5" r="1.2" fill="currentColor"/></svg>';
  }
  return '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h24a12 12 0 0 1-24 0z" fill="rgba(77,107,31,0.16)"/><path d="M12 18v-2m6 2v-3m6 3v-2"/><path d="M13 12c0-2.5 2-2.5 2-5M19 11c0-2.5 2-2.5 2-5"/><path d="M23 15l8-6M25 17l7-4"/><path d="M12 31h12"/></svg>';
}

let usingFallbackData = false;
let map3dLoading = false;
let liveDataMeta = null;

const $ = (s) => document.querySelector(s);

/* Các biến toàn cục làm cầu nối với map3d-multi.js */
window.PLACES = [];
window.state = {
  district: 'gia_lam',
  mapMode: 'real',
  viewMode: 'desktop',
  mobileTab: 'list',
  q: '',
  budget: 'all',
  shopeeOnly: false,
  sort: 'nearest',
  showPOI: true,
  hideChain: true,
  hideTourist: true,
  sel: null,
  flagQueue: loadSavedQueue(),
  reportTarget: null,
  visibleCount: 40
};

let realMap = null;
let markerLayer = null;
let areaBoundaryLayer = null;
let lastMapDistrict = null;
let lastShownPlaces = [];
let mapZoomFrame = null;

function isMobileLayout() {
  return document.body.classList.contains('mobile-mode') || window.innerWidth <= 768;
}

function refreshMaps(refit) {
  const run = () => {
    const mapWrap = $('#mapwrap');
    const isVisible = mapWrap && mapWrap.offsetWidth > 0 && mapWrap.offsetHeight > 0;
    if (realMap && isVisible && state.mapMode === 'real') {
      realMap.invalidateSize(true);
      if (refit) {
        lastMapDistrict = null;
        syncRealMap(lastShownPlaces);
      }
    }
    window.dispatchEvent(new Event('resize'));
    if (window.Map3D) Map3D.sync();
    if (window.OCP2Map) OCP2Map.resize();
  };
  requestAnimationFrame(() => setTimeout(run, 50));
  setTimeout(run, 220);
}

function getInitialViewMode() {
  try {
    const urlView = new URLSearchParams(window.location.search).get('view');
    if (urlView === 'mobile' || urlView === 'desktop') return urlView;
  } catch (e) { /* bỏ qua nếu không đọc được query */ }
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'mobile' || saved === 'desktop') return saved;
  } catch (e) { /* bỏ qua nếu bị chặn storage */ }
  return window.innerWidth <= 768 ? 'mobile' : 'desktop';
}

function setViewMode(mode, opts = {}) {
  const { persist = true, updateUrl = false } = opts;
  const next = mode === 'mobile' ? 'mobile' : 'desktop';
  state.viewMode = next;
  document.body.classList.toggle('mobile-mode', next === 'mobile');
  document.querySelectorAll('.vs-btn[data-view]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.view === next));
  });
  if (persist) {
    try { localStorage.setItem(VIEW_STORAGE_KEY, next); } catch (e) { /* noop */ }
  }
  if (updateUrl) {
    try {
      const url = new URL(window.location.href);
      if (next === 'mobile') url.searchParams.set('view', 'mobile');
      else url.searchParams.delete('view');
      window.history.replaceState({}, '', url);
    } catch (e) { /* noop trên file:// */ }
  }
  closeQueueDrawer();
  refreshMaps(true);
}

function setBottomNavSelected(activeTab) {
  document.querySelectorAll('.bnav-btn[data-mtab]').forEach((btn) => {
    btn.setAttribute('aria-selected', String(btn.dataset.mtab === activeTab));
  });
}

function openQueueDrawer() {
  const drawer = $('#queueDrawer');
  const backdrop = $('#queueBackdrop');
  if (drawer) drawer.hidden = false;
  if (backdrop) backdrop.hidden = !isMobileLayout();
  if (isMobileLayout()) setBottomNavSelected('report');
}

function closeQueueDrawer() {
  const drawer = $('#queueDrawer');
  const backdrop = $('#queueBackdrop');
  if (drawer) drawer.hidden = true;
  if (backdrop) backdrop.hidden = true;
  if (isMobileLayout()) setBottomNavSelected(state.mobileTab);
}

function setMobileTab(tab) {
  if (tab === 'report') {
    const isOpen = !$('#queueDrawer').hidden;
    if (isOpen) closeQueueDrawer();
    else openQueueDrawer();
    return;
  }
  state.mobileTab = tab === 'map' ? 'map' : 'list';
  $('#demo').dataset.mtab = state.mobileTab;
  closeQueueDrawer();
  setBottomNavSelected(state.mobileTab);
  if (state.mobileTab === 'map') {
    refreshMaps(true);
  } else if (state.sel) {
    requestAnimationFrame(() => scrollToPlaceCard(state.sel, 'auto'));
  }
}

function initRealMap() {
  if (!window.L || realMap) return;
  const [center, zoom] = DISTRICT_CENTER[state.district];
  realMap = L.map('realMap', { zoomControl: true }).setView(center, zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(realMap);
  markerLayer = L.layerGroup().addTo(realMap);
  fetch('./data/areas.geojson').then((response) => {
    if (!response.ok) throw new Error('Area boundaries unavailable');
    return response.json();
  }).then((data) => {
    areaBoundaryLayer = L.geoJSON(data, { interactive: false, style: (feature) => ({
      color: feature.properties.district === state.district ? '#c2410c' : '#8c806e',
      weight: 2, dashArray: '6 5', fillOpacity: 0.025,
    }) }).addTo(realMap);
  }).catch(() => { /* Base map and sourced restaurant coordinates remain usable. */ });
  realMap.on('zoomend', () => {
    cancelAnimationFrame(mapZoomFrame);
    mapZoomFrame = requestAnimationFrame(() => syncRealMap(lastShownPlaces));
  });
  lastMapDistrict = null;
}

function setMapMode(mode) {
  if (mode === '3d' && !SUPPORTED_3D.has(state.district)) {
    showToast('Khu vực này chưa có bản đồ 3D.');
    return;
  }
  state.mapMode = mode;
  $('#mapwrap').dataset.mapmode = mode;
  document.querySelectorAll('.ms-btn').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  });
  if (mode === '3d') loadMap3D();
  render();
  refreshMaps(mode === 'real');
}

function syncRealMap(shown) {
  lastShownPlaces = shown;
  if (!realMap || !markerLayer) return;
  const mapWrap = $('#mapwrap');
  const mapVisible = state.mapMode === 'real' && mapWrap && mapWrap.offsetWidth > 0 && mapWrap.offsetHeight > 0;
  realMap.stop();
  markerLayer.clearLayers();
  if (areaBoundaryLayer) areaBoundaryLayer.setStyle((feature) => ({
    color: feature.properties.district === state.district ? '#c2410c' : '#8c806e',
    weight: 2, dashArray: '6 5', fillOpacity: 0.025,
  }));

  const pts = [];
  if (state.district === 'gia_lam') {
    const vinIcon = L.divIcon({
      className: '',
      html: '<div class="vinuni-pin">Đại học VinUni</div>',
      iconSize: [120, 26],
      iconAnchor: [60, 13]
    });
    L.marker(VINUNI_POS, { icon: vinIcon, zIndexOffset: 600 })
      .addTo(markerLayer)
      .bindTooltip('<b>Đại học VinUni</b><br>Tâm khu vực Gia Lâm · Ocean Park 1', { direction: 'top', offset: [0, -14] });
    pts.push(VINUNI_POS);
  } else if (state.district === 'van_giang') {
    const ocp2Icon = L.divIcon({
      className: '',
      html: '<div class="vinuni-pin">Kinh Đô Ánh Sáng</div>',
      iconSize: [130, 26],
      iconAnchor: [65, 13]
    });
    L.marker(OCP2_CENTER_POS, { icon: ocp2Icon, zIndexOffset: 600 })
      .addTo(markerLayer)
      .bindTooltip('<b>Quảng trường Kinh Đô Ánh Sáng</b><br>Tâm Vinhomes Ocean Park 2', { direction: 'top', offset: [0, -14] });
    pts.push(OCP2_CENTER_POS);
  }
  const located = shown.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  located.forEach((p) => pts.push([p.lat, p.lng]));
  const groups = new Map();
  const zoom = realMap.getZoom();
  located.forEach((p) => {
    const point = realMap.project([p.lat, p.lng], zoom);
    const key = zoom >= 18 || p.id === state.sel ? p.id : `${Math.floor(point.x / 44)}:${Math.floor(point.y / 44)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });
  groups.forEach((group) => {
    if (group.length > 1) {
      const center = [group.reduce((sum, p) => sum + p.lat, 0) / group.length,
        group.reduce((sum, p) => sum + p.lng, 0) / group.length];
      const icon = L.divIcon({ className: '', iconSize: [38, 38], iconAnchor: [19, 19],
        html: `<div class="map-cluster" aria-label="${group.length} địa điểm">${group.length}</div>` });
      const marker = L.marker(center, { icon, title: `${group.length} địa điểm · bấm để phóng to` }).addTo(markerLayer);
      marker.placeCount = group.length;
      marker.bindTooltip(`${group.length} địa điểm · bấm để phóng to`);
      marker.on('click', () => realMap.fitBounds(group.map((p) => [p.lat, p.lng]), { padding: [48, 48], maxZoom: Math.min(zoom + 2, 18), animate: false }));
      return;
    }
    const p = group[0];
    const sel = state.sel === p.id;
    const icon = L.divIcon({
      className: '',
      html: `<div class="custom-pin ${sel ? 'is-sel' : ''}" style="color:${PIN_COLOR[p.v]}">${ICON[p.v]}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    const m = L.marker([p.lat, p.lng], { icon }).addTo(markerLayer);
    m.placeCount = 1;
    m.bindTooltip(`<b>${escapeHTML(p.name)}</b><br>${LABEL_VI[p.v]} · ${escapeHTML(p.price_text)}`, { direction: 'top', offset: [0, -14] });
    m.on('click', () => select(p.id));
    if (sel && mapVisible) {
      // Leaflet flyTo cannot calculate a path while the mobile map is hidden.
      realMap.setView([p.lat, p.lng], Math.max(realMap.getZoom(), 16), { animate: false });
      m.openTooltip();
    }
  });

  if (state.sel && mapVisible) {
    lastMapDistrict = state.district;
    return;
  }
  if (lastMapDistrict !== state.district && mapVisible) {
    if (state.district === 'gia_lam') {
      realMap.setView(VINUNI_POS, 14, { animate: true });
    } else if (pts.length >= 2) {
      realMap.fitBounds(pts, { padding: [46, 46], maxZoom: 16, animate: true });
    } else if (pts.length === 1) {
      realMap.flyTo(pts[0], 15, { duration: 0.6 });
    } else {
      const [center, zoom] = DISTRICT_CENTER[state.district] || DISTRICT_CENTER.gia_lam;
      realMap.flyTo(center, zoom, { duration: 0.6 });
    }
    lastMapDistrict = state.district;
  }
}

function strip(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* Chuẩn hoá 1 quán ăn để chạy khớp cả UI lẫn map3d-multi.js */
function normalizePlace(raw, idx) {
  const v = raw.label || raw.v || 'unsure';
  const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const minPrice = positive(raw.price_min_k);
  const maxPrice = positive(raw.price_max_k);
  const mealPrice = positive(raw.price) || (minPrice && maxPrice
    ? Math.round((minPrice + maxPrice) / 2) : (minPrice || maxPrice));
  const onlineMin = positive(raw.online_price_min_vnd);
  const onlineMax = positive(raw.online_price_max_vnd);
  const price = mealPrice || (onlineMin ? onlineMin / 1000 : null);
  const priceText = minPrice && maxPrice ? `${minPrice}k–${maxPrice}k`
    : minPrice ? `Từ ${minPrice}k` : maxPrice ? `Đến ${maxPrice}k`
      : mealPrice ? `~${mealPrice}k` : onlineMin ? `Menu online từ ${onlineMin.toLocaleString('vi-VN')}đ` : 'Chưa có giá tại quán';
  const x = typeof raw.x === 'number' ? raw.x : (140 + ((idx * 97) % 380));
  const y = typeof raw.y === 'number' ? raw.y : (130 + ((idx * 73) % 300));
  const signals = (raw.signals || []).map((s) =>
    typeof s === 'string' ? { key: 'Tín hiệu', value: s } : s
  );
  const reviews = (raw.review_links || []).map((r) =>
    typeof r === 'string'
      ? { source: 'Nguồn', lang: '', published_at: '', text_excerpt: 'Xem nguồn đánh giá', url: r }
      : r
  );
  const onlineMenu = raw.online_menu || [];
  const sourceLinks = [...(raw.shopee_source_urls || []).map((url) => ({ source: 'ShopeeFood · menu & giá online', url })), ...onlineMenu.filter((item) => isShopeeFoodURL(item.url)).map((item) =>
    ({ source: 'ShopeeFood · menu & giá online', url: safeURL(item.url) })), ...(raw.source_links || [])]
    .filter((source) => safeURL(source.url));
  const uniqueSources = [...new Map(sourceLinks.map((source) => [safeURL(source.url), source])).values()]
    .sort((a, b) => Number(isShopeeFoodURL(b.url)) - Number(isShopeeFoodURL(a.url)));
  const hasShopeeFood = uniqueSources.some((source) => isShopeeFoodURL(source.url));
  return {
    id: raw.place_id || String(raw.id || idx + 1),
    place_id: raw.place_id || String(raw.id || idx + 1),
    name: raw.name || 'Chưa rõ tên',
    dish: raw.dish || raw.cuisine || 'Quán ăn',
    address: raw.address || raw.address_text || DISTRICTS[raw.district] || '',
    district: raw.district || 'gia_lam',
    lat: raw.lat,
    lng: raw.lng,
    price,
    price_basis: mealPrice ? 'at_store' : onlineMin ? 'online' : 'unknown',
    online_price_min_vnd: onlineMin,
    online_price_max_vnd: onlineMax,
    price_text: priceText,
    v,
    label: v,
    reason: raw.reason || 'Chưa có lý do chi tiết.',
    confidence: typeof raw.confidence === 'number' && Number.isFinite(raw.confidence) ? raw.confidence : null,
    label_source: raw.label_source || '',
    labeled_at: raw.labeled_at || '',
    evaluated: raw.evaluated === true,
    model: raw.model || '',
    run_id: raw.run_id || '',
    human_label: raw.human_label || null,
    source_links: uniqueSources.filter((source) => !hasShopeeFood || !isFoodySource(source)),
    has_shopee_food: hasShopeeFood,
    store_id: raw.store_id || '',
    distance_m: Number.isFinite(raw.distance_m) ? raw.distance_m : distanceFromVinUni(raw.lat, raw.lng),
    coordinate_source: raw.coordinate_source || '',
    coordinate_fetched_at: raw.coordinate_fetched_at || '',
    photo_url: safeURL(raw.photo_url),
    photo_source: raw.photo_source || '',
    online_menu: onlineMenu,
    fetched_at: raw.fetched_at || '',
    hours_text: raw.hours_text || '',
    search_text: strip([raw.name, raw.dish, raw.cuisine, raw.address, raw.address_text,
      ...(raw.online_menu || []).map((item) => item.name)].filter(Boolean).join(' ')),
    signals,
    review_links: reviews,
    x,
    y
  };
}

/* Cầu nối với map3d-multi.js */
window.hiddenReason = function (p) {
  if (p.v === 'chain' && state.hideChain) return 'Chuỗi';
  if (p.v === 'tourist' && state.hideTourist) return 'Bẫy du lịch';
  return null;
};

function matchesQuery(p) {
  return !state.q || p.search_text.includes(strip(state.q));
}

window.matches = function (p) {
  if (p.district !== state.district) return false;
  if (state.shopeeOnly && !p.has_shopee_food) return false;
  if (state.q && REFUSE_RE.test(strip(state.q))) return false;
  if (!matchesQuery(p)) return false;
  if (state.budget !== 'all' && p.price == null) return false;
  if (state.budget === '50' && p.price >= 50) return false;
  if (state.budget === '100' && (p.price < 50 || p.price > 100)) return false;
  return true;
};

window.select = function (id) {
  state.sel = state.sel === id ? null : id;
  if (state.sel) toggleFilterPanel(false);
  render();
  if (state.sel) scrollToPlaceCard(id);
};

window.scrollToPlaceCard = function (id, behavior) {
  const card = document.querySelector(`.card[data-id="${CSS.escape(String(id))}"]`);
  const side = document.querySelector('.side');
  if (!card || !side || !side.clientHeight) return;
  const top = side.scrollTop + card.getBoundingClientRect().top - side.getBoundingClientRect().top - 12;
  side.scrollTo({ top: Math.max(0, top), behavior: behavior || (matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth') });
};

function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => { t.hidden = true; }, 2800);
}

function safeURL(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch (e) { return ''; }
}

function isShopeeFoodURL(value) {
  const url = safeURL(value);
  if (!url) return false;
  const host = new URL(url).hostname.toLowerCase();
  return host === 'shopeefood.vn' || host.endsWith('.shopeefood.vn');
}

function isFoodySource(source) {
  const url = safeURL(source.url);
  const host = url ? new URL(url).hostname.toLowerCase() : '';
  return host === 'foody.vn' || host.endsWith('.foody.vn') || /\bfoody\b/i.test(source.source || '');
}

function dateText(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function configureDataUI() {
  if (!liveDataMeta) return;
  (liveDataMeta.areas || []).forEach((area) => { DISTRICTS[area.district] = area.name; });
  const districts = [...new Set(PLACES.map((p) => p.district))];
  if (!districts.includes(state.district)) state.district = districts[0];
  $('.district-tabs').innerHTML = districts.map((key) =>
    `<button type="button" class="d-chip" data-d="${escapeHTML(key)}" aria-pressed="${key === state.district}">${escapeHTML(DISTRICTS[key] || key)}</button>`
  ).join('');
  const notice = $('#dataNotice');
  if (notice) {
    notice.hidden = false;
    const countText = liveDataMeta.evaluated_place_count != null
      ? `${liveDataMeta.evaluated_place_count} có kết quả AI đã lưu`
      : `${liveDataMeta.final_label_count} nhãn nhóm duyệt`;
    notice.textContent = `${PLACES.length} địa điểm · ${countText}. Chưa kiểm thực địa; giá tại quán còn thiếu. `;
  }
  const scope = $('.mts-sub');
  if (scope) scope.textContent = 'Ocean Park 1 & 2';
}

function updateFilterBadge() {
  const badge = $('#filterBadge');
  if (!badge) return;
  let count = 0;
  if (state.budget !== 'all') count++;
  if (!state.hideChain) count++;
  if (!state.hideTourist) count++;
  if (state.shopeeOnly) count++;
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

function toggleFilterPanel(forceOpen) {
  const panel = $('#filterPanel');
  const btn = $('#filterToggle');
  if (!panel || !btn) return;
  const open = typeof forceOpen === 'boolean' ? forceOpen : !panel.classList.contains('is-open');
  panel.hidden = !open;
  panel.classList.toggle('is-open', open);
  btn.setAttribute('aria-expanded', String(open));
  if (open) fitFilterPanel();
}

function fitFilterPanel() {
  const panel = $('#filterPanel');
  if (!panel || panel.hidden) return;
  const bottom = Math.min($('.side').getBoundingClientRect().bottom, innerHeight);
  panel.style.maxHeight = `${Math.max(80, Math.min(440, bottom - panel.getBoundingClientRect().top - 12))}px`;
}

function updateQueueBadges() {
  const count = state.flagQueue.length;
  const qCount = $('#queueCount');
  if (qCount) qCount.textContent = count;
  const qToggle = $('#queueToggle');
  if (qToggle) qToggle.classList.toggle('has-items', count > 0);
  const mBadge = $('#mobileQueueBadge');
  if (mBadge) {
    mBadge.textContent = count;
    mBadge.classList.toggle('has-items', count > 0);
  }
}

function openReportModal(id) {
  const placeNameEl = $('#modalPlaceName');
  const placeSelect = $('#reportPlaceSelect');
  if (id) {
    const p = PLACES.find((item) => item.id === id);
    if (!p) return;
    state.reportTarget = p;
    placeNameEl.textContent = `${p.name} · ${DISTRICTS[p.district] || p.address}`;
    placeNameEl.hidden = false;
    placeSelect.hidden = true;
  } else {
    const candidates = PLACES.filter((item) => item.district === state.district);
    const list = candidates.length ? candidates : PLACES;
    if (!list.length) return;
    placeSelect.innerHTML = list.map((item) =>
      `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)} (${LABEL_VI[item.v] || item.v})</option>`
    ).join('');
    placeSelect.hidden = false;
    placeNameEl.hidden = true;
    state.reportTarget = list[0];
  }
  $('#reportNote').value = '';
  $('#reportModal').hidden = false;
}

function closeReportModal() {
  $('#reportModal').hidden = true;
}

function submitReport() {
  const placeSelect = $('#reportPlaceSelect');
  if (placeSelect && !placeSelect.hidden) {
    const chosen = PLACES.find((item) => item.id === placeSelect.value);
    if (chosen) state.reportTarget = chosen;
  }
  if (!state.reportTarget) return;
  state.flagQueue.push({
    place_id: state.reportTarget.place_id,
    name: state.reportTarget.name,
    current_label: state.reportTarget.label,
    suggested_label: $('#reportSuggest').value,
    note: $('#reportNote').value.trim(),
    status: 'draft_pending_human_review'
  });
  saveQueue();
  updateQueueBadges();
  renderQueueDrawer();
  closeReportModal();
  showToast('Đã ghi vào hàng đợi chờ duyệt — nhãn gốc giữ nguyên.');
  render();
}

function renderQueueDrawer() {
  const body = $('#queueItems');
  if (!state.flagQueue.length) {
    body.innerHTML = '<div style="color:var(--muted);padding:4px 0">Chưa có mục báo sai nào trong phiên này.</div>';
    return;
  }
  body.innerHTML = state.flagQueue.map((q) => `
    <div class="queue-item">
      <span><b>${escapeHTML(q.name)}</b>${q.note ? ' · ' + escapeHTML(q.note) : ''}</span>
      <span>Đề xuất: <b>${LABEL_VI[q.suggested_label] || q.suggested_label}</b></span>
    </div>
  `).join('');
}

function isPlaceholderExcerpt(text) {
  return /^(Xem vị trí|Kiểm tra cơ sở|Xem nguồn)/i.test((text || '').trim());
}

function cardHTML(p, idx) {
  const open = state.sel === p.id;
  const queued = state.flagQueue.some((q) => q.place_id === p.place_id);
  const dist = calcDistText(p);
  const reviewCount = p.signals.find((s) => /review/i.test(s.key));
  const sigHTML = p.signals.filter((s) => !/review/i.test(s.key)
    && !(p.has_shopee_food && /\bfoody\b/i.test(`${s.key} ${s.value}`))).map((s) =>
    `<span class="sig-pill"><span>${escapeHTML(s.key)}:</span> ${escapeHTML(s.value)}</span>`
  ).join('');
  const sourceHTML = p.source_links.length ? `<div class="data-sources">${p.source_links.map((s) =>
    `<a class="place-source-link ${isShopeeFoodURL(s.url) ? 'is-shopee' : ''}" href="${escapeHTML(safeURL(s.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(isShopeeFoodURL(s.url) ? 'ShopeeFood · Menu & giá online' : s.source)} ↗</a>`
  ).join('')}</div>` : '';
  const menuHTML = p.online_menu.length || p.has_shopee_food ? `<details class="online-menu">
    <summary>Menu online <span>${p.online_menu.length ? `${p.online_menu.length} món` : 'Chưa đọc được món'}</span></summary>
    <div class="online-menu-body">
    <p>Giá đặt online, chưa gồm phí giao; không phải giá tại quán.</p>
    ${p.online_menu.slice(0, 8).map((item) => `<div class="menu-row"><span>${escapeHTML(item.name)}</span><b>${typeof item.price_vnd === 'number' && item.price_vnd > 0 ? escapeHTML(item.price_vnd.toLocaleString('vi-VN')) + 'đ' : 'Chưa có giá'}</b></div>`).join('')}
    ${liveDataMeta && liveDataMeta.menu_store_count ? `<a class="rev-link menu-full-link" href="./menu.html?place=${encodeURIComponent(p.id)}">${p.online_menu.length ? `Xem đầy đủ ${p.online_menu.length} món &amp; giá gốc` : 'Xem nguồn và trạng thái menu'} ↗</a>` : ''}
    </div>
  </details>` : '';
  const visibleReviews = p.review_links.filter((r) => !p.has_shopee_food || !isFoodySource(r));
  const realReviews = visibleReviews.filter((r) => !isPlaceholderExcerpt(r.text_excerpt));
  const linkOnly = visibleReviews.find((r) => isPlaceholderExcerpt(r.text_excerpt));
  const revHTML = realReviews.length
    ? `<div class="reviews">${realReviews.map((r) => `
        <div class="rev-box">
          “${escapeHTML(r.text_excerpt)}”
          <div class="rev-meta">
            <span>${escapeHTML([r.source, r.lang, r.published_at].filter(Boolean).join(' · '))}</span>
            <a class="rev-link" href="${escapeHTML(safeURL(r.url))}" target="_blank" rel="noopener noreferrer">Xem nguồn ↗</a>
          </div>
        </div>`).join('')}</div>`
    : (linkOnly
      ? `<div class="source-link-row">
          <span>Nguồn đối chiếu công khai (${escapeHTML(linkOnly.source || 'Google Maps')})</span>
          <a class="rev-link" href="${escapeHTML(linkOnly.url)}" target="_blank" rel="noopener noreferrer">Mở nguồn ↗</a>
        </div>`
      : '');
  const unsureBox = p.v === 'unsure'
    ? `<div class="unsure-banner">${p.label_source === 'unclassified' ? 'Chưa có kết quả AI đã lưu cho địa điểm này.' : 'Chưa chắc — cần bổ sung căn cứ.'}</div>`
    : '';
  const provenanceHTML = p.evaluated ? `<div class="ai-provenance"><b>Kết quả AI đã lưu</b><span>${escapeHTML(p.model)} · ${escapeHTML(p.run_id)}</span></div>` : '';
  const humanHTML = p.human_label ? `<details class="human-verdict"><summary>Nhãn nhóm duyệt: ${escapeHTML(LABEL_VI[p.human_label.label] || p.human_label.label)}</summary><p>${escapeHTML(p.human_label.reason)}</p><p class="data-caption">Ngày chốt: ${escapeHTML(dateText(p.human_label.labeled_at))}. Đây là nhãn đối chiếu riêng, không phải đầu ra AI.</p></details>` : '';
  const flagSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>';
  const dirUrl = (typeof p.lat === 'number' && typeof p.lng === 'number')
    ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.address)}`;

  return `
    <article class="card ${p.v === 'unsure' ? 'is-unsure' : ''} ${open ? 'is-open' : ''}" style="animation-delay:${Math.min(idx * 40, 200)}ms" data-id="${escapeHTML(p.id)}">
      <button type="button" class="card-toggle" data-toggle-id="${escapeHTML(p.id)}" aria-expanded="${open}">
        <div class="row1">
          <div class="dish-thumb" aria-hidden="true">${dishThumbSVG(p.dish)}${p.photo_url ? `<img src="${escapeHTML(p.photo_url)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-place-photo />` : ''}</div>
          <div class="card-head-main">
            <div class="card-title-row">
              <h3 class="name">${escapeHTML(p.name)}</h3>
              <span class="verdict v-${p.v}">${ICON[p.v]}${LABEL_VI[p.v]}</span>
            </div>
            <div class="meta-line">
              <span class="meta-dish">${escapeHTML(p.dish)}</span>
              <span>·</span>
              <span class="meta-price">${escapeHTML(p.price_text)}</span>
              ${dist ? `<span class="meta-dist" title="Khoảng cách đường chim bay từ VinUni, không phải quãng đường chạy xe">~${dist} từ VinUni</span>` : ''}
            </div>
            <div class="meta-addr">${escapeHTML(p.address)}</div>
          </div>
        </div>
        <p class="why1">${escapeHTML(p.reason)}</p>
        ${unsureBox}
      </button>
      <div class="detail">
        <div class="detail-inner">
          ${sourceHTML}
          <dl class="place-facts">
            <div><dt>Giờ mở cửa</dt><dd>${escapeHTML(p.hours_text || 'Chưa có thông tin')}</dd></div>
            <div><dt>Review đã thu</dt><dd>${escapeHTML(reviewCount ? reviewCount.value : String(realReviews.length))}${realReviews.length ? '' : ' · Chưa có nội dung đánh giá'}</dd></div>
          </dl>
          ${menuHTML}
          ${realReviews.length ? revHTML : ''}
          <details class="data-details">
            <summary>Thông tin dữ liệu &amp; đánh giá</summary>
            <div class="data-details-body">
          ${sigHTML ? `<div class="sig-grid">${sigHTML}</div>` : ''}
          ${!realReviews.length ? revHTML : ''}
          ${p.photo_url ? `<p class="data-caption">${p.has_shopee_food && /\bfoody\b/i.test(p.photo_source) ? 'Ảnh tham khảo' : `Ảnh bìa từ ${escapeHTML(p.photo_source || 'nguồn thu thập')}`} · chưa kiểm thực địa</p>` : ''}
          ${p.fetched_at ? `<p class="data-caption">Dữ liệu địa điểm thu thập ngày ${escapeHTML(dateText(p.fetched_at))}.</p>` : ''}
          ${p.coordinate_source ? `<p class="data-caption">Tọa độ: ${escapeHTML(p.coordinate_source)} · ${escapeHTML(dateText(p.coordinate_fetched_at))}. Khoảng cách đường chim bay từ VinUni.</p>` : ''}
          ${provenanceHTML}
          ${humanHTML}
          <div class="detail-foot">
            <span class="conf">
              ${p.confidence != null ? `<span>Độ chắc ${p.confidence}%</span><span class="bar"><span style="width:${Math.max(0, Math.min(100, p.confidence))}%"></span></span>` : `<span>${p.label_source === 'final' ? `Nhãn final do nhóm chốt · ${escapeHTML(dateText(p.labeled_at))}` : 'Chưa có độ chắc từ AI'}</span>`}
            </span>
          </div>
            </div>
          </details>
          <div class="card-actions">
            <a class="dir-btn" href="${escapeHTML(dirUrl)}" target="_blank" rel="noopener noreferrer">Chỉ đường ↗</a>
            <button type="button" class="map-jump-btn" data-map-id="${escapeHTML(p.id)}">Xem bản đồ</button>
            <button type="button" class="report-btn ${queued ? 'is-queued' : ''}" data-report-id="${escapeHTML(p.id)}">
              ${flagSvg} ${queued ? 'Đã vào hàng đợi' : 'Báo sai nhãn'}
            </button>
          </div>
        </div>
      </div>
    </article>`;
}

function render() {
  const has3D = SUPPORTED_3D.has(state.district);
  const geographic3D = false;
  $('#mapwrap').dataset.mapengine = 'three';
  if (!has3D && state.mapMode === '3d') {
    state.mapMode = 'real';
    $('#mapwrap').dataset.mapmode = 'real';
  }
  document.querySelectorAll('.ms-btn').forEach((button) => {
    button.disabled = button.dataset.mode === '3d' && !has3D;
    button.title = '';
    button.setAttribute('aria-pressed', String(button.dataset.mode === state.mapMode));
  });
  const hasPrices = PLACES.some((p) => p.district === state.district && p.price != null);
  document.querySelectorAll('.chip[data-b]').forEach((button) => {
    button.disabled = button.dataset.b !== 'all' && !hasPrices;
    button.title = button.disabled ? 'Chưa có giá tại quán trong dữ liệu khu vực này' : '';
  });
  const pill = $('#mapDistrictPill');
  if (pill) {
    pill.textContent = state.mapMode === '3d'
      ? `${geographic3D ? 'MapLibre 3D · Bản thử' : 'Mô hình 3D'} · ${DISTRICTS[state.district]}`
      : `Bản đồ 2D · ${DISTRICTS[state.district]}`;
  }

  const clearBtn = $('#qClear');
  if (clearBtn) clearBtn.hidden = !state.q;
  updateQueueBadges();
  updateFilterBadge();

  // Màn hình 5a: Từ chối ngoài phạm vi (ATTP, viết review xấu, chèn lệnh)
  if (state.q && REFUSE_RE.test(strip(state.q))) {
    $('#summary').innerHTML = '<b>Từ chối yêu cầu ngoài phạm vi</b>';
    $('#list').innerHTML = `
      <div class="notice-box refuse">
        <h3 class="notice-title">Không hỗ trợ yêu cầu ngoài phạm vi</h3>
        <div>Hệ thống chỉ phân loại quán ăn <b>local / chuỗi / bẫy du lịch / chưa chắc</b> dựa trên tín hiệu công khai. AI không đánh giá vệ sinh an toàn thực phẩm, không kết luận quán “lừa đảo” và không viết review hộ.</div>
        <div class="notice-tags">
          <span>Không chấm ATTP</span>
          <span>Không viết review xấu</span>
          <span>Không nhận lệnh từ review</span>
        </div>
        <button type="button" class="notice-reset" data-quick="">Quay lại danh sách</button>
      </div>`;
    syncRealMap([]);
    if (window.OCP2Map) OCP2Map.sync([], null);
    if (window.Map3D) Map3D.sync();
    return;
  }

  const pool = PLACES.filter(matches);
  const shown = pool
    .filter((p) => !hiddenReason(p))
    .sort((a, b) => Number(b.has_shopee_food) - Number(a.has_shopee_food)
      || (state.sort === 'name' ? a.name.localeCompare(b.name, 'vi')
        : a.distance_m - b.distance_m || a.name.localeCompare(b.name, 'vi')));
  if (state.sel && !shown.some((p) => p.id === state.sel)) state.sel = null;
  const hid = pool.filter((p) => hiddenReason(p));
  const nChain = hid.filter((p) => p.v === 'chain').length;
  const nT = hid.filter((p) => p.v === 'tourist').length;

  $('#summary').innerHTML = `Hiện <b>${shown.length}</b> ${liveDataMeta ? 'địa điểm' : 'quán ăn'}` +
    (hid.length ? `, đã ẩn <b>${nChain}</b> chuỗi và <b>${nT}</b> bẫy du lịch` : '');

  let html = '';
  if (usingFallbackData) {
    html += '<div class="offline-banner">Không tải được tệp dữ liệu đầy đủ — đang hiển thị bộ dữ liệu mẫu ngoại tuyến.</div>';
  }
  // Màn hình 5b: Chưa có dữ liệu
  if (!shown.length && state.q) {
    const queryMatches = PLACES.filter((p) => p.district === state.district && matchesQuery(p));
    const elsewhere = PLACES.find((p) => p.district !== state.district && matchesQuery(p));
    html += queryMatches.length ? `
      <div class="empty-box"><strong>Có quán khớp tên, nhưng đang bị bộ lọc loại</strong>
        <div>Giá chưa rõ hoặc nhãn đang bị ẩn. Hãy đặt lại bộ lọc để xem.</div>
        <button type="button" class="notice-reset" data-reset-filters="1">Đặt lại bộ lọc</button></div>` : elsewhere ? `
      <div class="empty-box"><strong>Có kết quả tại ${escapeHTML(DISTRICTS[elsewhere.district])}</strong>
        <button type="button" class="notice-reset" data-switch-district="${escapeHTML(elsewhere.district)}">Xem khu vực này</button></div>` : `
      <div class="notice-box nodata">
        <h3 class="notice-title">Chưa có dữ liệu về “${escapeHTML(state.q)}”</h3>
        <div>Không tìm thấy địa điểm trong dữ liệu hiện có của khu vực <b>${escapeHTML(DISTRICTS[state.district])}</b>. Bạn có thể đổi khu vực hoặc từ khoá.</div>
        <div class="notice-tags">
          <span>Thử đổi quận khác</span>
          <span>AI không bịa dữ liệu</span>
        </div>
        <button type="button" class="notice-reset" data-quick="">Quay lại danh sách</button>
      </div>`;
  } else if (!shown.length) {
    html += `
      <div class="empty-box">
        <strong>Không có quán ăn khớp bộ lọc hiện tại</strong>
        <div>Thử nới mức ngân sách hoặc hiện thêm các quán đang bị ẩn.</div>
        <div class="empty-actions">
          <button type="button" class="notice-reset" data-reset-filters="1">Đặt lại bộ lọc</button>
        </div>
      </div>`;
  } else {
    const selected = shown.find((p) => p.id === state.sel);
    if (selected) state.visibleCount = Math.max(state.visibleCount, shown.indexOf(selected) + 1);
    html += shown.slice(0, state.visibleCount).map((p, idx) => cardHTML(p, idx)).join('');
    if (shown.length > state.visibleCount) {
      html += `<button type="button" class="notice-reset load-more" data-load-more="1">Xem thêm ${Math.min(40, shown.length - state.visibleCount)} địa điểm (${state.visibleCount}/${shown.length})</button>`;
    }
  }

  if (hid.length) {
    html += `<details class="hidden-drawer">
      <summary>Đã ẩn (${hid.length}) và lý do</summary>
      ${hid.map((p) => `<div class="hrow"><span>${escapeHTML(p.name)}</span><span>${hiddenReason(p)}: ${escapeHTML(p.reason)}</span></div>`).join('')}
    </details>`;
  }

  $('#list').innerHTML = html;
  syncRealMap(shown);
  if (window.OCP2Map) OCP2Map.sync(shown, state.sel);
  if (state.mapMode === '3d' && SUPPORTED_3D.has(state.district)) loadMap3D();
  if (window.Map3D && has3D) Map3D.sync();
}

function wireEvents() {
  window.addEventListener('resize', fitFilterPanel);
  document.querySelectorAll('.vs-btn[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setViewMode(btn.dataset.view, { persist: true, updateUrl: true });
    });
  });

  const mqMobile = window.matchMedia('(max-width: 768px)');
  const onViewportChange = () => {
    if (mqMobile.matches) {
      closeQueueDrawer();
      setBottomNavSelected(state.mobileTab);
    }
    refreshMaps(true);
  };
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', onViewportChange);
  else if (mqMobile.addListener) mqMobile.addListener(onViewportChange);

  $('#list').addEventListener('click', (e) => {
    if (e.target.closest('[data-load-more]')) {
      const side = $('.side');
      const top = side.scrollTop;
      state.visibleCount += 40;
      render();
      side.scrollTop = top;
      return;
    }
    const switchDistrict = e.target.closest('[data-switch-district]');
    if (switchDistrict) {
      document.querySelector(`.d-chip[data-d="${CSS.escape(switchDistrict.dataset.switchDistrict)}"]`).click();
      return;
    }
    const resetFilterBtn = e.target.closest('[data-reset-filters]');
    if (resetFilterBtn) {
      state.budget = 'all';
      state.q = '';
      state.hideChain = false;
      state.hideTourist = false;
      state.shopeeOnly = false;
      $('#q').value = '';
      $('#hideChain').checked = false;
      $('#hideTourist').checked = false;
      $('#shopeeOnly').checked = false;
      document.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.b === 'all')));
      render();
      return;
    }
    const resetBtn = e.target.closest('[data-quick]');
    if (resetBtn) {
      const val = resetBtn.dataset.quick;
      $('#q').value = val;
      state.q = val;
      render();
      return;
    }
    const mapJump = e.target.closest('[data-map-id]');
    if (mapJump) {
      state.sel = mapJump.dataset.mapId;
      render();
      setMobileTab('map');
      return;
    }
    const rep = e.target.closest('[data-report-id]');
    if (rep) {
      openReportModal(rep.dataset.reportId);
      return;
    }
    const toggle = e.target.closest('[data-toggle-id]');
    if (toggle) select(toggle.dataset.toggleId);
  });

  if ($('#qClear')) {
    $('#qClear').addEventListener('click', () => {
      $('#q').value = '';
      state.q = '';
      render();
      $('#q').focus();
    });
  }

  $('#q').addEventListener('input', (e) => { state.q = e.target.value.trim(); state.visibleCount = 40; render(); });

  // Broken remote photos keep the existing illustrated thumbnail visible.
  $('#list').addEventListener('error', (e) => {
    if (e.target.matches('[data-place-photo]')) e.target.remove();
  }, true);

  document.querySelectorAll('.d-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.district = btn.dataset.d;
      state.sel = null;
      state.visibleCount = 40;
      document.querySelectorAll('.d-chip').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
      if (isMobileLayout()) {
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      render();
    });
  });

  document.querySelectorAll('.ms-btn').forEach((btn) => {
    btn.addEventListener('click', () => setMapMode(btn.dataset.mode));
  });

  document.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.budget = btn.dataset.b;
      document.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
      render();
    });
  });

  if ($('#filterToggle')) {
    $('#filterToggle').addEventListener('click', () => toggleFilterPanel());
  }
  $('#filterApply').addEventListener('click', () => {
    toggleFilterPanel(false);
    $('.side').scrollTo({ top: 0, behavior: 'auto' });
    $('#filterToggle').focus();
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#filterPanel, #filterToggle')) toggleFilterPanel(false);
  });

  document.querySelectorAll('[data-quick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.quick;
      $('#q').value = val;
      state.q = val;
      if (isMobileLayout()) toggleFilterPanel(false);
      render();
    });
  });

  $('#hideChain').addEventListener('change', (e) => { state.hideChain = e.target.checked; render(); });
  $('#hideTourist').addEventListener('change', (e) => { state.hideTourist = e.target.checked; render(); });
  $('#shopeeOnly').addEventListener('change', (e) => { state.shopeeOnly = e.target.checked; state.visibleCount = 40; render(); });
  $('#sortPlaces').addEventListener('change', (e) => { state.sort = e.target.value; state.visibleCount = 40; render(); });
  $('#mapPoiToggle').addEventListener('click', () => {
    state.showPOI = !state.showPOI;
    $('#mapPoiToggle').setAttribute('aria-pressed', String(state.showPOI));
    $('#mapPoiToggle').textContent = state.showPOI ? 'Ẩn quán' : 'Hiện quán';
    $('#mapwrap').dataset.showpois = String(state.showPOI);
    render();
  });

  $('#queueToggle').addEventListener('click', () => {
    if ($('#queueDrawer').hidden) openQueueDrawer();
    else closeQueueDrawer();
  });
  $('#queueClose').addEventListener('click', closeQueueDrawer);
  if ($('#queueBackdrop')) {
    $('#queueBackdrop').addEventListener('click', closeQueueDrawer);
  }
  if ($('#queueNewReport')) {
    $('#queueNewReport').addEventListener('click', () => {
      closeQueueDrawer();
      openReportModal(null);
    });
  }

  $('#reportCancel').addEventListener('click', closeReportModal);
  $('#reportSubmit').addEventListener('click', submitReport);
  $('#reportModal').addEventListener('click', (e) => {
    if (e.target.id === 'reportModal') closeReportModal();
  });

  document.querySelectorAll('.bnav-btn[data-mtab]').forEach((btn) => {
    btn.addEventListener('click', () => setMobileTab(btn.dataset.mtab));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#reportModal').hidden) closeReportModal();
      else if (!$('#queueDrawer').hidden) closeQueueDrawer();
      else if ($('#filterPanel').classList.contains('is-open')) {
        toggleFilterPanel(false);
        $('#filterToggle').focus();
      }
    }
  });

  if (matchMedia('(hover:none)').matches && $('#hint')) {
    $('#hint').textContent = 'Chạm vào một khu để nâng lên và xem quán.';
  }
}

function loadMap3D() {
  if (window.Map3D || map3dLoading) return;
  map3dLoading = true;
  const loadMulti = () => {
    const s = document.createElement('script');
    s.src = 'map3d-multi.js?v=11';
    s.onload = () => { if (window.Map3D) Map3D.sync(); };
    document.body.appendChild(s);
  };
  if (window.THREE) {
    loadMulti();
    return;
  }
  const threeScript = document.createElement('script');
  threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  threeScript.onload = loadMulti;
  threeScript.onerror = () => {
    map3dLoading = false;
    const w = $('#mapwrap');
    if (w) w.classList.add('no-gl');
  };
  document.body.appendChild(threeScript);
}

function renderLoadingSkeleton() {
  const listEl = $('#list');
  if (!listEl) return;
  listEl.innerHTML = [1, 2, 3].map(() => `
    <div class="card-skeleton" aria-hidden="true">
      <div class="sk-box"></div>
      <div class="sk-lines">
        <div class="sk-line w60"></div>
        <div class="sk-line w85"></div>
      </div>
    </div>`).join('');
}

async function init() {
  renderLoadingSkeleton();
  let raw = FALLBACK_PLACES;
  try {
    const liveRes = await fetch('./data/places_live.json');
    if (liveRes.ok) {
      const live = await liveRes.json();
      if (!live.meta || !Array.isArray(live.places) || !live.places.length) throw new Error('Invalid live dataset');
      liveDataMeta = live.meta;
      raw = live.places;
    } else throw new Error('Live dataset unavailable');
  } catch (e) {
    try {
      const res = await fetch('./data/places_verdicts.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) raw = data;
      }
    } catch (legacyError) {
      // The built-in sample is the last fallback if both JSON files fail.
    }
    // The old JSON remains intact as the visibly labelled demo fallback.
    usingFallbackData = true;
  }
  window.PLACES = raw.map(normalizePlace);
  const params = (() => {
    try { return new URLSearchParams(window.location.search); } catch (e) { return new URLSearchParams(); }
  })();
  const requestedDistrict = params.get('district');
  if (requestedDistrict && PLACES.some((p) => p.district === requestedDistrict)) state.district = requestedDistrict;
  const requestedPlace = PLACES.find((p) => p.id === params.get('place'));
  if (requestedPlace) {
    state.district = requestedPlace.district;
    state.sel = requestedPlace.id;
    if (requestedPlace.v === 'chain') state.hideChain = false;
    if (requestedPlace.v === 'tourist') state.hideTourist = false;
    $('#hideChain').checked = state.hideChain;
    $('#hideTourist').checked = state.hideTourist;
  }
  configureDataUI();
  const initialUrlView = params.get('view');
  setViewMode(getInitialViewMode(), {
    persist: initialUrlView === 'mobile' || initialUrlView === 'desktop',
    updateUrl: false
  });
  initRealMap();
  wireEvents();
  renderQueueDrawer();
  const initialTab = params.get('tab');
  if (initialTab === 'map' && isMobileLayout()) setMobileTab('map');
  else if (initialTab === 'report' && isMobileLayout()) openQueueDrawer();
  if (params.get('map') === '3d') {
    setMapMode('3d');
  } else {
    render();
  }
  if (requestedPlace) requestAnimationFrame(() => {
    scrollToPlaceCard(requestedPlace.id, 'auto');
  });
}

init();
