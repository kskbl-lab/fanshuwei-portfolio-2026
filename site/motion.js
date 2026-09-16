(() => {
  const selector = [
    '.site-header', '.breadcrumb:not(.return-nav)', '.hero-edition', '.hero-center > *',
    '.about-title-row', '.about-portrait', '.about-profile-copy > *',
    '.section-label', '.experience-card', '.personal-banner',
    '.strength-grid > article', '.company-hero > div', '.personal-hero > div',
    '.stats > div', '.product-note', '.section-heading', '.product-card',
    '.work-actions', '.filter-bar', '.media-card', '.process-step',
    '.review-section', '.next-experience', '.legacy-note', '.empty-state',
    'footer'
  ].join(',');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const registered = new WeakSet();
  const pending = new Set();
  const running = new Map();
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;

  function reveal(element, delay = 0, immediate = false) {
    observer.unobserve(element);
    pending.delete(element);
    element.classList.remove('motion-pending');
    if (immediate || reducedMotion.matches || !element.isConnected) return;
    // Individual translate leaves card hover transforms and logo animations intact.
    const distance = matchMedia('(max-width: 640px)').matches ? 16 : 24;
    const finalOpacity = getComputedStyle(element).opacity;
    const animation = element.animate([
      { opacity: 0, translate: `0 ${distance}px` },
      { opacity: finalOpacity, translate: '0 0' }
    ], { duration: 700, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    running.set(element, animation);
    animation.finished.then(() => {
      if (running.get(element) === animation) running.delete(element);
    }, () => {});
  }

  const observer = new IntersectionObserver(entries => {
    const batch = entries.filter(entry => entry.isIntersecting && pending.has(entry.target));
    batch.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top ||
      a.boundingClientRect.left - b.boundingClientRect.left);
    const groups = new Map();
    for (const entry of batch) {
      const group = entry.target.parentElement;
      const index = groups.get(group) || 0;
      groups.set(group, index + 1);
      reveal(entry.target, Math.min(index, 3) * 75);
    }
  }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });

  function refresh(root = document) {
    // Category switches replace cards. Release the detached elements immediately.
    for (const element of pending) {
      if (!element.isConnected) reveal(element, 0, true);
    }
    for (const [element, animation] of running) {
      if (!element.isConnected) { animation.cancel(); running.delete(element); }
    }
    if (reducedMotion.matches) return;
    root.querySelectorAll(selector).forEach(element => {
      if (registered.has(element)) return;
      registered.add(element);
      // Avoid multiplying opacity when a larger module already owns the reveal.
      if (element.parentElement?.closest(selector)) return;
      pending.add(element);
      element.classList.add('motion-pending');
      observer.observe(element);
    });
  }

  // Keyboard navigation must never land on a transparent control.
  document.addEventListener('focusin', event => {
    for (const element of pending) {
      if (element.contains(event.target)) reveal(element, 0, true);
    }
    for (const [element, animation] of running) {
      if (element.contains(event.target)) { animation.cancel(); running.delete(element); }
    }
  });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) { refresh(); return; }
    for (const element of pending) reveal(element, 0, true);
    for (const animation of running.values()) animation.cancel();
    running.clear();
  });
  window.PortfolioMotion = { refresh };
  refresh();
})();
