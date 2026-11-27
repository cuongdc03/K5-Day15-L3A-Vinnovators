/* Bản đồ 3D khu Hoàn Kiếm dạng mô hình thu nhỏ (Three.js r128, bản global).
   Rê chuột vào một khu: khu đó mọc cao lên, các khu khác lùi lại, các quán nhô lên kèm nhãn.
   Bấm vào khu để giữ nguyên (dùng cho màn cảm ứng). Kéo để xoay, cuộn để zoom.
   Đọc dữ liệu từ index.html: PLACES, state, matches, hiddenReason, select. */
(function () {
  const wrap = document.getElementById('mapwrap');
  const canvas = document.getElementById('gl');
  const card = document.getElementById('zonecard');
  const hint = document.getElementById('hint');
  if (!wrap || !canvas || !window.THREE) { wrap && wrap.classList.add('no-gl'); return; }
  const T = THREE;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { wrap.classList.add('no-gl'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(32, 1, 0.5, 200);

  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const px = (x, y) => [(x - 320) / 20, (y - 320) / 20];

  /* Ánh sáng và nền */
  scene.add(new T.HemisphereLight(0xffffff, 0xb9c9b0, 0.62));
  const sun = new T.DirectionalLight(0xffe9c4, 0.9);
  sun.position.set(-14, 24, 12);
  sun.castShadow = true;
  const big = Math.min(innerWidth, innerHeight) > 600;
  sun.shadow.mapSize.set(big ? 2048 : 1024, big ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun);

  /* Khu vực. Toạ độ tâm tính theo hệ 640x640 của sơ đồ cũ */
  const ZONES = [
    { name: 'Phố cổ phía Bắc', sub: 'Hàng Mành, Hàng Cót, Hàng Bạc', c: px(220, 170), kind: 'old' },
    { name: 'Hàng Gai, Nhà Thờ', sub: 'phía Tây hồ', c: px(170, 320), kind: 'old' },
    { name: 'Tạ Hiện, Đinh Tiên Hoàng', sub: 'phía Đông Bắc', c: px(450, 190), kind: 'mid' },
    { name: 'Hàng Khay, Tràng Tiền', sub: 'phía Đông Nam', c: px(470, 400), kind: 'big' },
    { name: 'Lê Thái Tổ', sub: 'phía Nam', c: px(250, 450), kind: 'mid' }
  ];
  const zoneAt = (x, z) => {
    let b = 0, bd = 1e9;
    ZONES.forEach((Z, i) => { const d = (x - Z.c[0]) ** 2 + (z - Z.c[1]) ** 2; if (d < bd) { bd = d; b = i; } });
    return b;
  };

  /* Hồ Gươm */
  const LX = 1.0, LZ = 2.2, LRX = 2.9, LRZ = 5.0;
  const ws = t => 0.72 + 0.28 * (t + 1) / 2;
  const inLake = (x, z, m) => {
    const dx = x - LX, dz = z - LZ, t = clamp(dz / LRZ, -1, 1);
    const nx = dx / (LRX * ws(t) + m), nz = dz / (LRZ + m);
    return nx * nx + nz * nz < 1;
  };

  /* Quán, đặt trên bản đồ */
  const pins = PLACES.map(p => {
    const [x, z] = px(p.x, p.y);
    return { p, x, z, zone: zoneAt(x, z), v: 0, hover: 0 };
  });

  /* Nền: đường phố vẽ lên texture */
  // Mô hình rộng 28 x 22, tâm ở (0, OZ). Lưới 1 đơn vị, trục phố cách nhau 5.
  const S = 64, SX = 28, SZ = 22, OZ = -1;
  const tx2 = x => (x + SX / 2) * S, tz2 = z => (z - OZ + SZ / 2) * S;
  const isStreetX = k => k % 5 === 0, isStreetZ = j => j % 5 === 0;
  function groundTexture() {
    const c = document.createElement('canvas'); c.width = SX * S; c.height = SZ * S;
    const g = c.getContext('2d');
    g.fillStyle = '#C5D6BA'; g.fillRect(0, 0, c.width, c.height);
    const cell = (x, z, col) => { g.fillStyle = col; g.fillRect(tx2(x - 0.5), tz2(z - 0.5), S, S); };
    for (let k = 0; k < 27; k++) for (let j = 0; j < 21; j++) {
      const x = -13 + k, z = -11 + j;
      if (isStreetX(k) || isStreetZ(j)) cell(x, z, '#E7E2CF');
      else if (inLake(x, z, 1.4)) cell(x, z, '#B7CFA9');
    }
    g.strokeStyle = '#D3CDB4'; g.lineWidth = 3; g.setLineDash([14, 16]);
    for (let k = 0; k < 27; k += 5) { const v = tx2(-13 + k); g.beginPath(); g.moveTo(v, 0); g.lineTo(v, c.height); g.stroke(); }
    for (let j = 0; j < 21; j += 5) { const v = tz2(-11 + j); g.beginPath(); g.moveTo(0, v); g.lineTo(c.width, v); g.stroke(); }
    g.setLineDash([]);
    pins.forEach(P => {      // quảng trường nhỏ dưới mỗi ghim
      const cx = tx2(P.x), cy = tz2(P.z);
      const r = g.createRadialGradient(cx, cy, 0, cx, cy, 1.15 * S);
      r.addColorStop(0, '#F7F3E4'); r.addColorStop(0.8, '#E7E2CF'); r.addColorStop(1, 'rgba(231,226,207,0)');
      g.fillStyle = r; g.beginPath(); g.arc(cx, cy, 1.15 * S, 0, 7); g.fill();
    });
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8;
    return t;
  }
  const ground = new T.Mesh(new T.PlaneGeometry(SX, SZ), new T.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.z = OZ; ground.receiveShadow = true; scene.add(ground);
  const plate = new T.Mesh(new T.BoxGeometry(SX + 0.6, 0.9, SZ + 0.6), new T.MeshStandardMaterial({ color: 0xA9BA9E, roughness: 1 }));
  plate.position.set(0, -0.47, OZ); scene.add(plate);
  (function () {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    r.addColorStop(0, 'rgba(20,35,28,.45)'); r.addColorStop(1, 'rgba(20,35,28,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    const m = new T.Mesh(new T.PlaneGeometry(44, 38), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, -0.95, OZ); scene.add(m);
  })();

  /* Mặt hồ, ánh nước chạy chậm */
  const lakeShape = new T.Shape();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2, t = Math.sin(a);
    const x = LX + Math.cos(a) * LRX * ws(t), z = LZ + Math.sin(a) * LRZ;
    i ? lakeShape.lineTo(x, -z) : lakeShape.moveTo(x, -z);
  }
  const waterTex = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(190,225,236,.55)'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 46; i++) { const x = rnd() * 256, y = rnd() * 256, l = 14 + rnd() * 30; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (rnd() - .5) * 4); g.stroke(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2.4, 4); t.encoding = T.sRGBEncoding; return t;
  })();
  const lake = new T.Mesh(new T.ShapeGeometry(lakeShape, 48), new T.MeshStandardMaterial({ color: 0x6DB0C9, map: waterTex, roughness: 0.22, metalness: 0.05 }));
  lake.rotation.x = -Math.PI / 2; lake.position.y = 0.04; lake.receiveShadow = true; scene.add(lake);
  const bank = new T.Mesh(new T.ShapeGeometry(lakeShape, 48), new T.MeshStandardMaterial({ color: 0xB9CFA9, roughness: 1 }));
  // Viền bờ: cùng hình hồ, phóng 9% quanh gốc toạ độ rồi bù lại độ lệch tâm.
  bank.rotation.x = -Math.PI / 2; bank.scale.set(1.09, 1.09, 1);
  bank.position.set(-LX * 0.09, 0.02, -LZ * 0.09); scene.add(bank);

  /* Nhà */
  const WALLS = [0xEFE2C3, 0xE5D2A4, 0xDDBF86, 0xD3E0CE, 0xBFD0CB, 0xE3C5B4, 0xEDE6D3, 0xDAD0B4];
  const ROOFS = [0x9E5238, 0x8C4A34, 0x7A5A4A, 0x5F7470, 0xA9744F];
  const lots = [];
  const pinNear = (x, z) => pins.some(P => (P.x - x) ** 2 + (P.z - z) ** 2 < 1.2 * 1.2);
  const treeSpots = [];
  for (let k = 0; k < 27; k++) for (let j = 0; j < 21; j++) {
    const x = -13 + k, z = -11 + j;
    if (isStreetX(k) || isStreetZ(j)) continue;
    if (inLake(x, z, 1.4)) { if (rnd() < 0.6) treeSpots.push([x + (rnd() - .5) * .5, z + (rnd() - .5) * .5, 0.7 + rnd() * 0.5]); continue; }
    if (pinNear(x, z)) continue;
    if (rnd() < 0.06) { treeSpots.push([x, z, 0.8 + rnd() * 0.5]); continue; }
    const zone = zoneAt(x, z), kind = ZONES[zone].kind;
    const mk = (ox, oz, sx, sz, h) => lots.push({
      x: x + ox, z: z + oz, sx, sz, h, rh: 0.26 + rnd() * 0.22, zone,
      wall: new T.Color(pick(WALLS)), roof: new T.Color(pick(ROOFS)), d: Math.hypot(x, z)
    });
    if (kind === 'old') {            // nhà ống: mặt tiền hẹp, sâu
      const h = 0.7 + rnd() * 1.0;
      mk(-0.23, 0, 0.42, 0.86, h * (0.85 + rnd() * 0.3));
      mk(0.23, 0, 0.42, 0.86, 0.7 + rnd() * 1.0);
    } else if (kind === 'big') {
      mk(0, 0, 0.84, 0.84, 1.1 + rnd() * 1.1);
    } else {
      mk(-0.2, 0, 0.5, 0.84, 0.8 + rnd() * 1.0);
      mk(0.28, 0, 0.36, 0.84, 0.8 + rnd() * 1.0);
    }
  }
  const walls = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ roughness: 0.9 }), lots.length);
  const coneG = new T.ConeGeometry(0.7071, 1, 4, 1); coneG.rotateY(Math.PI / 4);
  const roofs = new T.InstancedMesh(coneG, new T.MeshStandardMaterial({ roughness: 0.85 }), lots.length);
  [walls, roofs].forEach(m => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });
  const zoneLots = ZONES.map(() => []);
  lots.forEach((L, i) => zoneLots[L.zone].push(i));

  const NZ = ZONES.length;
  const g = new Array(NZ).fill(0), gt = new Array(NZ).fill(0);   // mức mọc cao
  const dim = new Array(NZ).fill(0), dimT = new Array(NZ).fill(0); // mức lùi lại
  const HL = new T.Color(0xFFF3D6), SAGE = new T.Color(0xD2DDCA), col = new T.Color();
  const m4 = new T.Matrix4(), q0 = new T.Quaternion(), pos = new T.Vector3(), scl = new T.Vector3();
  let introT = reduce ? 3 : 0;

  function setLot(i) {
    const L = lots[i], gz = g[L.zone];
    const k = ease(clamp((introT - L.d * 0.04) / 0.6, 0, 1));
    const h = (L.h * (1 + 0.5 * gz) + 0.3 * gz) * k;
    pos.set(L.x, h / 2, L.z); scl.set(L.sx, Math.max(h, 0.001), L.sz);
    m4.compose(pos, q0, scl); walls.setMatrixAt(i, m4);
    const rh = L.rh * k;
    pos.set(L.x, h + rh / 2, L.z); scl.set(L.sx * 1.12, Math.max(rh, 0.001), L.sz * 1.12);
    m4.compose(pos, q0, scl); roofs.setMatrixAt(i, m4);
    col.copy(L.wall).lerp(HL, 0.4 * gz).lerp(SAGE, 0.5 * dim[L.zone]); walls.setColorAt(i, col);
    col.copy(L.roof).lerp(SAGE, 0.45 * dim[L.zone]); roofs.setColorAt(i, col);
  }
  for (let i = 0; i < lots.length; i++) setLot(i);
  function flush() {
    walls.instanceMatrix.needsUpdate = roofs.instanceMatrix.needsUpdate = true;
    walls.instanceColor.needsUpdate = roofs.instanceColor.needsUpdate = true;
  }
  flush();

  /* Cây */
  const trees = new T.InstancedMesh(new T.IcosahedronGeometry(0.34, 0), new T.MeshStandardMaterial({ roughness: 1, flatShading: true }), treeSpots.length);
  trees.castShadow = true; trees.receiveShadow = true;
  const greens = [0x7FA878, 0x6E9B6B, 0x93B57F, 0x5F8F62];
  treeSpots.forEach(([x, z, s], i) => {
    pos.set(x, 0.3 * s + 0.15, z); scl.set(s, s * 1.1, s); m4.compose(pos, q0, scl); trees.setMatrixAt(i, m4);
    trees.setColorAt(i, col.set(pick(greens)));
  });
  scene.add(trees);

  /* Địa danh: Tháp Rùa, đảo Ngọc Sơn và cầu Thê Húc */
  const stone = new T.MeshStandardMaterial({ color: 0xE4E0D0, roughness: 0.9 });
  const redM = new T.MeshStandardMaterial({ color: 0xC0392B, roughness: 0.6 });
  const darkRoof = new T.MeshStandardMaterial({ color: 0x8E6A58, roughness: 0.8 });
  function island(x, z, r) {
    const m = new T.Mesh(new T.CylinderGeometry(r, r * 1.15, 0.28, 20), new T.MeshStandardMaterial({ color: 0xB9CFA9, roughness: 1 }));
    m.position.set(x, 0.12, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
  }
  island(1.3, 4.3, 0.55);
  [[0.5, 0.38, 0.5], [0.4, 0.34, 0.4], [0.3, 0.3, 0.3]].reduce((y, [w, h, d]) => {
    const b = new T.Mesh(new T.BoxGeometry(w, h, d), stone); b.position.set(1.3, y + h / 2, 4.3); b.castShadow = true; scene.add(b);
    const r = new T.Mesh(new T.ConeGeometry(w * 0.82, 0.16, 4), darkRoof); r.rotation.y = Math.PI / 4; r.position.set(1.3, y + h + 0.07, 4.3); r.castShadow = true; scene.add(r);
    return y + h + 0.14;
  }, 0.24);
  island(1.8, -1.3, 0.6);
  const temple = new T.Mesh(new T.BoxGeometry(0.55, 0.34, 0.4), stone); temple.position.set(1.8, 0.45, -1.3); temple.castShadow = true; scene.add(temple);
  const troof = new T.Mesh(new T.ConeGeometry(0.46, 0.22, 4), redM); troof.rotation.y = Math.PI / 4; troof.position.set(1.8, 0.72, -1.3); scene.add(troof);
  const bridgeCurve = new T.QuadraticBezierCurve3(new T.Vector3(3.15, 0.1, -1.3), new T.Vector3(2.65, 0.75, -1.3), new T.Vector3(2.25, 0.1, -1.3));
  const bridge = new T.Mesh(new T.TubeGeometry(bridgeCurve, 16, 0.07, 6), redM); bridge.castShadow = true; scene.add(bridge);

  /* Xe máy chạy trên các trục phố chính */
  // Trục phố không cắt qua hồ: x = -13, -8, 7, 12 và z = -11, -6, 9
  const bikeLines = [[-13, 'x'], [-8, 'x'], [7, 'x'], [12, 'x'], [-11, 'z'], [-6, 'z'], [9, 'z']];
  const LIM = { x: [-12.5, 12.5], z: [-10.5, 8.5] };   // giới hạn chạy: x là toạ độ của trục z và ngược lại
  const bikes = [];
  bikeLines.forEach(([line, axis]) => { for (let n = 0; n < 4; n++) {
    const lim = axis === 'x' ? LIM.z : LIM.x;
    bikes.push({ line: line + (rnd() > .5 ? .18 : -.18), axis, lim, p: lim[0] + rnd() * (lim[1] - lim[0]), v: (0.8 + rnd() * 1.2) * (rnd() > .5 ? 1 : -1) });
  } });
  const bikeMesh = new T.InstancedMesh(new T.BoxGeometry(0.15, 0.13, 0.34), new T.MeshStandardMaterial({ roughness: 0.7 }), bikes.length);
  const bcols = [0x2d3a35, 0xB2302A, 0x2f5f8f, 0xE3B21A, 0x444444];
  bikes.forEach((b, i) => bikeMesh.setColorAt(i, col.set(pick(bcols))));
  bikeMesh.castShadow = true; scene.add(bikeMesh);
  const qy = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 2);
  function moveBikes(dt) {
    bikes.forEach((b, i) => {
      b.p += b.v * dt; if (b.p > b.lim[1]) b.p = b.lim[0]; if (b.p < b.lim[0]) b.p = b.lim[1];
      // axis 'x': trục phố chạy dọc (x cố định), xe chạy theo z; axis 'z': xe chạy theo x
      if (b.axis === 'z') { pos.set(b.p, 0.1, b.line); m4.compose(pos, qy, scl.set(1, 1, 1)); }
      else { pos.set(b.line, 0.1, b.p); m4.compose(pos, q0, scl.set(1, 1, 1)); }
      bikeMesh.setMatrixAt(i, m4);
    });
    bikeMesh.instanceMatrix.needsUpdate = true;
  }
  moveBikes(0);

  /* Ghim quán: cọc, đầu theo loại phán quyết, nhãn nổi */
  const VCOL = { local: 0x1E6B49, chain: 0xB2302A, tourist: 0xE3B21A, unsure: 0x41536B };
  const PIN_H = 4.8;
  function headGeo(v) {
    if (v === 'local') return new T.SphereGeometry(0.32, 22, 16);
    if (v === 'chain') return new T.BoxGeometry(0.52, 0.52, 0.52);
    if (v === 'tourist') return new T.OctahedronGeometry(0.46);
    return new T.TorusGeometry(0.27, 0.1, 12, 28);
  }
  function labelSprite(p) {
    const c = document.createElement('canvas'); c.width = 640; c.height = 156;
    const x = c.getContext('2d');
    x.shadowColor = 'rgba(20,35,28,.28)'; x.shadowBlur = 14; x.shadowOffsetY = 4;
    x.fillStyle = 'rgba(250,251,248,.97)';
    x.beginPath(); x.roundRect ? x.roundRect(14, 10, 612, 110, 22) : x.rect(14, 10, 612, 110); x.fill();
    x.shadowColor = 'transparent';
    x.fillStyle = '#' + VCOL[p.v].toString(16).padStart(6, '0');
    x.beginPath(); x.arc(52, 65, 14, 0, 7); x.fill();
    x.fillStyle = '#14231C'; x.textBaseline = 'middle';
    let fs = 44; const f = () => { x.font = '700 ' + fs + 'px "Bricolage Grotesque","Be Vietnam Pro",sans-serif'; }; f();
    while (x.measureText(p.name).width > 500 && fs > 26) { fs -= 2; f(); }
    x.fillText(p.name, 84, 48);
    x.fillStyle = '#56655D'; x.font = '500 28px "Be Vietnam Pro",sans-serif';
    x.fillText(p.dish + ' · ' + p.price + 'k', 84, 90);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthTest: false, opacity: 0 }));
    s.scale.set(3.9, 0.95, 1); s.renderOrder = 20; return s;
  }
  const hitG = new T.SphereGeometry(0.62, 8, 6);
  const hitM = new T.MeshBasicMaterial({ visible: false });
  pins.forEach(P => {
    const c = VCOL[P.p.v];
    P.stem = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1, 8), new T.MeshStandardMaterial({ color: 0x2A3A32, roughness: 0.6 }));
    P.head = new T.Mesh(headGeo(P.p.v), new T.MeshStandardMaterial({ color: c, roughness: 0.35, emissive: c, emissiveIntensity: 0.18 }));
    P.head.castShadow = true;
    P.dot = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.06, 24), new T.MeshStandardMaterial({ color: c, roughness: 0.5, transparent: true }));
    P.dot.position.set(P.x, 0.05, P.z);
    P.label = labelSprite(P.p);
    P.hit = new T.Mesh(hitG, hitM); P.hit.userData.pin = P;
    P.stem.position.set(P.x, 0, P.z); P.head.position.set(P.x, 0, P.z); P.label.position.set(P.x, 0, P.z); P.hit.position.set(P.x, 0.3, P.z);
    [P.stem, P.head, P.dot, P.label, P.hit].forEach(o => scene.add(o));
  });

  /* Camera tự dựng: kéo để xoay, cuộn để zoom */
  // zoom là hệ số nhân lên khoảng cách vừa khít (fit), tính lại mỗi khi đổi cỡ khung.
  const goal = { az: 0.62, el: 0.86, zoom: 1, tx: 0, tz: OZ };
  const cur = { az: goal.az, el: goal.el, zoom: 1.4, tx: 0, tz: OZ };
  let fit = 55;
  function placeCam(t) {
    const sway = reduce ? 0 : Math.sin(t * 0.18) * 0.035;
    const d = cur.zoom * fit, az = cur.az + sway;
    cam.position.set(cur.tx + d * Math.cos(cur.el) * Math.sin(az), d * Math.sin(cur.el), cur.tz + d * Math.cos(cur.el) * Math.cos(az));
    cam.lookAt(cur.tx, 0.4, cur.tz);
  }
  function size() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    const tanV = Math.tan(cam.fov * Math.PI / 360), tanH = tanV * cam.aspect;
    fit = Math.max(48 / (2 * tanH), 30 / (2 * tanV));
    dirty = true;
  }
  let dirty = true;
  addEventListener('resize', size);

  /* Chọn bằng con trỏ */
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  let ptr = null, drag = null, hoverZone = null, hoverPin = null, sticky = null, pickDirty = false, lastSel = undefined;
  const okPin = P => matches(P.p) && !hiddenReason(P.p);
  function doPick() {
    pickDirty = false; hoverPin = null; hoverZone = null;
    if (!ptr) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((ptr.x - r.left) / r.width) * 2 - 1, -((ptr.y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const ph = ray.intersectObjects(pins.filter(okPin).map(P => P.hit), false);
    if (ph.length) { hoverPin = ph[0].object.userData.pin; hoverZone = hoverPin.zone; return; }
    const wh = ray.intersectObject(walls, false);
    if (wh.length && wh[0].instanceId != null) hoverZone = lots[wh[0].instanceId].zone;
  }
  canvas.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, az: goal.az, el: goal.el, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    ptr = { x: e.clientX, y: e.clientY };
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
      if (drag.moved) { goal.az = drag.az - dx * 0.006; goal.el = clamp(drag.el + dy * 0.004, 0.45, 1.2); canvas.style.cursor = 'grabbing'; }
    }
    pickDirty = true;
  });
  canvas.addEventListener('pointerup', e => {
    const wasClick = drag && !drag.moved; drag = null; canvas.style.cursor = '';
    if (!wasClick) return;
    ptr = { x: e.clientX, y: e.clientY }; doPick();
    if (hoverPin) { select(hoverPin.p.id); }
    else { sticky = hoverZone != null && hoverZone !== sticky ? hoverZone : null; if (hoverZone == null && state.sel) select(state.sel); }
    hideHint();
  });
  canvas.addEventListener('pointerleave', () => { if (!drag) { ptr = null; pickDirty = true; } });
  canvas.addEventListener('wheel', e => { e.preventDefault(); goal.zoom = clamp(goal.zoom * Math.exp(e.deltaY * 0.0012), 0.4, 1.2); }, { passive: false });
  function hideHint() { if (hint) hint.classList.add('off'); }

  /* Thẻ tên khu */
  let shownZone = null;
  function updateCard(z) {
    if (z === shownZone) return; shownZone = z;
    if (z == null) { card.classList.remove('on'); return; }
    const here = pins.filter(P => P.zone === z && matches(P.p));
    const shown = here.filter(P => !hiddenReason(P.p));
    const nl = shown.filter(P => P.p.v === 'local').length, nu = shown.filter(P => P.p.v === 'unsure').length;
    const nh = here.length - shown.length;
    card.innerHTML = '<b>' + ZONES[z].name + '</b><span>' + ZONES[z].sub + '</span><span>' +
      (shown.length ? nl + ' quán local' + (nu ? ', ' + nu + ' chưa chắc' : '') : 'Chưa có quán local khớp') + (nh ? ' · ' + nh + ' đã ẩn' : '') + '</span>';
    card.classList.add('on');
  }

  /* Vòng lặp */
  let last = performance.now(), t = 0, visible = true, running = false, raf = 0;
  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const sp = reduce ? 1 : Math.min(1, dt * 7);
    let busy = false;

    // Khu đang được chú ý
    const selPin = state.sel != null ? pins.find(P => P.p.id === state.sel) : null;
    if (state.sel !== lastSel) {
      lastSel = state.sel;
      if (selPin) { goal.tx = selPin.x * 0.6; goal.tz = OZ + (selPin.z - OZ) * 0.6; goal.zoom = Math.min(goal.zoom, 0.68); }
      else { goal.tx = 0; goal.tz = OZ; goal.zoom = Math.max(goal.zoom, 0.95); }
    }
    if (pickDirty || drag || (ptr && Math.abs(cur.az - goal.az) + Math.abs(cur.zoom - goal.zoom) > 0.001)) doPick();
    const active = hoverZone != null ? hoverZone : (sticky != null ? sticky : (selPin ? selPin.zone : null));
    updateCard(active);
    if (hoverZone != null) hideHint();
    for (let z = 0; z < NZ; z++) { gt[z] = active === z ? 1 : 0; dimT[z] = active != null && active !== z ? 1 : 0; }

    // Nhà mọc cao, lùi lại
    if (introT < 3) { introT += dt * 0.95; busy = true; }
    for (let z = 0; z < NZ; z++) {
      const dg = gt[z] - g[z], dd = dimT[z] - dim[z];
      if (Math.abs(dg) > 0.002 || Math.abs(dd) > 0.002 || introT < 3) {
        g[z] += dg * sp; dim[z] += dd * sp; busy = true;
        zoneLots[z].forEach(setLot);
      }
    }
    if (busy) flush();

    // Ghim
    pins.forEach(P => {
      const ok = okPin(P), isSel = state.sel === P.p.id;
      const vt = ok && (P.zone === active || isSel) ? 1 : 0;
      P.v += (vt - P.v) * sp;
      const hv = hoverPin === P ? 1 : 0; P.hover += (hv - P.hover) * sp;
      const v = P.v, hh = PIN_H * v;
      P.stem.visible = v > 0.01; P.stem.scale.set(1, Math.max(hh, 0.001), 1); P.stem.position.y = hh / 2;
      const bob = reduce ? 0 : Math.sin(t * 2 + P.x) * 0.06 * v;
      P.head.position.y = hh + 0.22 + bob; P.head.visible = v > 0.01;
      const hs = (0.5 + 0.5 * v) * (1 + 0.25 * P.hover + (isSel ? 0.15 : 0)); P.head.scale.setScalar(hs);
      P.head.rotation.y += dt * 0.9; if (P.p.v === 'unsure') P.head.rotation.x = Math.PI / 2 + Math.sin(t) * 0.2;
      P.label.position.y = hh + 1.15; P.label.material.opacity = v; P.label.visible = v > 0.02;
      const ls = 0.82 + 0.18 * v + 0.06 * P.hover; P.label.scale.set(3.9 * ls, 0.95 * ls, 1);
      P.dot.material.opacity = ok ? (1 - v * 0.7) : 0.18; P.dot.scale.setScalar(1 - v * 0.4 + 0.2 * P.hover);
      P.hit.position.y = hh + 0.25;
      if (Math.abs(vt - v) > 0.003) busy = true;
    });
    canvas.style.cursor = drag && drag.moved ? 'grabbing' : (hoverPin || hoverZone != null ? 'pointer' : 'grab');

    // Camera
    const cs = reduce ? 1 : Math.min(1, dt * 4.5);
    ['az', 'el', 'zoom', 'tx', 'tz'].forEach(k => { const d = goal[k] - cur[k]; cur[k] += d * cs; if (Math.abs(d) > 0.002) busy = true; });
    placeCam(t);

    if (!reduce) { waterTex.offset.x += dt * 0.012; waterTex.offset.y += dt * 0.006; moveBikes(dt); busy = true; }
    if (busy || dirty) { renderer.render(scene, cam); dirty = false; }
    raf = requestAnimationFrame(tick);
  }
  function start() { if (running || !visible || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.02 }).observe(wrap);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  size(); placeCam(0); start();

  window.Map3D = { sync() { dirty = true; shownZone = -1; } };})();
