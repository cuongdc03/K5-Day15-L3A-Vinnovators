"""Generate an integrated copy of the team's UI while preserving original template files."""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1];WEB=ROOT/'web-demo'
def replace_once(text,old,new):
    if old not in text:raise ValueError('UI contract changed; missing '+old[:60])
    return text.replace(old,new,1)

def main():
    source=(WEB/'ui.js').read_text(encoding='utf8')
    start=source.index('const FALLBACK_PLACES = [')
    end=source.index('\nconst DISTRICTS',start)
    source=source[:start]+'const FALLBACK_PLACES = [];\n'+source[end:]
    source=replace_once(source,"'./data/places_verdicts.json'","'./data/places_live.json'")
    source=replace_once(source,"  gia_lam: 'Gia Lâm · VinUni/OCP',","  van_giang: 'Văn Giang · OCP2',\n  gia_lam: 'Gia Lâm · VinUni/OCP',")
    source=replace_once(source,'  gia_lam: [VINUNI_POS, 15],','  van_giang: [[20.951, 105.977], 15],\n  gia_lam: [VINUNI_POS, 15],')
    source=replace_once(source,'  const ref = (DISTRICT_CENTER[p.district] && DISTRICT_CENTER[p.district][0]) || VINUNI_POS;','  const ref = VINUNI_POS;')
    source=source.replace('Math.max(50, Math.round(m / 10) * 10)','Math.round(m / 10) * 10')
    source=replace_once(source,'    lat: raw.lat,','    store_id: raw.store_id, distance_m: raw.distance_m,\n    lat: raw.lat,')
    source=replace_once(source,"  if (p.district !== state.district) return false;","  if (document.querySelector('#shopeeOnly')?.checked && !p.store_id) return false;\n  if (p.district !== state.district) return false;")
    source=source.replace('Khoảng cách ước tính tới tâm khu vực','Khoảng cách đường chim bay xấp xỉ từ VinUni (20.9889, 105.9447)')
    source=source.replace("strip(p.name + ' ' + p.dish + ' ' + p.address)","strip(p.name + ' ' + p.dish + ' ' + p.address + ' ' + p.menu.map(i => i.name).join(' '))")
    source=source.replace("    .sort((a, b) => (a.v === 'unsure') - (b.v === 'unsure') || b.confidence - a.confidence);","    .sort((a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity));")
    source=replace_once(source,"  $('#q').addEventListener('input',", "  document.querySelector('#shopeeOnly')?.addEventListener('change', render);\n  $('#q').addEventListener('input',")
    old="""  const price = raw.price || (raw.price_min_k && raw.price_max_k
    ? Math.round((raw.price_min_k + raw.price_max_k) / 2)
    : (raw.price_min_k || 50));"""
    new="""  const price = raw.price_min_k != null && raw.price_max_k != null
    ? (raw.price_min_k + raw.price_max_k) / 2 : raw.price_min_k ?? null;"""
    source=replace_once(source,old,new)
    source=replace_once(source,'    price_text: raw.price_min_k && raw.price_max_k ? `${raw.price_min_k}k–${raw.price_max_k}k` : `~${price}k`,',
        "    price_text: price == null ? (raw.menu_count ? 'Có menu giá online' : 'Chưa có giá') : `${raw.price_min_k}k–${raw.price_max_k ?? raw.price_min_k}k${raw.price_basis === 'online' ? ' · online' : ''}`,\n    menu: raw.menu || [], evaluated: raw.evaluated, model: raw.model, run_id: raw.run_id, source_urls: raw.source_urls || [],")
    source=replace_once(source,"    confidence: typeof raw.confidence === 'number' ? raw.confidence : 50,","    confidence: typeof raw.confidence === 'number' ? raw.confidence : null,")
    source=replace_once(source,"  if (state.budget === '50' && p.price >= 50) return false;","  if (state.budget !== 'all' && p.price == null) return false;\n  if (state.budget === '50' && p.price >= 50) return false;")
    source=replace_once(source,'Độ chắc ${p.confidence}%',"${p.evaluated ? `Độ chắc ${p.confidence}%` : 'Chưa chạy AI'}")
    source=source.replace('width:${p.confidence}%','width:${p.confidence ?? 0}%')
    source=replace_once(source,'function setMapMode(mode) {',"function setMapMode(mode) {\n  if (mode === '3d' && state.district === 'van_giang') { showToast('Khu vực này chưa có mô hình 3D. Hãy dùng bản đồ 2D để xem vị trí.'); return; }")
    source=replace_once(source,'      state.district = btn.dataset.d;',"      state.district = btn.dataset.d;\n      if (state.district === 'van_giang' && state.mapMode === '3d') setMapMode('real');")
    source=source.replace('if (window.Map3D) Map3D.sync();',"if (window.Map3D && state.mapMode === '3d') Map3D.sync();")
    model=(WEB/'map3d-multi.js').read_text(encoding='utf8')
    model=replace_once(model,".filter((p) => p.district === districtKey)",".filter((p) => p.district === districtKey && typeof p.lat === 'number' && typeof p.lng === 'number')")
    (WEB/'map3d-live.js').write_text(model,encoding='utf8')
    source=replace_once(source,'map3d-multi.js?v=7','map3d-live.js?v=1')
    source=source.replace('Chưa chắc — AI chuyển người kiểm, mời bạn tự quyết định.','Chưa đủ căn cứ kết luận. Mời bạn kiểm tra nguồn và tự quyết định.')
    source=replace_once(source,'${revHTML}','${revHTML}\n          ${liveMenuHTML(p)}')
    source=replace_once(source,"Không tải được tệp dữ liệu đầy đủ — đang hiển thị bộ dữ liệu mẫu ngoại tuyến.","Không tải được dữ liệu thật. Hãy chạy python -m cp4.server và kiểm tra tệp places_live.json; không tự hiển thị quán mẫu.")
    helper='''
function liveMenuHTML(p) {
  const sources = p.source_urls.map(url => `<a href="${escapeHTML(url)}" target="_blank" rel="noopener">Nguồn quán/menu ↗</a>`).join(' · ');
  const table = p.menu.length ? `<details class="live-menu"><summary>Menu online (${p.menu.length} món)</summary><p>Giá đặt online; chưa gồm phí giao và ưu đãi theo đơn.</p><table><thead><tr><th>Món</th><th>Giá online</th><th>Giá gốc</th></tr></thead><tbody>${p.menu.map(i=>`<tr><td>${escapeHTML(i.name)}<small>${escapeHTML(i.description)}</small></td><td>${i.online_price_vnd == null ? '—' : i.online_price_vnd.toLocaleString('vi-VN')+' đ'}</td><td>${i.original_price_vnd == null ? '—' : i.original_price_vnd.toLocaleString('vi-VN')+' đ'}</td></tr>`).join('')}</tbody></table></details>` : '<p>Chưa ghép được menu online cho địa chỉ này.</p>';
  return `<div class="live-sources">${p.evaluated ? escapeHTML(p.model+' · '+p.run_id) : 'Chưa có phán quyết AI cho quán này.'}<br>${sources}</div>${table}`;
}
'''
    source=source.replace('\ninit();',helper+'\ninit();')
    (WEB/'ui-live.js').write_text(source,encoding='utf8')
    page=(WEB/'index.html').read_text(encoding='utf8')
    page=replace_once(page,'ui.js?v=14','ui-live.js?v=2')
    page=page.replace('>Bản đồ 3D</button>','>3D minh họa</button>')
    page=page.replace('Rê chuột vào một khu để nâng lên và xem quán. Kéo để xoay.','Mô hình minh họa; dùng bản đồ 2D để định vị. Kéo để xoay.')
    page=page.replace('4 quận Hà Nội &amp; Hoàn Kiếm','Gia Lâm &amp; Văn Giang · dữ liệu hiện có')
    page=page.replace('Phân loại quán ăn local tại 4 quận Hà Nội (Gia Lâm · VinUni/OCP, Cầu Giấy, Hai Bà Trưng, Hoàng Mai) và Hoàn Kiếm kèm nguồn kiểm chứng.','Bản đồ quán ăn Gia Lâm và Văn Giang, menu ShopeeFood và kết quả AI đã lưu kèm nguồn.')
    page=page.replace('<body>','''<body>
<aside class="live-intro"><b>Mốc của bạn: VinUni</b> (20.9889, 105.9447) · Khoảng cách đường chim bay xấp xỉ, sắp gần → xa; không phải quãng đường giao hàng. <label><input id="shopeeOnly" type="checkbox"> Chỉ quán ShopeeFood</label> · <a href="menu.html">150 quán & menu giá online</a> · <a href="/cp4/public/status.html">Hồ sơ CP4</a></aside>''',1)
    page=page.replace('</head>','''<style>.live-intro{padding:12px 20px;background:#edf2e6;color:#213820;font:14px Arial}.live-intro a{color:#30541c}.live-menu{margin:12px 0;max-height:380px;overflow:auto}.live-menu summary{cursor:pointer;font-weight:bold}.live-menu table{width:100%;border-collapse:collapse;font-size:13px}.live-menu th,.live-menu td{padding:8px;text-align:left;border-bottom:1px solid #ddd}.live-menu small{display:block;color:#666;max-width:320px}.live-sources{font-size:12px;line-height:1.7}.live-sources a{color:#30541c}</style></head>''')
    page=page.replace('<button type="button" class="d-chip" data-d="hoan_kiem"', '<button type="button" class="d-chip" data-d="van_giang" aria-pressed="false">Văn Giang · OCP2</button>\n          <button type="button" class="d-chip" data-d="hoan_kiem"',1)
    (WEB/'live.html').write_text(page,encoding='utf8')
    print('Generated web-demo/live.html and ui-live.js; source UI unchanged')
if __name__=='__main__':main()
