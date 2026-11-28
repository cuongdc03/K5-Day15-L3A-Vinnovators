/* Mô hình 3D khác biệt rõ rệt theo địa lý thật của 5 quận Hà Nội:
   - Hoàn Kiếm (Hồ Gươm · Tháp Rùa · Cầu Thê Húc · Đền Ngọc Sơn · Nhà Thờ Lớn · nhà ống Phố Cổ mái ngói)
   - Gia Lâm · VinUni / Ocean Park 1 (Biển hồ Ngọc Trai cát trắng · khuôn viên Gothic VinUni · tháp Sapphire/Masteri · Vincom)
   - Cầu Giấy (KHÔNG hồ giữa · cụm cao ốc kính Duy Tân · đường sắt trên cao Nhổn – Ga HN · nhà phố & CV Cầu Giấy góc Đông Nam)
   - Hai Bà Trưng (KHÔNG hồ giữa · Đại học Bách Khoa cổng Parabol + nhà C1 + sân vận động · đại lộ cây xanh · khu tập thể cũ)
   - Hoàng Mai (KHÔNG hồ giữa · kênh Sông Sét hẹp có cầu bắc qua · nút giao Tân Mai – Giải Phóng · chợ dân sinh mái vòm · nhà ống dày) */
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
  const cam = new T.PerspectiveCamera(32, 1, 0.5, 220);

  scene.add(new T.HemisphereLight(0xfffaf0, 0xb9c9b0, 0.72));
  const sun = new T.DirectionalLight(0xffe7bd, 0.92);
  sun.position.set(-14, 24, 12);
  sun.castShadow = true;
  const big = Math.min(innerWidth, innerHeight) > 600;
  sun.shadow.mapSize.set(big ? 2048 : 1024, big ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const px = (x, y) => [(x - 320) / 20, (y - 320) / 20];

  const VCOL = { local: 0x4d6b1f, chain: 0x9a2f1f, tourist: 0xe0a526, unsure: 0x3b4c63 };
  const PIN_H = 4.9;
  const S = 64, SX = 28, SZ = 22, OZ = -1;
  const tx2 = (x) => (x + SX / 2) * S;
  const tz2 = (z) => (z - OZ + SZ / 2) * S;

  /* Nhãn địa danh nổi trên mô hình 3D */
  function landmarkTag(text, x, y, z) {
    const c = document.createElement('canvas'); c.width = 400; c.height = 80;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(42,38,34,0.86)';
    g.beginPath(); g.roundRect ? g.roundRect(8, 8, 384, 64, 32) : g.rect(8, 8, 384, 64); g.fill();
    g.strokeStyle = 'rgba(255,250,240,0.45)'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#fffaf0'; g.font = '600 28px "Be Vietnam Pro",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 200, 41);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthTest: false, opacity: 0.92 }));
    s.position.set(x, y, z); s.scale.set(3.4, 0.68, 1); s.renderOrder = 15;
    return s;
  }

  /* Helper thêm hộp có bóng đổ */
  function addBox(parent, w, h, d, x, y, z, mat) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /* Helper tạo mái dốc 2 chiều kiểu nhà/chợ Hà Nội */
  function addGableRoof(parent, w, h, d, x, y, z, mat, rotateY) {
    const shape = new T.Shape();
    shape.moveTo(-w / 2, 0); shape.lineTo(0, h); shape.lineTo(w / 2, 0); shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    geo.translate(0, 0, -d / 2);
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rotateY) m.rotation.y = rotateY;
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /* 5 cấu hình địa lý & kiến trúc khác biệt hoàn toàn */
  const DISTRICT_3D = {
    hoan_kiem: {
      seed: 11,
      bounds: [21.0255, 21.0365, 105.8445, 105.8570],
      groundCol: '#C3D2B6',
      roadCol: '#EAE2CE',
      walls: [0xEFE2C3, 0xE5D2A4, 0xDDBF86, 0xE3C5B4, 0xEDE6D3],
      roofs: [0x9E5238, 0x8C4A34, 0x7A4B3A, 0xA96A47],
      roadsX: [-12, -8, -4, 6, 10],
      roadsZ: [-10, -6, -2, 6, 9],
      lake: { x: 2.2, z: 2.4, rx: 2.7, rz: 4.5, color: 0x5D9CB0 },
      zones: [
        { name: 'Phố cổ phía Bắc', sub: 'Hàng Mành, Hàng Quạt, Bát Đàn', c: [-5.5, -6.5], kind: 'old' },
        { name: 'Hàng Gai · Nhà Thờ Lớn', sub: 'Phía Tây Hồ Gươm', c: [-7.0, 1.5], kind: 'old' },
        { name: 'Tạ Hiện · Nguyễn Hữu Huân', sub: 'Phía Đông Bắc phố cổ', c: [6.5, -6.5], kind: 'old' },
        { name: 'Hàng Khay · Tràng Tiền', sub: 'Phía Đông Nam', c: [7.5, 4.0], kind: 'big' },
        { name: 'Lê Thái Tổ · Đinh Tiên Hoàng', sub: 'Ven bờ Hồ Hoàn Kiếm', c: [-1.0, 6.5], kind: 'mid' }
      ],
      isReserved(x, z) {
        // Khu vực Nhà Thờ Lớn phía Tây hồ
        return Math.abs(x + 6.2) < 1.8 && Math.abs(z - 2.6) < 1.5;
      },
      landmark(g, mats) {
        const island = (x, z, r) => {
          const m = new T.Mesh(new T.CylinderGeometry(r, r * 1.18, 0.28, 22), mats.bank);
          m.position.set(x, 0.12, z); m.castShadow = m.receiveShadow = true; g.add(m);
        };
        // Tháp Rùa 3 tầng trên đảo phía Nam
        island(2.2, 4.2, 0.62);
        [[0.56, 0.42, 0.56], [0.44, 0.36, 0.44], [0.32, 0.30, 0.32]].reduce((y, [w, h, d]) => {
          addBox(g, w, h, d, 2.2, y + h / 2, 4.2, mats.cream);
          const r = new T.Mesh(new T.ConeGeometry(w * 0.84, 0.17, 4), mats.darkRoof);
          r.rotation.y = Math.PI / 4; r.position.set(2.2, y + h + 0.08, 4.2); g.add(r);
          return y + h + 0.14;
        }, 0.24);
        // Đền Ngọc Sơn & Cầu Thê Húc sơn son phía Bắc
        island(2.8, -0.4, 0.68);
        addBox(g, 0.62, 0.36, 0.48, 2.8, 0.46, -0.4, mats.cream);
        const troof = new T.Mesh(new T.ConeGeometry(0.52, 0.25, 4), mats.red);
        troof.rotation.y = Math.PI / 4; troof.position.set(2.8, 0.76, -0.4); troof.castShadow = true; g.add(troof);
        const bridge = new T.Mesh(
          new T.TubeGeometry(new T.QuadraticBezierCurve3(
            new T.Vector3(4.5, 0.12, -0.4),
            new T.Vector3(3.9, 0.82, -0.4),
            new T.Vector3(3.35, 0.14, -0.4)
          ), 18, 0.08, 8),
          mats.red
        );
        bridge.castShadow = true; g.add(bridge);
        // Nhà Thờ Lớn (tháp chuông đôi cổ kính phía Tây hồ)
        const stone = new T.MeshStandardMaterial({ color: 0xB8B0A0, roughness: 0.92 });
        addBox(g, 1.9, 1.3, 1.1, -6.2, 0.65, 2.6, stone);
        addGableRoof(g, 1.15, 0.55, 1.85, -6.2, 1.3, 2.6, mats.slate, Math.PI / 2);
        [-0.36, 0.36].forEach((dz) => {
          addBox(g, 0.45, 2.5, 0.45, -5.25, 1.25, 2.6 + dz, stone);
          const sp = new T.Mesh(new T.ConeGeometry(0.28, 0.55, 4), mats.slate);
          sp.rotation.y = Math.PI / 4; sp.position.set(-5.25, 2.75, 2.6 + dz); sp.castShadow = true; g.add(sp);
        });
        g.add(landmarkTag('Hồ Hoàn Kiếm · Tháp Rùa', 2.2, 2.4, 4.2));
        g.add(landmarkTag('Đền Ngọc Sơn', 3.4, 1.7, -0.4));
      }
    },

    gia_lam: {
      seed: 29,
      // Khớp tọa độ thực tế Vinhomes Ocean Park 1 — Đại học VinUni (20.9889, 105.9447) ở trung tâm-Nam
      bounds: [20.9800, 21.0040, 105.9325, 105.9610],
      groundCol: '#C9D8B8',
      roadCol: '#F3EDE0',
      walls: [0xF6F1E6, 0xEAE3D2, 0xDDE6E3, 0xE8DCC7],
      roofs: [0x647786, 0x516473, 0x8F6B56, 0x76887A],
      roadsX: [-9.2, -4.2, 1.2, 7.6],
      roadsZ: [-6.8, -1.8, 1.2, 6.2],
      // Hồ Ngọc Trai (24.5ha) nằm đúng phía Đông-Bắc của VinUni, không đè lên phố San Hô (x≈0, z≈0)
      lake: { x: 4.5, z: -2.9, rx: 2.55, rz: 2.15, color: 0x4EB9CC, beach: true },
      zones: [
        { name: 'Đại học VinUni', sub: 'Khuôn viên Gothic, tháp đồng hồ & quảng trường cỏ', c: [-1.8, 3.6], kind: 'campus' },
        { name: 'Phân khu San Hô · Đại lộ 52m', sub: 'Dãy shophouse & quán ăn ngay trước cổng VinUni', c: [0.2, 0.0], kind: 'mid' },
        { name: 'Hồ Ngọc Trai · Hải Âu', sub: 'Hồ cát trắng 24,5ha & dãy biệt thự ven hồ', c: [4.8, 0.2], kind: 'villa' },
        { name: 'Sapphire S1 · S2 · TechnoPark', sub: 'Cụm tháp chung cư & văn phòng phía Tây VinUni', c: [-7.2, -1.5], kind: 'tower' },
        { name: 'Trâu Quỳ · Hải Đăng · Pavilion', sub: 'Khu quán ăn sinh viên & tháp P3 phía Bắc', c: [-2.2, -6.5], kind: 'old' }
      ],
      isReserved(x, z) {
        // 1. Khuôn viên Đại học VinUni (tọa độ thật: Tây-Nam của San Hô, trung tâm-Nam bản đồ)
        if (x > -4.0 && x < 0.4 && z > 1.7 && z < 5.6) return true;
        // 2. Cụm tháp Sapphire S1/S2 & TechnoPark phía Tây
        if (x > -9.0 && x < -5.0 && z > -4.2 && z < 2.2) return true;
        // 3. Vincom Mega Mall & Biển hồ nước mặn phía Đông
        if (x > 8.2 && x < 12.2 && z > -5.2 && z < 0.5) return true;
        return false;
      },
      paintGround(gg) {
        // Sân cỏ xanh & trục lối đi chữ thập khuôn viên Đại học VinUni (-1.8, 3.6)
        gg.fillStyle = '#B0CB94';
        gg.fillRect(tx2(-3.8), tz2(1.9), 4.0 * S, 3.5 * S);
        gg.fillStyle = '#F2EAD7';
        gg.fillRect(tx2(-2.05), tz2(1.9), 0.5 * S, 3.5 * S);
        gg.fillRect(tx2(-3.8), tz2(3.45), 4.0 * S, 0.42 * S);
        // Vòng xuyến đại lộ 52m trước cổng VinUni
        gg.fillStyle = '#EFE6D2';
        gg.beginPath(); gg.arc(tx2(-1.8), tz2(1.95), 0.55 * S, 0, Math.PI * 2); gg.fill();
        gg.fillStyle = '#8FB472';
        gg.beginPath(); gg.arc(tx2(-1.8), tz2(1.95), 0.24 * S, 0, Math.PI * 2); gg.fill();

        // Biển hồ nước mặn Crystal Lagoon nằm sát cạnh Vincom Mega Mall phía Đông (đúng bản đồ thật)
        gg.fillStyle = '#F3E7C8';
        gg.beginPath(); gg.ellipse(tx2(10.0), tz2(-3.6), 1.55 * S, 1.25 * S, 0, 0, Math.PI * 2); gg.fill();
        gg.fillStyle = '#5CC7D6';
        gg.beginPath(); gg.ellipse(tx2(10.0), tz2(-3.6), 1.15 * S, 0.9 * S, 0, 0, Math.PI * 2); gg.fill();
      },
      landmark(g, mats) {
        // 1. ĐẠI HỌC VINUNI (đúng tọa độ thực tế: x=-1.8, z=3.6, quay mặt hướng Bắc ra San Hô & Hồ Ngọc Trai)
        const vinWall = new T.MeshStandardMaterial({ color: 0xF8F3E8, roughness: 0.78 });
        const vinRoof = new T.MeshStandardMaterial({ color: 0x4A5D6E, roughness: 0.7 });
        const vinGold = new T.MeshStandardMaterial({ color: 0xD4A23E, roughness: 0.45, metalness: 0.25 });
        const vx = -1.8, vz = 3.6;
        // Tòa nhà chính Gothic phía Nam sân cỏ
        addBox(g, 3.4, 1.15, 1.0, vx, 0.58, vz + 0.85, vinWall);
        addGableRoof(g, 1.1, 0.48, 3.5, vx, 1.15, vz + 0.85, vinRoof, Math.PI / 2);
        // Hai cánh chữ U mở về hướng Bắc (phía cổng chính & đại lộ 52m)
        addBox(g, 0.82, 0.92, 1.85, vx - 1.32, 0.46, vz - 0.35, vinWall);
        addGableRoof(g, 0.88, 0.38, 1.9, vx - 1.32, 0.92, vz - 0.35, vinRoof, 0);
        addBox(g, 0.82, 0.92, 1.85, vx + 1.32, 0.46, vz - 0.35, vinWall);
        addGableRoof(g, 0.88, 0.38, 1.9, vx + 1.32, 0.92, vz - 0.35, vinRoof, 0);
        // Tháp chuông Gothic biểu tượng VinUni
        addBox(g, 0.82, 2.85, 0.82, vx, 1.42, vz + 0.72, vinWall);
        const spire = new T.Mesh(new T.ConeGeometry(0.62, 1.22, 4), vinRoof);
        spire.rotation.y = Math.PI / 4; spire.position.set(vx, 3.45, vz + 0.72); spire.castShadow = true; g.add(spire);
        const finial = new T.Mesh(new T.SphereGeometry(0.12, 10, 10), vinGold);
        finial.position.set(vx, 4.1, vz + 0.72); g.add(finial);
        g.add(landmarkTag('🎓 Đại học VinUni', vx, 4.9, vz + 0.72));

        // 2. Tòa tháp văn phòng TechnoPark & cụm chung cư Sapphire S1 · S2 phía Tây VinUni
        const towerWall = new T.MeshStandardMaterial({ color: 0xEFEAE0, roughness: 0.75 });
        const towerBand = new T.MeshStandardMaterial({ color: 0x6F8796, roughness: 0.55 });
        const glassMat = new T.MeshStandardMaterial({ color: 0x7FA3B0, roughness: 0.3, metalness: 0.2 });
        // TechnoPark Tower (cao nhất khu Tây-Nam)
        addBox(g, 1.15, 4.3, 1.15, -7.8, 2.15, 1.2, glassMat);
        addBox(g, 1.2, 0.16, 1.2, -7.8, 4.2, 1.2, towerBand);
        // Cụm tháp Sapphire S1 · S2
        [[-7.8, -2.2, 3.4], [-6.1, -2.6, 3.7], [-6.2, 0.4, 3.2], [-2.0, -7.6, 3.3], [-0.2, -7.4, 3.5]].forEach(([x, z, h]) => {
          addBox(g, 1.0, 0.4, 1.0, x, 0.2, z, mats.cream);
          addBox(g, 0.84, h, 0.84, x, h / 2, z, towerWall);
          addBox(g, 0.88, 0.14, 0.88, x, h - 0.24, z, towerBand);
        });
        g.add(landmarkTag('Sapphire · TechnoPark', -7.0, 4.9, -0.6));

        // 3. Cầu tàu gỗ & bãi cát trắng Hồ Ngọc Trai (24.5ha) phía Đông-Bắc VinUni
        addBox(g, 1.2, 0.12, 0.32, 2.4, 0.1, -2.9, new T.MeshStandardMaterial({ color: 0xB89166, roughness: 0.9 }));
        g.add(landmarkTag('Hồ Ngọc Trai (24,5ha)', 4.5, 2.1, -2.9));

        // 4. Vincom Mega Mall Ocean Park nằm phía Đông (sát Biển hồ nước mặn)
        addBox(g, 2.4, 1.25, 1.9, 10.1, 0.62, -1.2, new T.MeshStandardMaterial({ color: 0xE8D8BC, roughness: 0.65 }));
        addBox(g, 2.5, 0.16, 2.0, 10.1, 1.3, -1.2, mats.red);
        g.add(landmarkTag('Vincom & Biển hồ mặn', 10.0, 2.35, -1.6));
      }
    },

    cau_giay: {
      seed: 47,
      bounds: [21.0285, 21.0470, 105.7805, 105.7985],
      groundCol: '#C5D2BE',
      roadCol: '#ECE7D8',
      walls: [0xD5E0E3, 0xE3E6E2, 0xEAE4D6, 0xC8D5DA],
      roofs: [0x4B5E6D, 0x5E7282, 0x7E7870, 0x8F6D59],
      roadsX: [-9, -1, 6],
      roadsZ: [-7, -0.5, 5.5],
      lake: null, // KHÔNG ép hồ vào giữa Cầu Giấy!
      metro: { z: -0.5, y: 1.55, stationX: 1.6 },
      zones: [
        { name: 'Khu tập thể Nghĩa Tân · Tô Hiệu', sub: 'Quán ăn sinh viên & dãy nhà tập thể', c: [2.0, -6.5], kind: 'old' },
        { name: 'Phố văn phòng Duy Tân', sub: 'Cụm cao ốc kính công nghệ', c: [-6.5, 4.2], kind: 'tower' },
        { name: 'Trần Thái Tông', sub: 'Phố ăn uống & văn phòng', c: [0.2, 3.2], kind: 'mid' },
        { name: 'Trục Xuân Thủy · Metro trên cao', sub: 'Tuyến Nhổn – Ga Hà Nội', c: [-6.5, -2.5], kind: 'big' },
        { name: 'Công viên Cầu Giấy', sub: 'Mảng xanh nhỏ góc Đông Nam', c: [9.0, 4.6], kind: 'park' }
      ],
      isReserved(x, z) {
        // Đường sắt trên cao Xuân Thủy (dải rộng z = -0.5)
        if (Math.abs(z + 0.5) < 1.15) return true;
        // Cụm tháp kính Duy Tân
        if (x > -8.6 && x < -3.8 && z > 2.2 && z < 6.4) return true;
        // Công viên Cầu Giấy nhỏ ở góc Đông Nam
        if (x > 6.8 && x < 12.2 && z > 2.2 && z < 7.4) return true;
        return false;
      },
      paintGround(gg) {
        // Mảng xanh Công viên Cầu Giấy nhỏ ở góc Đông Nam (KHÔNG phải hồ lớn giữa quận)
        gg.fillStyle = '#A4C494';
        gg.beginPath();
        gg.roundRect ? gg.roundRect(tx2(7.0), tz2(2.4), 5.0 * S, 4.8 * S, 28) : gg.rect(tx2(7.0), tz2(2.4), 5.0 * S, 4.8 * S);
        gg.fill();
        // Lối đi dạo công viên
        gg.strokeStyle = '#EFE8D5'; gg.lineWidth = 10;
        gg.beginPath(); gg.ellipse(tx2(9.5), tz2(4.8), 1.6 * S, 1.3 * S, 0, 0, Math.PI * 2); gg.stroke();
        gg.fillStyle = '#E5DCC5';
        gg.beginPath(); gg.arc(tx2(9.5), tz2(4.8), 0.55 * S, 0, Math.PI * 2); gg.fill();
      },
      landmark(g, mats) {
        // 1. Đường sắt trên cao Nhổn – Ga Hà Nội dọc Xuân Thủy – Cầu Giấy (z = -0.5)
        const concrete = new T.MeshStandardMaterial({ color: 0xDDD8CC, roughness: 0.9 });
        const railMat = new T.MeshStandardMaterial({ color: 0x626A70, roughness: 0.65 });
        const canopyMat = new T.MeshStandardMaterial({ color: 0x5C7885, roughness: 0.55 });
        const mz = -0.5, my = 1.55;
        // Dầm cầu cạn chạy suốt trục Đông – Tây
        addBox(g, SX - 1.2, 0.24, 0.92, 0, my, mz, concrete);
        addBox(g, SX - 1.2, 0.18, 0.08, 0, my + 0.18, mz - 0.44, concrete);
        addBox(g, SX - 1.2, 0.18, 0.08, 0, my + 0.18, mz + 0.44, concrete);
        addBox(g, SX - 1.2, 0.04, 0.06, 0, my + 0.13, mz - 0.16, railMat);
        addBox(g, SX - 1.2, 0.04, 0.06, 0, my + 0.13, mz + 0.16, railMat);
        // Trụ chữ T nâng cầu cạn
        for (let px0 = -11.5; px0 <= 11.5; px0 += 2.6) {
          addBox(g, 0.34, my - 0.12, 0.34, px0, (my - 0.12) / 2, mz, concrete);
          addBox(g, 0.42, 0.18, 0.88, px0, my - 0.18, mz, concrete);
        }
        // Nhà ga trên cao (Ga Cầu Giấy / ĐH Quốc Gia)
        const sx = 1.6;
        addBox(g, 3.2, 0.22, 1.48, sx, my + 0.04, mz, concrete);
        addBox(g, 3.3, 0.16, 1.56, sx, my + 0.86, mz, canopyMat);
        [-1.3, 0, 1.3].forEach((ox) => {
          addBox(g, 0.12, 0.72, 0.12, sx + ox, my + 0.48, mz - 0.66, railMat);
          addBox(g, 0.12, 0.72, 0.12, sx + ox, my + 0.48, mz + 0.66, railMat);
        });
        g.add(landmarkTag('Metro Nhổn – Ga HN', sx, my + 2.05, mz));

        // 2. Cụm 5 cao ốc kính phố Duy Tân (cao nổi bật, tông kính xanh-xám giấy ấm)
        const glass1 = new T.MeshStandardMaterial({ color: 0x8BAAB5, roughness: 0.28, metalness: 0.22 });
        const glass2 = new T.MeshStandardMaterial({ color: 0x9EB8C0, roughness: 0.3, metalness: 0.18 });
        const frame = new T.MeshStandardMaterial({ color: 0xE8E2D4, roughness: 0.8 });
        [
          [-7.6, 4.2, 1.25, 4.1, 1.15, glass1],
          [-6.0, 5.1, 1.15, 3.5, 1.15, glass2],
          [-6.2, 3.1, 1.1, 3.2, 1.0, glass1],
          [-4.6, 4.2, 1.0, 2.8, 1.1, glass2],
          [-7.5, 2.7, 0.95, 2.5, 0.95, glass1]
        ].forEach(([x, z, w, h, d, gm]) => {
          addBox(g, w, h, d, x, h / 2, z, gm);
          // Viền sàn ngang + chóp kỹ thuật mái
          for (let fy = 0.8; fy < h - 0.3; fy += 0.75) {
            addBox(g, w + 0.06, 0.09, d + 0.06, x, fy, z, frame);
          }
          addBox(g, w * 0.55, 0.28, d * 0.55, x, h + 0.14, z, frame);
        });
        g.add(landmarkTag('Cao ốc Duy Tân', -6.3, 5.1, 4.2));

        // 3. Chòi nghỉ nhỏ trong Công viên Cầu Giấy góc Đông Nam
        const pav = new T.Mesh(new T.ConeGeometry(0.55, 0.42, 6), mats.darkRoof);
        pav.position.set(9.5, 0.75, 4.8); pav.castShadow = true; g.add(pav);
        addBox(g, 0.16, 0.55, 0.16, 9.5, 0.28, 4.8, mats.cream);
        g.add(landmarkTag('CV Cầu Giấy', 9.5, 2.1, 4.8));
      }
    },

    hai_ba_trung: {
      seed: 73,
      bounds: [21.0010, 21.0210, 105.8415, 105.8605],
      groundCol: '#BCCEB2',
      roadCol: '#EDE5D2',
      walls: [0xF0DFB6, 0xE6CE9A, 0xDCC28A, 0xEAE0C8],
      roofs: [0x9B4F37, 0x844431, 0x705142, 0xA66A48],
      roadsX: [-9, 0, 7],
      roadsZ: [-7, 0, 6],
      lake: null, // KHÔNG ép hồ vào giữa Hai Bà Trưng!
      avenueTrees: true, // Hàng cây xanh dọc đại lộ Trần Đại Nghĩa / Phố Huế
      zones: [
        { name: 'Lê Văn Hưu · Phố Huế', sub: 'Đại lộ cây xanh & quán gia đình lâu năm', c: [2.5, -5.5], kind: 'old' },
        { name: 'Lò Đúc · Phạm Đình Hổ', sub: 'Phố cũ phía Đông Bắc', c: [8.5, -4.5], kind: 'old' },
        { name: 'Đại học Bách Khoa', sub: 'Cổng Parabol · Nhà C1 · Sân vận động', c: [-5.2, 4.2], kind: 'campus' },
        { name: 'Khu tập thể Bách Khoa · Tạ Quang Bửu', sub: 'Nhà tập thể 4–5 tầng & quán ăn vỉa hè', c: [-5.5, -3.5], kind: 'ktt' },
        { name: 'Trần Đại Nghĩa · Tô Hiến Thành', sub: 'Khu tập thể cũ & phố ăn uống sinh viên', c: [5.5, 3.8], kind: 'ktt' }
      ],
      isReserved(x, z) {
        // Khuôn viên Đại học Bách Khoa (Cổng Parabol + Nhà C1 + Sân vận động)
        return x > -8.3 && x < -1.8 && z > 1.0 && z < 7.8;
      },
      paintGround(gg) {
        // Nền khuôn viên Đại học Bách Khoa
        gg.fillStyle = '#B8CCA9';
        gg.fillRect(tx2(-8.2), tz2(1.2), 6.2 * S, 6.4 * S);
        // Sân quảng trường trước nhà C1
        gg.fillStyle = '#E8DFCA';
        gg.fillRect(tx2(-7.4), tz2(1.4), 4.6 * S, 1.4 * S);
        // Sân vận động Bách Khoa (cỏ xanh + đường chạy bầu dục trắng)
        const fx = tx2(-5.1), fz = tz2(5.9);
        gg.fillStyle = '#B9785C'; // đường chạy đất nện / tartans trầm ấm
        gg.beginPath(); gg.roundRect ? gg.roundRect(fx - 2.3 * S, fz - 1.15 * S, 4.6 * S, 2.3 * S, 1.1 * S) : gg.rect(fx - 2.3 * S, fz - 1.15 * S, 4.6 * S, 2.3 * S); gg.fill();
        gg.fillStyle = '#7AA66C'; // mặt cỏ sân bóng
        gg.beginPath(); gg.roundRect ? gg.roundRect(fx - 1.85 * S, fz - 0.8 * S, 3.7 * S, 1.6 * S, 0.7 * S) : gg.rect(fx - 1.85 * S, fz - 0.8 * S, 3.7 * S, 1.6 * S); gg.fill();
        gg.strokeStyle = 'rgba(255,250,240,0.85)'; gg.lineWidth = 4;
        gg.strokeRect(fx - 1.5 * S, fz - 0.62 * S, 3.0 * S, 1.24 * S);
        gg.beginPath(); gg.moveTo(fx, fz - 0.62 * S); gg.lineTo(fx, fz + 0.62 * S); gg.stroke();
        gg.beginPath(); gg.arc(fx, fz, 0.32 * S, 0, Math.PI * 2); gg.stroke();
      },
      landmark(g, mats) {
        // 1. Cổng Parabol biểu tượng Đại học Bách Khoa
        const parabolMat = new T.MeshStandardMaterial({ color: 0xF2E8D2, roughness: 0.78 });
        const archCurve = new T.QuadraticBezierCurve3(
          new T.Vector3(-6.2, 0.05, 1.4),
          new T.Vector3(-5.1, 2.35, 1.4),
          new T.Vector3(-4.0, 0.05, 1.4)
        );
        const arch = new T.Mesh(new T.TubeGeometry(archCurve, 28, 0.14, 10), parabolMat);
        arch.castShadow = true; g.add(arch);
        // Thanh ngang tên cổng + 2 trụ chân
        addBox(g, 1.4, 0.16, 0.16, -5.1, 0.95, 1.4, mats.red);
        addBox(g, 0.36, 0.35, 0.36, -6.2, 0.18, 1.4, parabolMat);
        addBox(g, 0.36, 0.35, 0.36, -4.0, 0.18, 1.4, parabolMat);

        // 2. Tòa nhà C1 Bách Khoa (kiến trúc hiện đại 1960s dài, cột trắng, mái hiên rộng)
        const c1Wall = new T.MeshStandardMaterial({ color: 0xF3E6C4, roughness: 0.85 });
        const c1Trim = new T.MeshStandardMaterial({ color: 0x9C4E35, roughness: 0.78 });
        const winMat = new T.MeshStandardMaterial({ color: 0x5B6E78, roughness: 0.5 });
        addBox(g, 4.6, 1.35, 1.25, -5.1, 0.68, 3.35, c1Wall);
        addBox(g, 1.5, 1.65, 1.45, -5.1, 0.82, 3.35, c1Wall); // khối sảnh trung tâm
        addBox(g, 4.85, 0.16, 1.45, -5.1, 1.42, 3.35, c1Trim);
        addBox(g, 1.65, 0.16, 1.62, -5.1, 1.72, 3.35, c1Trim);
        // Dải cửa sổ ngang đặc trưng nhà C1
        addBox(g, 4.3, 0.18, 1.3, -5.1, 0.55, 3.35, winMat);
        addBox(g, 4.3, 0.18, 1.3, -5.1, 1.0, 3.35, winMat);

        // 3. Khán đài nhỏ bên Sân vận động Bách Khoa
        addBox(g, 2.8, 0.38, 0.45, -5.1, 0.19, 4.55, parabolMat);
        addBox(g, 2.9, 0.08, 0.55, -5.1, 0.58, 4.55, mats.slate);

        g.add(landmarkTag('ĐH Bách Khoa · Cổng Parabol', -5.1, 2.95, 2.2));
        g.add(landmarkTag('Phố Huế · Lê Văn Hưu', 3.5, 2.5, -5.2));
      }
    },

    hoang_mai: {
      seed: 91,
      bounds: [20.9600, 20.9740, 105.8205, 105.8380],
      groundCol: '#C4D3B8',
      roadCol: '#EAE3D1',
      walls: [0xF0E8D8, 0xE6D8C0, 0xDCD7CA, 0xE5CEB8, 0xD6DFD8],
      roofs: [0x8F533E, 0x5D7180, 0x7A6D60, 0x6A7D70],
      roadsX: [-10, -2, 9],
      roadsZ: [-7, 1, 6.5],
      lake: null, // KHÔNG ép hồ lớn giữa Hoàng Mai!
      canal: { x: 4.6, w: 1.15, color: 0x5E9AA8 }, // Kênh Sông Sét hẹp chạy Bắc–Nam
      junction: { x: -2, z: 1 }, // Nút giao Tân Mai – Giải Phóng – Vành đai 2.5
      zones: [
        { name: 'Chợ dân sinh Tân Mai · Trương Định', sub: 'Khu chợ mái tôn & nhà ống dày đặc', c: [-7.2, -4.5], kind: 'old' },
        { name: 'Bắc Linh Đàm · Ngõ ăn uống', sub: 'Khu dân cư & quán bình dân', c: [0.5, -5.5], kind: 'mid' },
        { name: 'Nút giao Tân Mai – Giải Phóng', sub: 'Trục đại lộ & vành đai 2.5 sầm uất', c: [-2.0, 1.5], kind: 'old' },
        { name: 'Cụm chung cư phía Nam', sub: 'Khu đô thị & kiot ăn uống', c: [-6.0, 4.8], kind: 'tower' },
        { name: 'Ven kênh Sông Sét', sub: 'Cầu dân sinh & dãy phố đông đúc', c: [6.8, 0.5], kind: 'old' }
      ],
      isReserved(x, z) {
        // Kênh Sông Sét + bờ kè
        if (Math.abs(x - 4.6) < 1.15) return true;
        // Chợ dân sinh Tân Mai
        if (x > -9.2 && x < -4.8 && z > -6.0 && z < -2.6) return true;
        // Nút giao vòng xuyến Tân Mai – Giải Phóng
        if ((x + 2) * (x + 2) + (z - 1) * (z - 1) < 2.2 * 2.2) return true;
        return false;
      },
      paintGround(gg) {
        // Bờ kè bê tông dọc kênh Sông Sét
        gg.fillStyle = '#D5CFC0';
        gg.fillRect(tx2(4.6 - 0.82), 0, 1.64 * S, SZ * S);
        // Sân chợ dân sinh Tân Mai
        gg.fillStyle = '#E5DEC9';
        gg.fillRect(tx2(-9.0), tz2(-5.8), 4.0 * S, 3.0 * S);
        // Vòng xuyến & vạch qua đường nút giao Tân Mai – Giải Phóng
        const jx = tx2(-2), jz = tz2(1);
        gg.fillStyle = '#EAE3D1';
        gg.beginPath(); gg.arc(jx, jz, 1.65 * S, 0, Math.PI * 2); gg.fill();
        gg.fillStyle = '#9BB88A';
        gg.beginPath(); gg.arc(jx, jz, 0.72 * S, 0, Math.PI * 2); gg.fill();
        gg.strokeStyle = '#FFF9EC'; gg.lineWidth = 4;
        gg.beginPath(); gg.arc(jx, jz, 0.82 * S, 0, Math.PI * 2); gg.stroke();
      },
      landmark(g, mats) {
        // 1. Kênh Sông Sét hẹp có bờ kè và 3 cây cầu dân sinh bắc ngang trục đường
        const curbMat = new T.MeshStandardMaterial({ color: 0xCFC8B8, roughness: 0.92 });
        const railMat = new T.MeshStandardMaterial({ color: 0x6D7880, roughness: 0.7 });
        addBox(g, 0.16, 0.16, SZ - 0.6, 4.6 - 0.62, 0.08, OZ, curbMat);
        addBox(g, 0.16, 0.16, SZ - 0.6, 4.6 + 0.62, 0.08, OZ, curbMat);
        [-7, 1, 6.5].forEach((bz) => {
          addBox(g, 1.65, 0.14, 1.15, 4.6, 0.12, bz, curbMat);
          addBox(g, 1.65, 0.16, 0.07, 4.6, 0.25, bz - 0.54, railMat);
          addBox(g, 1.65, 0.16, 0.07, 4.6, 0.25, bz + 0.54, railMat);
        });
        g.add(landmarkTag('Kênh Sông Sét', 4.6, 1.75, -2.6));

        // 2. Chợ dân sinh mái tôn 3 nhịp đặc trưng (Chợ Tân Mai / Trương Định)
        const mktRoof1 = new T.MeshStandardMaterial({ color: 0x5F7888, roughness: 0.72 });
        const mktRoof2 = new T.MeshStandardMaterial({ color: 0xA85840, roughness: 0.75 });
        const mktWall = new T.MeshStandardMaterial({ color: 0xF2E9D6, roughness: 0.88 });
        [[-7.0, -5.0, mktRoof1], [-7.0, -4.05, mktRoof2], [-7.0, -3.1, mktRoof1]].forEach(([x, z, rm]) => {
          addBox(g, 3.2, 0.68, 0.78, x, 0.34, z, mktWall);
          addGableRoof(g, 0.92, 0.36, 3.35, x, 0.68, z, rm, Math.PI / 2);
        });
        g.add(landmarkTag('Chợ dân sinh Tân Mai', -7.0, 2.05, -4.1));

        // 3. Điểm nhấn nút giao Tân Mai – Giải Phóng
        const post = new T.Mesh(new T.CylinderGeometry(0.12, 0.18, 0.45, 12), curbMat);
        post.position.set(-2, 0.22, 1); g.add(post);
        g.add(landmarkTag('Tân Mai · Giải Phóng', -2.0, 1.85, 1.0));
      }
    }
  };

  /* Nền đế cố định */
  const plate = new T.Mesh(new T.BoxGeometry(SX + 0.6, 0.9, SZ + 0.6), new T.MeshStandardMaterial({ color: 0xA9BA9E, roughness: 1 }));
  plate.position.set(0, -0.47, OZ); scene.add(plate);
  (function () {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    r.addColorStop(0, 'rgba(42,38,34,.42)'); r.addColorStop(1, 'rgba(42,38,34,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    const m = new T.Mesh(new T.PlaneGeometry(44, 38), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, -0.95, OZ); scene.add(m);
  })();

  const sharedMats = {
    cream: new T.MeshStandardMaterial({ color: 0xF5EFE0, roughness: 0.85 }),
    red: new T.MeshStandardMaterial({ color: 0xB2302A, roughness: 0.6 }),
    darkRoof: new T.MeshStandardMaterial({ color: 0x8E6A58, roughness: 0.8 }),
    slate: new T.MeshStandardMaterial({ color: 0x3b4c63, roughness: 0.7 }),
    bank: new T.MeshStandardMaterial({ color: 0xB9CFA9, roughness: 1 })
  };

  let districtGroup = null, builtDistrict = null;
  let ZONES = [], lots = [], zoneLots = [], walls = null, roofs = null, waterTex = null;
  let bikes = [], bikeMesh = null, pins = [];
  let metroTrain = null, metroDir = 1, metroX = -10;
  let gArr = [], gt = [], dim = [], dimT = [];
  let introT = reduce ? 3 : 0;

  const HL = new T.Color(0xFFF3D6), SAGE = new T.Color(0xD2DDCA), col = new T.Color();
  const m4 = new T.Matrix4(), q0 = new T.Quaternion(), pos = new T.Vector3(), scl = new T.Vector3();
  const qy = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 2);
  const hitG = new T.SphereGeometry(0.75, 8, 6);
  const hitM = new T.MeshBasicMaterial({ visible: false });

  function headGeo(v) {
    if (v === 'local') return new T.SphereGeometry(0.35, 22, 16);
    if (v === 'chain') return new T.BoxGeometry(0.52, 0.52, 0.52);
    if (v === 'tourist') return new T.OctahedronGeometry(0.46);
    return new T.TorusGeometry(0.28, 0.1, 12, 28);
  }

  function labelSprite(p) {
    const c = document.createElement('canvas'); c.width = 640; c.height = 160;
    const x = c.getContext('2d');
    x.shadowColor = 'rgba(42,38,34,.30)'; x.shadowBlur = 12; x.shadowOffsetY = 4;
    x.fillStyle = 'rgba(255,250,240,.98)';
    x.beginPath(); x.roundRect ? x.roundRect(14, 10, 612, 114, 22) : x.rect(14, 10, 612, 114); x.fill();
    x.shadowColor = 'transparent';
    x.strokeStyle = '#2a2622'; x.lineWidth = 4; x.stroke();
    x.fillStyle = '#' + (VCOL[p.v] || VCOL.unsure).toString(16).padStart(6, '0');
    x.beginPath(); x.arc(52, 67, 15, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2a2622'; x.textBaseline = 'middle';
    let fs = 38; const f = () => { x.font = '700 ' + fs + 'px "Lora","Be Vietnam Pro",serif'; }; f();
    while (x.measureText(p.name).width > 500 && fs > 24) { fs -= 2; f(); }
    x.fillText(p.name, 84, 48);
    x.fillStyle = '#6b6258'; x.font = '600 26px "Be Vietnam Pro",sans-serif';
    x.fillText((p.dish || 'Quán ăn') + ' · ' + (p.price_text || (p.price + 'k')), 84, 92);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthTest: false, opacity: 0.94 }));
    s.scale.set(4.3, 1.07, 1); s.renderOrder = 20; return s;
  }

  function makeWaterTexture(rnd) {
    const wc = document.createElement('canvas'); wc.width = wc.height = 256;
    const wg = wc.getContext('2d'); wg.fillStyle = '#fff'; wg.fillRect(0, 0, 256, 256);
    wg.strokeStyle = 'rgba(215,242,248,.62)'; wg.lineWidth = 3; wg.lineCap = 'round';
    for (let i = 0; i < 42; i++) {
      const x = rnd() * 256, y = rnd() * 256, l = 14 + rnd() * 28;
      wg.beginPath(); wg.moveTo(x, y); wg.lineTo(x + l, y + (rnd() - 0.5) * 4); wg.stroke();
    }
    const wt = new T.CanvasTexture(wc);
    wt.wrapS = wt.wrapT = T.RepeatWrapping; wt.repeat.set(2.4, 4); wt.encoding = T.sRGBEncoding;
    return wt;
  }

  function projectLatLng(lat, lng, bounds) {
    const [minLat, maxLat, minLng, maxLng] = bounds;
    const nx = clamp((lng - minLng) / (maxLng - minLng), 0.08, 0.92);
    const nz = clamp(1 - (lat - minLat) / (maxLat - minLat), 0.08, 0.92);
    return [(nx - 0.5) * 21, (nz - 0.5) * 16 - 0.5];
  }

  function disposeGroup(grp) {
    if (!grp) return;
    const sharedSet = new Set(Object.values(sharedMats));
    grp.traverse((obj) => {
      if (obj.geometry && obj.geometry !== hitG) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m !== hitM && !sharedSet.has(m)) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        });
      }
    });
  }

  function buildDistrict(districtKey) {
    const cfg = DISTRICT_3D[districtKey] || DISTRICT_3D.gia_lam;
    builtDistrict = districtKey;
    if (districtGroup) {
      scene.remove(districtGroup);
      disposeGroup(districtGroup);
    }
    districtGroup = new T.Group();
    scene.add(districtGroup);
    waterTex = null;
    metroTrain = null;

    let seed = cfg.seed;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const pick = (a) => a[Math.floor(rnd() * a.length)];

    ZONES = cfg.zones;
    const zoneAt = (x, z) => {
      let b = 0, bd = 1e9;
      ZONES.forEach((Z, i) => { const d = (x - Z.c[0]) ** 2 + (z - Z.c[1]) ** 2; if (d < bd) { bd = d; b = i; } });
      return b;
    };

    const L = cfg.lake;
    const ws = (t) => 0.78 + 0.22 * (t + 1) / 2;
    const inLake = (x, z, m) => {
      if (!L) return false;
      const dx = x - L.x, dz = z - L.z, t = clamp(dz / L.rz, -1, 1);
      const nx = dx / (L.rx * ws(t) + m), nz = dz / (L.rz + m);
      return (nx * nx + nz * nz) < 1;
    };
    const inCanal = (x, m) => cfg.canal ? Math.abs(x - cfg.canal.x) < (cfg.canal.w / 2 + m) : false;

    const isRoadX = (x) => cfg.roadsX.some((r) => Math.abs(x - r) < 0.62);
    const isRoadZ = (z) => cfg.roadsZ.some((r) => Math.abs(z - r) < 0.62);

    /* Chiếu các quán thật theo tọa độ lat/lng thực tế */
    const districtPlaces = (window.PLACES || []).filter((p) => p.district === districtKey && typeof p.lat === 'number' && typeof p.lng === 'number');
    const used = [];
    const pushClear = (x, z) => {
      for (let tries = 0; tries < 6; tries++) {
        let moved = false;
        // 1. Không để ghim rơi xuống mặt hồ
        if (inLake(x, z, 0.55)) {
          const ang = Math.atan2(z - L.z, x - L.x);
          x = L.x + Math.cos(ang) * (L.rx + 0.95);
          z = L.z + Math.sin(ang) * (L.rz + 0.95);
          moved = true;
        }
        // 2. Không để ghim rơi vào kênh hẹp
        if (inCanal(x, 0.5)) {
          x = cfg.canal.x + (x >= cfg.canal.x ? 1.25 : -1.25);
          moved = true;
        }
        // 3. Không để ghim bị chìm vào bên trong công trình biểu tượng (VinUni, Vincom, Bách Khoa...)
        if (cfg.isReserved && cfg.isReserved(x, z)) {
          const dirs = [[1, 0], [0, -1], [-1, 0], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];
          let best = null;
          for (let dist = 0.8; dist <= 4.5 && !best; dist += 0.55) {
            for (const [dx, dz] of dirs) {
              const cx = clamp(x + dx * dist, -11.2, 11.2);
              const cz = clamp(z + dz * dist, -9.0, 7.6);
              if (!cfg.isReserved(cx, cz) && !inLake(cx, cz, 0.55) && !inCanal(cx, 0.5)) {
                best = [cx, cz];
                break;
              }
            }
          }
          if (best) { x = best[0]; z = best[1]; moved = true; }
        }
        if (!moved) break;
      }
      return [clamp(x, -11.2, 11.2), clamp(z, -9.0, 7.6)];
    };

    pins = districtPlaces.map((p) => {
      let [x, z] = (typeof p.lat === 'number' && typeof p.lng === 'number')
        ? projectLatLng(p.lat, p.lng, cfg.bounds)
        : px(p.x || 320, p.y || 320);
      [x, z] = pushClear(x, z);
      // Tránh chồng nhãn giữa 2 quán quá sát nhau nhưng vẫn giữ vị trí tương đối thật & không đẩy ngược vào hồ/nhà
      for (const u of used) {
        const dx = x - u[0], dz = z - u[1];
        if (dx * dx + dz * dz < 2.2) {
          [x, z] = pushClear(x + (dx >= 0 ? 1.25 : -1.25), z + (dz >= 0 ? 1.05 : -1.05));
        }
      }
      used.push([x, z]);
      return { p, x, z, zone: zoneAt(x, z), v: 0, hover: 0 };
    });

    /* Texture mặt đất riêng theo hệ trục đường & địa hình từng quận */
    const gc = document.createElement('canvas'); gc.width = SX * S; gc.height = SZ * S;
    const gg = gc.getContext('2d');
    gg.fillStyle = cfg.groundCol; gg.fillRect(0, 0, gc.width, gc.height);
    const cell = (x, z, c) => { gg.fillStyle = c; gg.fillRect(tx2(x - 0.5), tz2(z - 0.5), S, S); };
    for (let k = 0; k < 27; k++) for (let j = 0; j < 21; j++) {
      const x = -13 + k, z = -11 + j;
      if (isRoadX(x) || isRoadZ(z)) cell(x, z, cfg.roadCol);
      else if (L && inLake(x, z, 1.35)) cell(x, z, L.beach ? '#F3E7C8' : '#B7CFA9');
    }
    gg.strokeStyle = '#D5CBB1'; gg.lineWidth = 3; gg.setLineDash([14, 16]);
    cfg.roadsX.forEach((rx) => { const v = tx2(rx); gg.beginPath(); gg.moveTo(v, 0); gg.lineTo(v, gc.height); gg.stroke(); });
    cfg.roadsZ.forEach((rz) => { const v = tz2(rz); gg.beginPath(); gg.moveTo(0, v); gg.lineTo(gc.width, v); gg.stroke(); });
    gg.setLineDash([]);

    if (cfg.paintGround) cfg.paintGround(gg);

    pins.forEach((P) => {
      const cx = tx2(P.x), cy = tz2(P.z);
      const r = gg.createRadialGradient(cx, cy, 0, cx, cy, 1.15 * S);
      r.addColorStop(0, '#FFF8E6'); r.addColorStop(0.78, cfg.roadCol); r.addColorStop(1, 'rgba(239,232,213,0)');
      gg.fillStyle = r; gg.beginPath(); gg.arc(cx, cy, 1.15 * S, 0, Math.PI * 2); gg.fill();
    });
    const gTex = new T.CanvasTexture(gc); gTex.encoding = T.sRGBEncoding; gTex.anisotropy = 8;
    const ground = new T.Mesh(new T.PlaneGeometry(SX, SZ), new T.MeshStandardMaterial({ map: gTex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = OZ; ground.receiveShadow = true; districtGroup.add(ground);

    /* Mặt hồ CHỈ dựng cho quận thực sự có hồ (Hoàn Kiếm & Gia Lâm OCP 1) */
    if (L) {
      const lakeShape = new T.Shape();
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2, t = Math.sin(a);
        const x = L.x + Math.cos(a) * L.rx * ws(t), z = L.z + Math.sin(a) * L.rz;
        i ? lakeShape.lineTo(x, -z) : lakeShape.moveTo(x, -z);
      }
      waterTex = makeWaterTexture(rnd);
      const lake = new T.Mesh(
        new T.ShapeGeometry(lakeShape, 48),
        new T.MeshStandardMaterial({ color: L.color, map: waterTex, roughness: 0.22, metalness: 0.05 })
      );
      lake.rotation.x = -Math.PI / 2; lake.position.y = 0.04; lake.receiveShadow = true; districtGroup.add(lake);

      const bankMat = L.beach ? new T.MeshStandardMaterial({ color: 0xF4E6C4, roughness: 1 }) : sharedMats.bank;
      const bank = new T.Mesh(new T.ShapeGeometry(lakeShape, 48), bankMat);
      bank.rotation.x = -Math.PI / 2; bank.scale.set(1.11, 1.11, 1);
      bank.position.set(-L.x * 0.11, 0.02, -L.z * 0.11); districtGroup.add(bank);
    }

    /* Kênh thoát nước hẹp Sông Sét cho Hoàng Mai */
    if (cfg.canal) {
      waterTex = makeWaterTexture(rnd);
      waterTex.repeat.set(0.6, 8);
      const canalMesh = new T.Mesh(
        new T.PlaneGeometry(cfg.canal.w, SZ - 0.5),
        new T.MeshStandardMaterial({ color: cfg.canal.color, map: waterTex, roughness: 0.25, metalness: 0.05 })
      );
      canalMesh.rotation.x = -Math.PI / 2;
      canalMesh.position.set(cfg.canal.x, 0.04, OZ);
      canalMesh.receiveShadow = true;
      districtGroup.add(canalMesh);
    }

    /* Địa danh đặc trưng của từng quận */
    if (cfg.landmark) cfg.landmark(districtGroup, sharedMats);

    /* Đoàn tàu Metro chạy trên cầu cạn Cầu Giấy */
    if (cfg.metro) {
      metroTrain = new T.Group();
      const bodyMat = new T.MeshStandardMaterial({ color: 0xF5F0E4, roughness: 0.55 });
      const stripeMat = new T.MeshStandardMaterial({ color: 0x4D6B1F, roughness: 0.5 });
      const winMat = new T.MeshStandardMaterial({ color: 0x3B4C63, roughness: 0.3 });
      [-1.05, 0, 1.05].forEach((ox) => {
        addBox(metroTrain, 0.94, 0.34, 0.34, ox, 0.22, 0, bodyMat);
        addBox(metroTrain, 0.95, 0.08, 0.35, ox, 0.11, 0, stripeMat);
        addBox(metroTrain, 0.78, 0.12, 0.355, ox, 0.26, 0, winMat);
      });
      metroX = -9; metroDir = 1;
      metroTrain.position.set(metroX, cfg.metro.y + 0.13, cfg.metro.z);
      districtGroup.add(metroTrain);
    }

    /* Dãy nhà theo từng loại hình kiến trúc quận (old / mid / big / tower / villa / ktt / park / campus) */
    lots = [];
    const treeSpots = [];
    const pinNear = (x, z) => pins.some((P) => (P.x - x) ** 2 + (P.z - z) ** 2 < 1.3 * 1.3);

    for (let k = 0; k < 27; k++) for (let j = 0; j < 21; j++) {
      const x = -13 + k, z = -11 + j;
      if (isRoadX(x) || isRoadZ(z)) continue;
      if (L && inLake(x, z, 1.1)) {
        if (rnd() < 0.55) treeSpots.push([x + (rnd() - 0.5) * 0.45, z + (rnd() - 0.5) * 0.45, 0.75 + rnd() * 0.5]);
        continue;
      }
      if (inCanal(x, 0.75)) {
        if (rnd() < 0.35) treeSpots.push([x + (x >= cfg.canal.x ? 0.25 : -0.25), z, 0.65 + rnd() * 0.35]);
        continue;
      }
      if (cfg.isReserved && cfg.isReserved(x, z)) {
        // Trồng cây trong Công viên Cầu Giấy hoặc khuôn viên trường
        const zone0 = zoneAt(x, z);
        if (ZONES[zone0].kind === 'park' && rnd() < 0.48 && Math.hypot(x - 9.5, z - 4.8) > 1.0) {
          treeSpots.push([x + (rnd() - 0.5) * 0.4, z + (rnd() - 0.5) * 0.4, 0.85 + rnd() * 0.55]);
        }
        continue;
      }
      if (pinNear(x, z)) continue;

      const zone = zoneAt(x, z), kind = ZONES[zone].kind;
      if (kind === 'park' || kind === 'campus') {
        if (rnd() < 0.45) treeSpots.push([x, z, 0.8 + rnd() * 0.5]);
        continue;
      }
      if ((kind === 'villa' && rnd() < 0.42) || rnd() < 0.08) {
        treeSpots.push([x, z, 0.8 + rnd() * 0.55]);
        continue;
      }

      const mk = (ox, oz, sx, sz, h, flat) => lots.push({
        x: x + ox, z: z + oz, sx, sz, h, rh: flat ? 0.08 : (0.28 + rnd() * 0.22), zone,
        wall: new T.Color(pick(cfg.walls)), roof: new T.Color(pick(cfg.roofs)), d: Math.hypot(x, z)
      });

      if (kind === 'old') {
        // Nhà ống Phố Cổ / khu dân cư mái ngói hẹp dày
        const h = 0.65 + rnd() * 0.85;
        mk(-0.23, 0, 0.42, 0.86, h * (0.85 + rnd() * 0.3), false);
        mk(0.23, 0, 0.42, 0.86, 0.65 + rnd() * 0.85, false);
      } else if (kind === 'ktt') {
        // Khu tập thể cũ Hà Nội 4–5 tầng hình chữ nhật dài, mái bằng/hiên trầm
        if ((k + j) % 2 === 0) {
          mk(0, 0, 0.92, 0.62, 1.35 + rnd() * 0.45, true);
        } else if (rnd() < 0.45) {
          treeSpots.push([x, z, 0.82 + rnd() * 0.4]);
        } else {
          mk(0, 0, 0.62, 0.88, 1.25 + rnd() * 0.4, true);
        }
      } else if (kind === 'tower') {
        if (rnd() < 0.48) mk(0, 0, 0.82, 0.82, 2.0 + rnd() * 1.65, true);
        else treeSpots.push([x, z, 0.75 + rnd() * 0.4]);
      } else if (kind === 'big') {
        mk(0, 0, 0.84, 0.84, 1.25 + rnd() * 1.05, true);
      } else if (kind === 'villa') {
        mk(0, 0, 0.68, 0.68, 0.72 + rnd() * 0.45, false);
      } else {
        mk(-0.2, 0, 0.5, 0.84, 0.8 + rnd() * 0.85, false);
        mk(0.28, 0, 0.36, 0.84, 0.8 + rnd() * 0.85, false);
      }
    }

    // Hàng cây xanh đặc trưng dọc đại lộ Hai Bà Trưng (Trần Đại Nghĩa / Phố Huế / Lê Văn Hưu)
    if (cfg.avenueTrees) {
      cfg.roadsX.forEach((rx) => {
        for (let z = -9.5; z <= 7.5; z += 1.7) {
          if (!isRoadZ(z) && !(cfg.isReserved && cfg.isReserved(rx + 0.75, z))) {
            treeSpots.push([rx + 0.72, z, 0.72 + rnd() * 0.25]);
          }
        }
      });
      cfg.roadsZ.forEach((rz) => {
        for (let x = -11.5; x <= 11.5; x += 1.8) {
          if (!isRoadX(x) && !(cfg.isReserved && cfg.isReserved(x, rz + 0.75))) {
            treeSpots.push([x, rz + 0.72, 0.72 + rnd() * 0.25]);
          }
        }
      });
    }

    if (lots.length) {
      walls = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ roughness: 0.88 }), lots.length);
      const coneG = new T.ConeGeometry(0.7071, 1, 4, 1); coneG.rotateY(Math.PI / 4);
      roofs = new T.InstancedMesh(coneG, new T.MeshStandardMaterial({ roughness: 0.85 }), lots.length);
      [walls, roofs].forEach((m) => { m.castShadow = true; m.receiveShadow = true; districtGroup.add(m); });
    } else {
      walls = roofs = null;
    }
    zoneLots = ZONES.map(() => []);
    lots.forEach((lot, i) => zoneLots[lot.zone].push(i));

    if (treeSpots.length) {
      const trees = new T.InstancedMesh(new T.IcosahedronGeometry(0.35, 0), new T.MeshStandardMaterial({ roughness: 1, flatShading: true }), treeSpots.length);
      trees.castShadow = true; trees.receiveShadow = true;
      const greens = [0x7FA878, 0x6E9B6B, 0x93B57F, 0x5F8F62];
      treeSpots.forEach(([x, z, s], i) => {
        pos.set(x, 0.3 * s + 0.15, z); scl.set(s, s * 1.1, s); m4.compose(pos, q0, scl); trees.setMatrixAt(i, m4);
        trees.setColorAt(i, col.set(pick(greens)));
      });
      districtGroup.add(trees);
    }

    /* Xe chạy trên chính các trục đường riêng của quận đó */
    const bikeLines = [...cfg.roadsX.map((x) => [x, 'x']), ...cfg.roadsZ.map((z) => [z, 'z'])];
    const LIM = { x: [-12.5, 12.5], z: [-10.5, 8.5] };
    bikes = [];
    bikeLines.forEach(([line, axis]) => {
      for (let n = 0; n < 3; n++) {
        const lim = axis === 'x' ? LIM.z : LIM.x;
        bikes.push({
          line: line + (rnd() > 0.5 ? 0.18 : -0.18),
          axis,
          lim,
          p: lim[0] + rnd() * (lim[1] - lim[0]),
          v: (0.85 + rnd() * 1.1) * (rnd() > 0.5 ? 1 : -1)
        });
      }
    });
    bikeMesh = new T.InstancedMesh(new T.BoxGeometry(0.15, 0.13, 0.34), new T.MeshStandardMaterial({ roughness: 0.7 }), bikes.length);
    const bcols = [0x2a2622, 0xc2410c, 0x3b4c63, 0xe0a526, 0x4d6b1f];
    bikes.forEach((b, i) => bikeMesh.setColorAt(i, col.set(pick(bcols))));
    bikeMesh.castShadow = true; districtGroup.add(bikeMesh);

    /* Ghim quán thật */
    pins.forEach((P) => {
      const c = VCOL[P.p.v] || VCOL.unsure;
      P.stem = new T.Mesh(new T.CylinderGeometry(0.038, 0.038, 1, 8), new T.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.6 }));
      P.head = new T.Mesh(headGeo(P.p.v), new T.MeshStandardMaterial({ color: c, roughness: 0.35, emissive: c, emissiveIntensity: 0.18 }));
      P.head.castShadow = true;
      P.dot = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 0.06, 24), new T.MeshStandardMaterial({ color: c, roughness: 0.5, transparent: true }));
      P.dot.position.set(P.x, 0.05, P.z);
      P.label = labelSprite(P.p);
      P.hit = new T.Mesh(hitG, hitM); P.hit.userData.pin = P;
      P.stem.position.set(P.x, 0, P.z); P.head.position.set(P.x, 0, P.z); P.label.position.set(P.x, 0, P.z); P.hit.position.set(P.x, 0.3, P.z);
      [P.stem, P.head, P.dot, P.label, P.hit].forEach((o) => districtGroup.add(o));
    });

    const NZ = ZONES.length;
    gArr = new Array(NZ).fill(0); gt = new Array(NZ).fill(0);
    dim = new Array(NZ).fill(0); dimT = new Array(NZ).fill(0);
    introT = reduce ? 3 : 0;
    for (let i = 0; i < lots.length; i++) setLot(i);
    flush();
    moveBikes(0);
    goal.tx = 0; goal.tz = OZ; goal.zoom = 1;
    shownZone = -1; sticky = null; hoverZone = null; hoverPin = null; lastSel = undefined;
    dirty = true;
  }

  function setLot(i) {
    if (!walls || !roofs) return;
    const lot = lots[i], gz = gArr[lot.zone];
    const k = ease(clamp((introT - lot.d * 0.04) / 0.6, 0, 1));
    // Giữ tỷ lệ kiến trúc sát thực tế (nâng nhẹ 10% khi rê chuột, không bóp méo cụm nhà)
    const h = (lot.h * (1 + 0.1 * gz) + 0.06 * gz) * k;
    pos.set(lot.x, h / 2, lot.z); scl.set(lot.sx, Math.max(h, 0.001), lot.sz);
    m4.compose(pos, q0, scl); walls.setMatrixAt(i, m4);
    const rh = lot.rh * k;
    pos.set(lot.x, h + rh / 2, lot.z); scl.set(lot.sx * 1.12, Math.max(rh, 0.001), lot.sz * 1.12);
    m4.compose(pos, q0, scl); roofs.setMatrixAt(i, m4);
    col.copy(lot.wall).lerp(HL, 0.28 * gz).lerp(SAGE, 0.35 * dim[lot.zone]); walls.setColorAt(i, col);
    col.copy(lot.roof).lerp(SAGE, 0.32 * dim[lot.zone]); roofs.setColorAt(i, col);
  }

  function flush() {
    if (!walls || !roofs) return;
    walls.instanceMatrix.needsUpdate = roofs.instanceMatrix.needsUpdate = true;
    walls.instanceColor.needsUpdate = roofs.instanceColor.needsUpdate = true;
  }

  function moveBikes(dt) {
    if (!bikeMesh) return;
    bikes.forEach((b, i) => {
      b.p += b.v * dt; if (b.p > b.lim[1]) b.p = b.lim[0]; if (b.p < b.lim[0]) b.p = b.lim[1];
      if (b.axis === 'z') { pos.set(b.p, 0.1, b.line); m4.compose(pos, qy, scl.set(1, 1, 1)); }
      else { pos.set(b.line, 0.1, b.p); m4.compose(pos, q0, scl.set(1, 1, 1)); }
      bikeMesh.setMatrixAt(i, m4);
    });
    bikeMesh.instanceMatrix.needsUpdate = true;
  }

  function moveMetro(dt) {
    if (!metroTrain) return;
    metroX += metroDir * dt * 2.2;
    if (metroX > 11.2) { metroX = 11.2; metroDir = -1; }
    else if (metroX < -11.2) { metroX = -11.2; metroDir = 1; }
    metroTrain.position.x = metroX;
  }

  const goal = { az: 0.62, el: 0.86, zoom: 1, tx: 0, tz: OZ };
  const cur = { az: goal.az, el: goal.el, zoom: 1.35, tx: 0, tz: OZ };
  let fit = 55, dirty = true, lastW = 0, lastH = 0;

  function placeCam(t) {
    const sway = reduce ? 0 : Math.sin(t * 0.18) * 0.032;
    const d = cur.zoom * fit, az = cur.az + sway;
    cam.position.set(cur.tx + d * Math.cos(cur.el) * Math.sin(az), d * Math.sin(cur.el), cur.tz + d * Math.cos(cur.el) * Math.cos(az));
    cam.lookAt(cur.tx, 0.4, cur.tz);
  }

  function size() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    const tanV = Math.tan(cam.fov * Math.PI / 360), tanH = tanV * cam.aspect;
    // Giữ tỉ lệ mô hình gọn đẹp cả trên Mobile dọc lẫn Desktop ngang
    const spanX = cam.aspect < 0.9 ? 40 : 48;
    const spanY = cam.aspect < 0.9 ? 28 : 30;
    fit = Math.max(spanX / (2 * tanH), spanY / (2 * tanV));
    dirty = true;
  }
  addEventListener('resize', size);
  if (window.ResizeObserver) {
    new ResizeObserver(() => size()).observe(wrap);
  }

  const ray = new T.Raycaster(), ndc = new T.Vector2();
  let ptr = null, drag = null, hoverZone = null, hoverPin = null, sticky = null, pickDirty = false, lastSel = undefined;
  const okPin = (P) => window.matches(P.p) && !window.hiddenReason(P.p);

  function doPick() {
    pickDirty = false; hoverPin = null; hoverZone = null;
    if (!ptr) return;
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    ndc.set(((ptr.x - r.left) / r.width) * 2 - 1, -((ptr.y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const ph = ray.intersectObjects(pins.filter(okPin).map((P) => P.hit), false);
    if (ph.length) { hoverPin = ph[0].object.userData.pin; hoverZone = hoverPin.zone; return; }
    if (walls) {
      const wh = ray.intersectObject(walls, false);
      if (wh.length && wh[0].instanceId != null && lots[wh[0].instanceId]) hoverZone = lots[wh[0].instanceId].zone;
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, az: goal.az, el: goal.el, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    ptr = { x: e.clientX, y: e.clientY };
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
      if (drag.moved) { goal.az = drag.az - dx * 0.006; goal.el = clamp(drag.el + dy * 0.004, 0.45, 1.2); canvas.style.cursor = 'grabbing'; }
    }
    pickDirty = true;
  });
  canvas.addEventListener('pointerup', (e) => {
    const wasClick = drag && !drag.moved; drag = null; canvas.style.cursor = '';
    if (!wasClick) return;
    ptr = { x: e.clientX, y: e.clientY }; doPick();
    if (hoverPin) { window.select(hoverPin.p.id); }
    else { sticky = hoverZone != null && hoverZone !== sticky ? hoverZone : null; if (hoverZone == null && state.sel) window.select(state.sel); }
    if (hint) hint.classList.add('off');
  });
  canvas.addEventListener('pointerleave', () => { if (!drag) { ptr = null; pickDirty = true; } });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); goal.zoom = clamp(goal.zoom * Math.exp(e.deltaY * 0.0012), 0.4, 1.25); }, { passive: false });

  let shownZone = null;
  function updateCard(z) {
    if (!card || z === shownZone) return; shownZone = z;
    if (z == null || !ZONES[z]) { card.classList.remove('on'); return; }
    const here = pins.filter((P) => P.zone === z && window.matches(P.p));
    const shown = here.filter((P) => !window.hiddenReason(P.p));
    const nl = shown.filter((P) => P.p.v === 'local').length;
    const nu = shown.filter((P) => P.p.v === 'unsure').length;
    const nh = here.length - shown.length;
    card.innerHTML = '<b>' + ZONES[z].name + '</b><span>' + ZONES[z].sub + '</span><span>' +
      (shown.length ? nl + ' quán local' + (nu ? ', ' + nu + ' chưa chắc' : '') : 'Chưa có quán khớp') + (nh ? ' · ' + nh + ' đã ẩn' : '') + '</span>';
    card.classList.add('on');
  }

  let last = performance.now(), t = 0, visible = true, running = false, raf = 0;
  function tick(now) {
    if (!running) return;
    if (wrap.clientWidth !== lastW || wrap.clientHeight !== lastH) size();
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const sp = reduce ? 1 : Math.min(1, dt * 7);
    let busy = false;

    const selPin = state.sel != null ? pins.find((P) => P.p.id === state.sel) : null;
    if (state.sel !== lastSel) {
      lastSel = state.sel;
      if (selPin) {
        goal.tx = selPin.x * 0.72;
        goal.tz = OZ + (selPin.z - OZ) * 0.72;
        goal.zoom = Math.min(goal.zoom, 0.66);
      } else {
        goal.tx = 0; goal.tz = OZ; goal.zoom = Math.max(goal.zoom, 0.95);
      }
    }
    if (pickDirty || drag || (ptr && Math.abs(cur.az - goal.az) + Math.abs(cur.zoom - goal.zoom) > 0.001)) doPick();
    // Khi đã chọn 1 quán cụ thể: KHÔNG nâng cả cụm khu vực không liên quan, chỉ hiện đúng quán đó
    const active = selPin ? null : (hoverZone != null ? hoverZone : sticky);
    if (selPin) {
      if (card && shownZone !== 'sel:' + selPin.p.id) {
        shownZone = 'sel:' + selPin.p.id;
        card.innerHTML = '<b>' + selPin.p.name + '</b><span>' + (selPin.p.dish || '') + ' · ' + (selPin.p.price_text || '') + '</span><span>' + (selPin.p.address || '') + '</span>';
        card.classList.add('on');
      }
    } else {
      updateCard(active);
    }
    if ((hoverZone != null || selPin) && hint) hint.classList.add('off');

    const NZ = ZONES.length;
    for (let z = 0; z < NZ; z++) { gt[z] = active === z ? 1 : 0; dimT[z] = active != null && active !== z ? 1 : 0; }
    if (introT < 3) { introT += dt * 0.95; busy = true; }
    for (let z = 0; z < NZ; z++) {
      const dg = gt[z] - gArr[z], dd = dimT[z] - dim[z];
      if (Math.abs(dg) > 0.002 || Math.abs(dd) > 0.002 || introT < 3) {
        gArr[z] += dg * sp; dim[z] += dd * sp; busy = true;
        zoneLots[z].forEach(setLot);
      }
    }
    if (busy) flush();

    const zoomBoost = clamp(0.85 + cur.zoom * 0.22, 0.88, 1.18);
    pins.forEach((P) => {
      const ok = okPin(P), isSel = state.sel === P.p.id;
      const vt = selPin
        ? (isSel && ok ? 1 : 0)
        : (ok && (P.zone === active || active == null) ? (P.zone === active ? 1 : 0.85) : 0);
      P.v += (vt - P.v) * sp;
      const hv = hoverPin === P ? 1 : 0; P.hover += (hv - P.hover) * sp;
      const v = P.v, hh = PIN_H * v;
      P.stem.visible = v > 0.01; P.stem.scale.set(1, Math.max(hh, 0.001), 1); P.stem.position.y = hh / 2;
      const bob = reduce ? 0 : Math.sin(t * 2 + P.x) * 0.06 * v;
      P.head.position.y = hh + 0.22 + bob; P.head.visible = v > 0.01;
      const hs = (0.5 + 0.5 * v) * (1 + 0.25 * P.hover + (isSel ? 0.22 : 0)); P.head.scale.setScalar(hs);
      P.head.rotation.y += dt * 0.9; if (P.p.v === 'unsure') P.head.rotation.x = Math.PI / 2 + Math.sin(t) * 0.2;
      P.label.position.y = hh + 1.18;
      // Khi đã chọn 1 quán: CHỈ hiện nhãn của đúng quán đó; khi chưa chọn: hiện rõ các quán đang lọc
      P.label.material.opacity = selPin
        ? (isSel && ok ? 1 : 0)
        : (ok ? ((P.zone === active || P.hover > 0.2) ? 1 : (active == null ? 0.94 : 0.18)) : 0);
      P.label.visible = P.label.material.opacity > 0.03;
      const ls = (0.84 + 0.16 * v + 0.08 * P.hover + (isSel ? 0.08 : 0)) * zoomBoost;
      P.label.scale.set(4.3 * ls, 1.07 * ls, 1);
      P.dot.visible = selPin ? (isSel && ok) : true;
      P.dot.material.opacity = ok ? (1 - v * 0.6) : 0.18; P.dot.scale.setScalar(1 - v * 0.35 + 0.2 * P.hover);
      P.hit.position.y = hh + 0.25;
      if (Math.abs(vt - v) > 0.003) busy = true;
    });
    canvas.style.cursor = drag && drag.moved ? 'grabbing' : (hoverPin || hoverZone != null ? 'pointer' : 'grab');

    const cs = reduce ? 1 : Math.min(1, dt * 4.5);
    ['az', 'el', 'zoom', 'tx', 'tz'].forEach((k) => { const d = goal[k] - cur[k]; cur[k] += d * cs; if (Math.abs(d) > 0.002) busy = true; });
    placeCam(t);

    if (!reduce) {
      if (waterTex) { waterTex.offset.x += dt * 0.012; waterTex.offset.y += dt * 0.006; }
      moveBikes(dt);
      moveMetro(dt);
      busy = true;
    }
    if (busy || dirty) { renderer.render(scene, cam); dirty = false; }
    raf = requestAnimationFrame(tick);
  }

  function start() { if (running || !visible || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.02 }).observe(wrap);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  buildDistrict(window.state ? state.district : 'gia_lam');
  size(); placeCam(0); start();

  window.Map3D = {
    sync() {
      if (window.state && builtDistrict !== state.district) {
        buildDistrict(state.district);
      }
      if (wrap.clientWidth !== lastW || wrap.clientHeight !== lastH) {
        size();
      }
      dirty = true;
      shownZone = -1;
    },
    resize() {
      size();
      dirty = true;
    }
  };
})();
