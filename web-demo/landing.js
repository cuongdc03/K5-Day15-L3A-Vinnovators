/* Quán Thật Hà Nội — landing: hiệu ứng cuộn, đếm số, người gánh đi theo thanh cuộn */
(function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Đặt người gánh hàng rong (từ <template>) vào hero và thanh cuộn */
  const tpl = document.getElementById('tpl-walker');
  const heroSlot = document.getElementById('heroWalker');
  const railSlot = document.getElementById('railWalker');
  if (tpl && heroSlot) heroSlot.appendChild(tpl.content.cloneNode(true));
  if (tpl && railSlot) railSlot.appendChild(tpl.content.cloneNode(true));

  /* 2. Hiện dần từng khối khi cuộn tới */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* 3. Đếm số ở mục Minh bạch */
  if (!reduced) {
    const numIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target, target = +el.dataset.count, t0 = performance.now();
        const step = (now) => {
          const p = Math.min(1, (now - t0) / 900);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        numIo.unobserve(el);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-count]').forEach((el) => numIo.observe(el));
  }

  /* 4. Người gánh đi dọc đáy trang theo tiến độ cuộn; chỉ bước chân khi đang cuộn */
  const rail = document.getElementById('rail');
  const walker = railSlot && railSlot.firstElementChild;
  const parallax = [...document.querySelectorAll('[data-parallax]')];
  let timer = 0, ticking = false;

  function update() {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    if (walker) walker.style.transform = 'translateX(' + (p * (innerWidth - 78)).toFixed(1) + 'px)';
    if (!reduced) {
      for (const img of parallax) {
        const r = img.getBoundingClientRect();
        const ratio = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        img.style.transform = 'scale(1.06) translateY(' + (-ratio * (+img.dataset.parallax || 10)).toFixed(1) + 'px)';
      }
    }
  }
  addEventListener('scroll', () => {
    if (rail) {
      rail.classList.add('walking');
      clearTimeout(timer);
      timer = setTimeout(() => rail.classList.remove('walking'), 160);
    }
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener('resize', update);
  update();
})();
