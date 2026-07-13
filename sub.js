// Gemeinsames Verhalten fuer Unterseiten (Leistungs-Detailseiten, Uebersicht):
// Sticky-Header, Fortschrittsbalken, Burger-Menu, Scroll-Reveal.
// Bewusst getrennt von app.js (das fest auf die Startseite zugeschnitten ist).
const REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches;
requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('loaded')));

const header = document.getElementById('header');
if (header) {
  const onScrollHeader = () => header.classList.toggle('scrolled', window.scrollY > 40);
  addEventListener('scroll', onScrollHeader, { passive: true }); onScrollHeader();
}

const progressBar = document.getElementById('progressBar');
if (progressBar) {
  const onScrollProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
  };
  addEventListener('scroll', onScrollProgress, { passive: true }); onScrollProgress();
}

const burger = document.getElementById('burger'), navLinks = document.getElementById('navLinks');
if (burger && navLinks) {
  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open'); burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
  }));
}

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => { es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }) }, { threshold: .12, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('[data-rv]').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('[data-rv]').forEach(el => el.classList.add('in'));
}
