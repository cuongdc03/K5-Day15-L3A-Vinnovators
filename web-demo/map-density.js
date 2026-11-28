/* Small, accessible screen-space groups for the illustrated 3D map. */
(function () {
  'use strict';
  function groupPoints(points, width) {
    const limit = width < 500 ? 12 : 24;
    let cell = width < 500 ? 64 : 76, groups;
    do {
      const buckets = new Map();
      for (const point of points) {
        const key = `${Math.floor(point.x / cell)}:${Math.floor(point.y / cell)}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(point);
      }
      groups = [...buckets.values()].map((members) => ({ members,
        x: members.reduce((n, p) => n + p.x, 0) / members.length,
        y: members.reduce((n, p) => n + p.y, 0) / members.length }));
      cell *= 1.2;
    } while (groups.length > limit);
    // Neighbouring grid cells can still meet at an edge. Merge those badges.
    for (let a = 0; a < groups.length; a++) for (let b = a + 1; b < groups.length; b++) {
      const first = groups[a], next = groups[b];
      if (Math.hypot(first.x - next.x, first.y - next.y) < 42) {
        const n = first.members.length, m = next.members.length;
        first.x = (first.x * n + next.x * m) / (n + m);
        first.y = (first.y * n + next.y * m) / (n + m);
        first.members.push(...next.members); groups.splice(b, 1); a = -1; break;
      }
    }
    return groups;
  }
  window.MapDensity = { groupPoints };
  window.createMapDensityLayer = function (wrap, options) {
    const layer = document.createElement('div'); layer.className = 'three-density-layer';
    const note = document.createElement('details'); note.className = 'three-density-note';
    const headline = document.createElement('summary');
    const body = document.createElement('div'); body.className = 'density-note-body';
    const text = document.createElement('span');
    const back = document.createElement('button'); back.type = 'button'; back.textContent = 'Xem 2D';
    back.addEventListener('click', () => window.setMapMode('real'));
    body.append(text, back); note.append(headline, body);
    const picker = document.createElement('section'); picker.className = 'density-picker'; picker.hidden = true;
    picker.setAttribute('aria-label', 'Chọn quán trong cụm');
    const heading = document.createElement('b');
    const close = document.createElement('button'); close.type = 'button'; close.className = 'density-close';
    close.textContent = 'Đóng';
    const list = document.createElement('div'); list.className = 'density-picker-list';
    picker.append(heading, close, list); wrap.append(layer, note, picker);
    const buttons = new Map(); let lastUpdate = 0, summary = {}, opener = null;
    function closePicker() { picker.hidden = true; if (opener && opener.isConnected) opener.focus(); }
    close.addEventListener('click', closePicker);
    picker.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.stopPropagation(); closePicker(); } });
    function choose(group, button) {
      if (group.members.length === 1) { picker.hidden = true; options.select(group.members[0].pin.p.id); return; }
      opener = button; picker.hidden = false; heading.textContent = `${group.members.length} quán trong cụm`;
      list.replaceChildren();
      for (const item of [...group.members].sort((a, b) => a.pin.p.name.localeCompare(b.pin.p.name, 'vi'))) {
        const pick = document.createElement('button'); pick.type = 'button';
        pick.textContent = item.pin.p.name;
        pick.addEventListener('click', () => { picker.hidden = true; options.select(item.pin.p.id); });
        list.appendChild(pick);
      }
      options.focus(group.members.map((item) => item.pin)); close.focus();
    }
    return {
      update(points, width, selected, visible, outside, selectedOutside) {
        layer.hidden = !visible || !!selected; note.hidden = !visible;
        if (!visible || selected) picker.hidden = true;
        const now = performance.now();
        if (now - lastUpdate < 140) return;
        lastUpdate = now;
        const groups = visible && !selected ? groupPoints(points, width) : [];
        const keep = new Set();
        for (const group of groups) {
          const key = group.members.map((p) => p.pin.p.id).sort().join(','); keep.add(key);
          let button = buttons.get(key);
          if (!button) {
            button = document.createElement('button'); button.type = 'button';
            button.className = 'map-density-cluster';
            button.addEventListener('click', () => choose(button.group, button));
            buttons.set(key, button); layer.appendChild(button);
          }
          button.group = group; const count = group.members.length;
          button.classList.toggle('is-single', count === 1); button.textContent = count > 1 ? String(count) : '';
          button.title = count > 1 ? `${count} quán · bấm để chọn` : group.members[0].pin.p.name;
          button.setAttribute('aria-label', button.title);
          button.style.left = `${group.x}px`; button.style.top = `${group.y}px`;
        }
        for (const [key, button] of buttons) if (!keep.has(key)) { button.remove(); buttons.delete(key); }
        text.textContent = selectedOutside ? 'Quán đã chọn nằm ngoài mô hình này.'
          : selected ? 'Đang xem quán đã chọn.'
            : `${points.length} quán trong góc nhìn · Bấm cụm để chọn${outside ? ` · ${outside} ngoài mô hình` : ''}`;
        back.hidden = !outside && !selectedOutside;
        headline.textContent = selectedOutside ? 'Quán nằm ngoài mô hình'
          : selected ? 'Quán đã chọn' : `${points.length} quán · ${groups.length} cụm`;
        if (selectedOutside !== summary.selectedOutside) note.open = !!selectedOutside;
        summary = { markerCount: groups.length, representedCount: groups.reduce((n, g) => n + g.members.length, 0),
          projectedCount: points.length, outsideCount: outside, selectedOutside, visible };
      },
      close: () => { picker.hidden = true; lastUpdate = 0; },
      diagnostics: () => summary,
    };
  };
})();
