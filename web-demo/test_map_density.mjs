import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('./map-density.js', import.meta.url), 'utf8'), context);
const group = context.window.MapDensity.groupPoints;
for (const width of [320, 390, 800, 1440]) {
  const points = Array.from({ length: 552 }, (_, id) => ({
    id, x: 20 + ((id * 97) % (width - 40)), y: 40 + ((id * 163) % 600),
  }));
  const groups = group(points, width);
  assert.ok(groups.length <= (width < 500 ? 12 : 24), 'marker budget must hold');
  const ids = groups.flatMap(g => g.members.map(p => p.id));
  assert.equal(ids.length, points.length, 'no restaurant is dropped');
  assert.equal(new Set(ids).size, points.length, 'no restaurant is represented twice');
  for (let a = 0; a < groups.length; a++) for (let b = a + 1; b < groups.length; b++) {
    assert.ok(Math.hypot(groups[a].x - groups[b].x, groups[a].y - groups[b].y) >= 42,
      'neighbouring badges must not overlap');
  }
}
assert.equal(group([], 390).length, 0);
assert.equal(group(Array.from({ length: 150 }, (_, id) => ({ id, x: 40, y: 40 })), 390).length, 1,
  'co-located restaurants remain reachable through one cluster');
console.log('Map density: conservation, overlap, mobile/desktop limits and co-located stores passed.');
