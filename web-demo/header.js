/* Header interactions shared by all three pages. Page-specific map/landing
   preview logic stays in its existing controller. */
(function () {
  'use strict';
  const overview = document.querySelector('.nav-overview');
  if (overview) {
    document.addEventListener('click', (event) => {
      if (!overview.contains(event.target)) overview.open = false;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && overview.open) {
        overview.open = false;
        overview.querySelector('summary').focus();
      }
    });
    overview.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => { overview.open = false; }));
  }
  document.querySelectorAll('[data-open-map]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (window.state && typeof window.setMobileTab === 'function') {
        event.preventDefault();
        window.setMobileTab('map');
        window.refreshMaps(true);
      }
    });
  });

  if (!document.body.classList.contains('menu-page')) return;
  const key = 'qthn_view_mode';
  function setView(mode, persist, updateUrl) {
    const next = mode === 'mobile' ? 'mobile' : 'desktop';
    document.body.classList.toggle('mobile-mode', next === 'mobile');
    document.querySelectorAll('.vs-btn[data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === next)));
    if (persist) { try { localStorage.setItem(key, next); } catch (error) { /* storage may be disabled */ } }
    if (updateUrl) {
      const url = new URL(location.href);
      if (next === 'mobile') url.searchParams.set('view', next);
      else url.searchParams.delete('view');
      history.replaceState({}, '', url);
    }
  }
  const requested = new URLSearchParams(location.search).get('view');
  let saved = null;
  try { saved = localStorage.getItem(key); } catch (error) { /* storage may be disabled */ }
  const mode = [requested, saved].find((value) => ['mobile', 'desktop'].includes(value)) || (innerWidth <= 768 ? 'mobile' : 'desktop');
  setView(mode, ['mobile', 'desktop'].includes(requested), false);
  document.querySelectorAll('.vs-btn[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view, true, true)));
})();
