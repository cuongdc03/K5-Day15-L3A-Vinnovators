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
  hoang_mai: 'Hoàng Mai'
};

const VINUNI_POS = [20.9889, 105.9447];

const DISTRICT_CENTER = {
  gia_lam: [VINUNI_POS, 15],
  hoan_kiem: [[21.0315, 105.8505], 15],
  cau_giay: [[21.0335, 105.7850], 15],
  hai_ba_trung: [[21.0055, 105.8475], 15],
  hoang_mai: [[20.9685, 105.8300], 14]
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
  const ref = (DISTRICT_CENTER[p.district] && DISTRICT_CENTER[p.district][0]) || VINUNI_POS;
  const R = 6371000;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(p.lat - ref[0]);
  const dLng = toRad(p.lng - ref[1]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(ref[0])) * Math.cos(toRad(p.lat)) * Math.sin(dLng / 2) ** 2;
  const m = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  if (m < 1000) return `${Math.max(50, Math.round(m / 10) * 10)}m`;
  return `${(m / 1000).toFixed(1)}km`;
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
  hideChain: true,
  hideTourist: true,
  sel: null,
  flagQueue: loadSavedQueue(),
  reportTarget: null
};

let realMap = null;
let markerLayer = null;
let lastMapDistrict = null;
let lastShownPlaces = [];

function isMobileLayout() {
  return document.body.classList.contains('mobile-mode') || window.innerWidth <= 768;
}

function refreshMaps(refit) {
  const run = () => {
    const mapWrap = $('#mapwrap');
    const isVisible = mapWrap && mapWrap.offsetWidth > 0 && mapWrap.offsetHeight > 0;
    if (realMap && isVisible) {
      realMap.invalidateSize(true);
      if (refit) {
        lastMapDistrict = null;
        syncRealMap(lastShownPlaces);
      }
    }
    window.dispatchEvent(new Event('resize'));
    if (window.Map3D) Map3D.sync();
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
  lastMapDistrict = null;
}

function setMapMode(mode) {
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
  markerLayer.clearLayers();

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
  }
  const placesToDraw = state.sel != null
    ? shown.filter((p) => p.id === state.sel)
    : shown;

  placesToDraw.forEach((p) => {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
    pts.push([p.lat, p.lng]);
    const sel = state.sel === p.id;
    const icon = L.divIcon({
      className: '',
      html: `<div class="custom-pin ${sel ? 'is-sel' : ''}" style="color:${PIN_COLOR[p.v]}">${ICON[p.v]}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    const m = L.marker([p.lat, p.lng], { icon }).addTo(markerLayer);
    m.bindTooltip(`<b>${escapeHTML(p.name)}</b><br>${LABEL_VI[p.v]} · ${escapeHTML(p.price_text)}`, { direction: 'top', offset: [0, -14] });
    m.on('click', () => select(p.id));
    if (sel) {
      realMap.flyTo([p.lat, p.lng], Math.max(realMap.getZoom(), 16), { animate: true, duration: 0.45 });
      m.openTooltip();
    }
  });

  const mapWrap = $('#mapwrap');
  const mapVisible = mapWrap && mapWrap.offsetWidth > 0 && mapWrap.offsetHeight > 0;
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
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
}

function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* Chuẩn hoá 1 quán ăn để chạy khớp cả UI lẫn map3d-multi.js */
function normalizePlace(raw, idx) {
  const v = raw.label || raw.v || 'unsure';
  const price = raw.price || (raw.price_min_k && raw.price_max_k
    ? Math.round((raw.price_min_k + raw.price_max_k) / 2)
    : (raw.price_min_k || 50));
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
    price_text: raw.price_min_k && raw.price_max_k ? `${raw.price_min_k}k–${raw.price_max_k}k` : `~${price}k`,
    v,
    label: v,
    reason: raw.reason || 'Chưa có lý do chi tiết.',
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 50,
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

window.matches = function (p) {
  if (p.district !== state.district) return false;
  if (state.q && REFUSE_RE.test(strip(state.q))) return false;
  if (state.q && !strip(p.name + ' ' + p.dish + ' ' + p.address).includes(strip(state.q))) return false;
  if (state.budget === '50' && p.price >= 50) return false;
  if (state.budget === '100' && (p.price < 50 || p.price > 100)) return false;
  return true;
};

window.select = function (id) {
  state.sel = state.sel === id ? null : id;
  render();
  if (state.sel) {
    const el = document.querySelector(`.card[data-id="${CSS.escape(String(id))}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
  }
};

function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => { t.hidden = true; }, 2800);
}

function updateFilterBadge() {
  const badge = $('#filterBadge');
  if (!badge) return;
  let count = 0;
  if (state.budget !== 'all') count++;
  if (!state.hideChain) count++;
  if (!state.hideTourist) count++;
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

function toggleFilterPanel(forceOpen) {
  const panel = $('#filterPanel');
  const btn = $('#filterToggle');
  if (!panel || !btn) return;
  const open = typeof forceOpen === 'boolean' ? forceOpen : !panel.classList.contains('is-open');
  panel.classList.toggle('is-open', open);
  btn.setAttribute('aria-expanded', String(open));
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
  const sigHTML = p.signals.map((s) =>
    `<span class="sig-pill"><span>${escapeHTML(s.key)}:</span> ${escapeHTML(s.value)}</span>`
  ).join('');
  const realReviews = p.review_links.filter((r) => !isPlaceholderExcerpt(r.text_excerpt));
  const linkOnly = p.review_links.find((r) => isPlaceholderExcerpt(r.text_excerpt));
  const revHTML = realReviews.length
    ? `<div class="reviews">${realReviews.map((r) => `
        <div class="rev-box">
          “${escapeHTML(r.text_excerpt)}”
          <div class="rev-meta">
            <span>${escapeHTML([r.source, r.lang, r.published_at].filter(Boolean).join(' · '))}</span>
            <a class="rev-link" href="${escapeHTML(r.url)}" target="_blank" rel="noopener noreferrer">Xem nguồn ↗</a>
          </div>
        </div>`).join('')}</div>`
    : (linkOnly
      ? `<div class="source-link-row">
          <span>Nguồn đối chiếu công khai (${escapeHTML(linkOnly.source || 'Google Maps')})</span>
          <a class="rev-link" href="${escapeHTML(linkOnly.url)}" target="_blank" rel="noopener noreferrer">Mở nguồn ↗</a>
        </div>`
      : '');
  const unsureBox = p.v === 'unsure'
    ? '<div class="unsure-banner">Chưa chắc — AI chuyển người kiểm, mời bạn tự quyết định.</div>'
    : '';
  const flagSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>';
  const dirUrl = (typeof p.lat === 'number' && typeof p.lng === 'number')
    ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.address)}`;

  return `
    <article class="card ${p.v === 'unsure' ? 'is-unsure' : ''} ${open ? 'is-open' : ''}" style="animation-delay:${Math.min(idx * 40, 200)}ms" data-id="${escapeHTML(p.id)}">
      <button type="button" class="card-toggle" data-toggle-id="${escapeHTML(p.id)}" aria-expanded="${open}">
        <div class="row1">
          <div class="dish-thumb" aria-hidden="true">${dishThumbSVG(p.dish)}</div>
          <div class="card-head-main">
            <div class="card-title-row">
              <h3 class="name">${escapeHTML(p.name)}</h3>
              <span class="verdict v-${p.v}">${ICON[p.v]}${LABEL_VI[p.v]}</span>
            </div>
            <div class="meta-line">
              <span class="meta-dish">${escapeHTML(p.dish)}</span>
              <span>·</span>
              <span class="meta-price">${escapeHTML(p.price_text)}</span>
              ${dist ? `<span class="meta-dist" title="Khoảng cách ước tính tới tâm khu vực">~${dist}</span>` : ''}
            </div>
            <div class="meta-addr">${escapeHTML(p.address)}</div>
          </div>
        </div>
        <p class="why1">${escapeHTML(p.reason)}</p>
        ${unsureBox}
      </button>
      <div class="detail">
        <div class="detail-inner">
          ${sigHTML ? `<div class="sig-grid">${sigHTML}</div>` : ''}
          ${revHTML}
          <div class="detail-foot">
            <span class="conf">
              <span>Độ chắc ${p.confidence}%</span>
              <span class="bar"><span style="width:${p.confidence}%"></span></span>
            </span>
          </div>
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
  const pill = $('#mapDistrictPill');
  if (pill) {
    pill.textContent = state.mapMode === '3d'
      ? `Mô hình 3D · ${DISTRICTS[state.district]}`
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
    if (window.Map3D) Map3D.sync();
    return;
  }

  const pool = PLACES.filter(matches);
  const shown = pool
    .filter((p) => !hiddenReason(p))
    .sort((a, b) => (a.v === 'unsure') - (b.v === 'unsure') || b.confidence - a.confidence);
  const hid = pool.filter((p) => hiddenReason(p));
  const nChain = hid.filter((p) => p.v === 'chain').length;
  const nT = hid.filter((p) => p.v === 'tourist').length;

  $('#summary').innerHTML = `Hiện <b>${shown.length}</b> quán ăn` +
    (hid.length ? `, đã ẩn <b>${nChain}</b> chuỗi và <b>${nT}</b> bẫy du lịch` : '');

  let html = '';
  if (usingFallbackData) {
    html += '<div class="offline-banner">Không tải được tệp dữ liệu đầy đủ — đang hiển thị bộ dữ liệu mẫu ngoại tuyến.</div>';
  }
  // Màn hình 5b: Chưa có dữ liệu
  if (!shown.length && state.q) {
    html += `
      <div class="notice-box nodata">
        <h3 class="notice-title">Chưa có dữ liệu về “${escapeHTML(state.q)}”</h3>
        <div>Quán ăn chưa nằm trong dữ liệu đã xác thực của quận <b>${escapeHTML(DISTRICTS[state.district])}</b>. AI không tự đoán khi thiếu căn cứ.</div>
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
    html += shown.map((p, idx) => cardHTML(p, idx)).join('');
  }

  if (hid.length) {
    html += `<details class="hidden-drawer">
      <summary>Đã ẩn (${hid.length}) và lý do</summary>
      ${hid.map((p) => `<div class="hrow"><span>${escapeHTML(p.name)}</span><span>${hiddenReason(p)}: ${escapeHTML(p.reason)}</span></div>`).join('')}
    </details>`;
  }

  $('#list').innerHTML = html;
  syncRealMap(shown);
  if (window.Map3D) Map3D.sync();
}

function wireEvents() {
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
    const resetFilterBtn = e.target.closest('[data-reset-filters]');
    if (resetFilterBtn) {
      state.budget = 'all';
      state.q = '';
      state.hideChain = false;
      state.hideTourist = false;
      $('#q').value = '';
      $('#hideChain').checked = false;
      $('#hideTourist').checked = false;
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

  $('#q').addEventListener('input', (e) => { state.q = e.target.value.trim(); render(); });

  document.querySelectorAll('.d-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.district = btn.dataset.d;
      state.sel = null;
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
    s.src = 'map3d-multi.js?v=7';
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
    const res = await fetch('./data/places_verdicts.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        raw = data;
        usingFallbackData = false;
      } else {
        usingFallbackData = true;
      }
    } else {
      usingFallbackData = true;
    }
  } catch (e) {
    usingFallbackData = true;
  }
  window.PLACES = raw.map(normalizePlace);
  const params = (() => {
    try { return new URLSearchParams(window.location.search); } catch (e) { return new URLSearchParams(); }
  })();
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
}

init();
