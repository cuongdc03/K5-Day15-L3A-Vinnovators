/* Public menu catalog. No inference of coordinates, meal prices, or AI labels. */
(function () {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const money = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value.toLocaleString('vi-VN') + 'đ' : 'Chưa có giá';
  const distance = (store) => Number.isFinite(store.distance_m) ? (store.distance_m < 1000
    ? `~${Math.round(store.distance_m / 10) * 10}m` : `~${(store.distance_m / 1000).toFixed(1)}km`) + ' từ VinUni' : 'Chưa có khoảng cách';
  const url = (value) => {
    try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : ''; }
    catch (error) { return ''; }
  };
  const params = new URLSearchParams(location.search);
  const placeId = params.get('place');
  const storeId = params.get('store');
  const opened = new Set();
  let stores = [], visible = 20;

  function bodyHTML(store) {
    const source = url(store.source_url);
    const search = url(store.map_search_url);
    const mapLink = store.place_id
      ? `./index.html?place=${encodeURIComponent(store.place_id)}&district=${encodeURIComponent(store.district)}&tab=map` : '';
    const date = store.items[0] && new Date(store.items[0].fetched_at);
    const fetched = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
    return `<p class="catalog-address">${esc(store.address || 'Chưa có địa chỉ')}</p>
      <div class="catalog-links">
        ${source ? `<a class="rev-link" href="${esc(source)}" target="_blank" rel="noopener noreferrer">Nguồn ShopeeFood ↗</a>` : ''}
        ${mapLink ? `<a class="rev-link catalog-map-link" href="${esc(mapLink)}">Xem quán trên bản đồ →</a>` : search ? `<a class="rev-link" href="${esc(search)}" target="_blank" rel="noopener noreferrer">Tìm địa chỉ trên Google Maps ↗</a>` : ''}
      </div>
      <p class="data-caption">${fetched ? 'Thu thập ngày ' + esc(fetched) + ' · ' : ''}Giá online, chưa gồm phí giao; không phải giá tại quán.</p>
      ${store.coordinate_source ? `<p class="data-caption">Tọa độ: ${esc(store.coordinate_source)} · ${esc(store.coordinate_fetched_at)}. ${distance(store)} · đường chim bay.</p>` : ''}
      ${store.items.length ? `<div class="catalog-table-wrap" tabindex="0" role="region" aria-label="Menu ${esc(store.name)}"><table class="catalog-table"><thead><tr><th scope="col">Món / nhóm</th><th scope="col">Giá online</th><th scope="col">Giá gốc nguồn</th></tr></thead><tbody>${store.items.map((item) => `<tr><td><b>${esc(item.name)}</b><small>${esc([item.group, item.description].filter(Boolean).join(' · '))}</small></td><td>${money(item.online_price_vnd)}</td><td>${money(item.original_price_vnd)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="catalog-warning">Trang nguồn chưa có menu đọc được. Chưa có thông tin món hoặc giá để hiển thị.</p>'}`;
  }

  function fillStore(detail) {
    const body = detail.querySelector('.catalog-body');
    if (body.dataset.filled) return;
    const store = stores.find((s) => s.store_id === detail.dataset.store);
    if (!store) return;
    body.innerHTML = bodyHTML(store);
    body.dataset.filled = 'true';
  }

  function render() {
    const query = norm($('#menuSearch').value.trim());
    const scoped = stores.filter((s) => (!placeId || s.place_id === placeId) && (!storeId || s.store_id === storeId));
    const found = scoped.filter((s) => !query || s.search_text.includes(query)).sort((a, b) =>
      $('#menuSort').value === 'name' ? a.name.localeCompare(b.name, 'vi')
        : (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity) || a.name.localeCompare(b.name, 'vi'));
    const rows = found.reduce((sum, s) => sum + s.items.length, 0);
    const incomplete = found.filter((s) => !s.complete).length;
    $('#menuClear').hidden = !query;
    $('#catalogCount').textContent = `${found.length}/${stores.length} quán · ${rows.toLocaleString('vi-VN')} dòng món` + (incomplete ? ` · ${incomplete} menu chưa đầy đủ` : '');
    $('#catalogStores').innerHTML = found.length ? found.slice(0, visible).map((store) => `<details class="catalog-store" data-store="${esc(store.store_id)}" ${opened.has(store.store_id) ? 'open' : ''}>
      <summary><span><b>${esc(store.name)}</b><small class="catalog-distance">${distance(store)} · đường chim bay</small><small>${esc(store.address || 'Chưa có địa chỉ')} · ${store.items.length} dòng món · ${store.complete ? 'Đã đọc menu' : 'Menu chưa đầy đủ'}</small></span><span class="catalog-location ${store.place_id ? 'is-linked' : ''}">${store.place_id ? 'Đã nối bản đồ' : 'Chưa ghép tọa độ'}</span><span class="catalog-expand" aria-hidden="true">⌄</span></summary>
      <div class="catalog-body"></div></details>`).join('') : '<div class="empty-box"><strong>Không có menu khớp tìm kiếm.</strong><p>Thử tên món hoặc quán khác, hoặc xoá từ khoá.</p></div>';
    $('#catalogStores').querySelectorAll('details[open]').forEach(fillStore);
    $('#catalogMore').hidden = found.length <= visible;
    $('#catalogMore').textContent = `Xem thêm ${Math.min(20, Math.max(0, found.length - visible))} quán (${Math.min(visible, found.length)}/${found.length})`;
  }

  async function load() {
    $('#catalogError').hidden = true;
    $('#catalogCount').textContent = 'Đang tải danh mục…';
    try {
      const response = await fetch('./data/menus_live.json');
      if (!response.ok) throw new Error('Menu unavailable');
      const data = await response.json();
      if (!Array.isArray(data) || data.some((s) => !s.store_id || !Array.isArray(s.items))) throw new Error('Invalid menu data');
      stores = data.map((store) => ({ ...store, search_text: norm([store.name, store.address, ...store.items.map((item) => item.name)].join(' ')) }));
      if (placeId || storeId) {
        const target = stores.find((s) => (!placeId || s.place_id === placeId) && (!storeId || s.store_id === storeId));
        const scope = $('#catalogScope');
        scope.hidden = false;
        scope.textContent = target ? `Menu của ${target.name}. ` : 'Chưa có menu ghép đúng với địa điểm này. ';
        const all = document.createElement('a'); all.href = './menu.html'; all.className = 'rev-link'; all.textContent = `Xem tất cả ${stores.length} quán →`; scope.appendChild(all);
        if (target) {
          opened.add(target.store_id);
          if (target.place_id) $('#menuBack').href = `./index.html?place=${encodeURIComponent(target.place_id)}&district=${encodeURIComponent(target.district)}&tab=map`;
        }
      }
      render();
    } catch (error) {
      $('#catalogCount').textContent = 'Chưa tải được danh mục menu.';
      $('#catalogError').hidden = false;
      $('#catalogStores').replaceChildren();
      $('#catalogMore').hidden = true;
    }
  }

  $('#menuSearch').addEventListener('input', () => { visible = 20; render(); });
  $('#menuSort').addEventListener('change', () => { visible = 20; render(); });
  $('#menuClear').addEventListener('click', () => { $('#menuSearch').value = ''; visible = 20; render(); $('#menuSearch').focus(); });
  $('#catalogMore').addEventListener('click', () => { visible += 20; render(); });
  $('#catalogRetry').addEventListener('click', load);
  $('#catalogStores').addEventListener('toggle', (event) => {
    if (!event.target.matches('.catalog-store')) return;
    if (event.target.open) { opened.add(event.target.dataset.store); fillStore(event.target); }
    else opened.delete(event.target.dataset.store);
  }, true);
  load();
})();
