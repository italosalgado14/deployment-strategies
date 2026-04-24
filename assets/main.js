// Theme toggle with persistence
(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  root.dataset.theme = initial;

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      localStorage.setItem('theme', next);
      // Re-render mermaid diagrams with the new theme
      if (window.__mermaid) {
        window.__mermaid.initialize({
          startOnLoad: false,
          theme: next === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, sans-serif'
        });
        document.querySelectorAll('.mermaid').forEach((el, i) => {
          if (el.dataset.source) {
            el.innerHTML = el.dataset.source;
            el.removeAttribute('data-processed');
          } else {
            el.dataset.source = el.textContent;
          }
        });
        window.__mermaid.run();
      }
    });
  }

  // Cache original mermaid source before first render
  document.querySelectorAll('.mermaid').forEach((el) => {
    el.dataset.source = el.textContent;
  });
})();

// TOC active-section tracking via IntersectionObserver
(function () {
  const links = document.querySelectorAll('.toc a[href^="#"]');
  const map = new Map();
  links.forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target) map.set(target, a);
  });

  if (!('IntersectionObserver' in window) || map.size === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = map.get(entry.target);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach((l) => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    },
    { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
  );

  map.forEach((_, section) => observer.observe(section));
})();
