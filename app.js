const REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches;

// hero entrance (staggered line + element reveal via body.loaded)
requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('loaded')));

// sticky header
const header = document.getElementById('header');
const onScrollHeader = () => header.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScrollHeader, { passive: true }); onScrollHeader();

// scroll progress + parallax in one rAF loop
const progressBar = document.getElementById('progressBar');
const plxEls = REDUCE ? [] : [...document.querySelectorAll('[data-plx]')].map(el => ({ el, f: +el.dataset.plx }));
let ticking = false;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
    // parallax nur solange der Hero sichtbar ist
    if (window.scrollY < innerHeight * 1.2) {
      for (const p of plxEls) p.el.style.transform = 'translate3d(0,' + (window.scrollY * p.f) + 'px,0)' + (p.el.classList.contains('dia-o') ? ' rotate(45deg)' : '');
    }
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

// mobile menu
const burger = document.getElementById('burger'), navLinks = document.getElementById('navLinks');
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

// scroll reveal (Fallback: ohne IntersectionObserver alles sofort zeigen)
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => { es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }) }, { threshold: .15, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('[data-rv]').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('[data-rv]').forEach(el => el.classList.add('in'));
  const tlEl = document.getElementById('ablaufTimeline'); if (tlEl) tlEl.classList.add('run');
}

// count up
const countIO = new IntersectionObserver((es) => {
  es.forEach(e => {
    if (!e.isIntersecting) return; const el = e.target; countIO.unobserve(el);
    const target = +el.dataset.count, suf = el.dataset.suffix || '';
    if (REDUCE) { el.textContent = target + suf; return; }
    const dur = 1500, t0 = performance.now();
    const step = (t) => { const p = Math.min((t - t0) / dur, 1); el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target) + suf; if (p < 1) requestAnimationFrame(step) };
    requestAnimationFrame(step);
  });
}, { threshold: .5 });
document.querySelectorAll('[data-count]').forEach(el => countIO.observe(el));

// timeline draw — zündet früh, damit die Schritte auch bei schnellem Scrollen sofort da sind
const tl = document.getElementById('ablaufTimeline');
if (tl) { const tlIO = new IntersectionObserver((es) => { es.forEach(e => { if (e.isIntersecting) { tl.classList.add('run'); tlIO.unobserve(tl) } }) }, { threshold: .08 }); tlIO.observe(tl) }

// Scroll-Montage: Die Wand verplattet sich beim Scrollen — roh → fertig, Platte für Platte
(() => {
  const wrap = document.getElementById('filmWrap');
  const canvas = document.getElementById('filmCanvas');
  const fallbackImg = document.querySelector('.hero-bg img');
  const SRC_ROH = 'assets/img/wand_roh.jpg', SRC_FERTIG = 'assets/img/wand_fertig.jpg';
  // Reduced motion: statisch die fertige Wand zeigen, keine Montage
  if (REDUCE) { if (fallbackImg) fallbackImg.src = SRC_FERTIG; return; }
  if (!wrap || !canvas) return;
  const ctx = canvas.getContext('2d');

  // Plattenraster in Bildkoordinaten des 1376×768-Masters (Fugenlinien vermessen)
  const IW = 1376, IH = 768;
  const COLS = [151, 434, 687, 932, 1177, 1376];
  const ROWS = [38, 208, 378, 551, 723];
  // Bildfokus beim Cover-Zuschnitt (Handwerker steht rechts; mobil stärker nach rechts rücken)
  const FX = matchMedia('(max-width: 768px)').matches ? .78 : .62, FY = .45;
  // Verlegereihenfolge wie auf der Baustelle: unterste Reihe zuerst, links → rechts
  const order = [];
  for (let r = ROWS.length - 2; r >= 0; r--)
    for (let c = 0; c < COLS.length - 1; c++)
      order.push([r, c]);
  const T = order.length;

  const roh = new Image(), fertig = new Image();
  let ready = 0, raf = false, lastP = -1;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const fit = () => {
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / IW, ch / IH);
    return { s, ox: (cw - IW * s) * FX, oy: (ch - IH * s) * FY };
  };

  const draw = (p) => {
    if (ready < 2) return;
    lastP = p;
    const cw = canvas.width, ch = canvas.height;
    const { s, ox, oy } = fit();
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(roh, ox, oy, IW * s, IH * s);

    // Montage läuft von 10% bis 92% des Scrollwegs
    const t = Math.min(Math.max((p - .10) / .82, 0), 1);
    const f = t * T, k = Math.floor(f);

    for (let i = 0; i < Math.min(k + 1, T); i++) {
      const [r, c] = order[i];
      const x0 = COLS[c], x1 = COLS[c + 1], y0 = ROWS[r], y1 = ROWS[r + 1];
      const local = i < k ? 1 : f - k;   // 0..1 = diese Platte setzt sich gerade
      const e = easeOut(local);
      const lift = (1 - e) * (y1 - y0) * .18;   // gleitet leicht von oben ins Kleberbett
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox + x0 * s, oy + y0 * s, (x1 - x0) * s, (y1 - y0) * s);
      ctx.clip();
      ctx.globalAlpha = Math.min(1, local * 2.5);
      ctx.drawImage(fertig, ox, oy - lift * s, IW * s, IH * s);
      ctx.restore();
      // Gold-Glanz an der frisch gesetzten Platte (Fugenlinien-Motiv)
      if (local < 1) {
        ctx.save();
        ctx.globalAlpha = (1 - e) * .5;
        ctx.strokeStyle = '#c2a267';
        ctx.lineWidth = Math.max(1.5, 2 * s);
        ctx.strokeRect(ox + x0 * s, oy + y0 * s, (x1 - x0) * s, (y1 - y0) * s);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    if (lastP >= 0) draw(lastP);
  };
  addEventListener('resize', resize, { passive: true });

  const heroInner = document.querySelector('.hero-inner');
  const heroHint = document.querySelector('.hero-hint');
  // Debug/Verifikation: #p=0.5 friert den Montage-Fortschritt ein
  const forced = () => { const m = location.hash.match(/p=([\d.]+)/); return m ? Math.min(Math.max(parseFloat(m[1]), 0), 1) : null; };
  const update = () => {
    raf = false;
    const r = wrap.getBoundingClientRect();
    const total = r.height - innerHeight;
    let p = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : 0;
    const fp = forced(); if (fp !== null) p = fp;
    draw(p);
    // Headline blendet in den ersten ~28% der Montage aus
    const fade = Math.min(p / .28, 1);
    if (heroInner) { heroInner.style.opacity = String(1 - fade); heroInner.style.transform = 'translateY(' + (-36 * fade) + 'px)'; }
    if (heroHint) heroHint.style.opacity = String(1 - Math.min(p / .1, 1));
  };
  const onFilmScroll = () => { if (!raf) { raf = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onFilmScroll, { passive: true });
  addEventListener('hashchange', onFilmScroll, { passive: true });

  const loaded = () => { if (++ready === 2) { resize(); canvas.classList.add('ready'); update(); } };
  roh.onload = loaded; fertig.onload = loaded;
  roh.src = SRC_ROH; fertig.src = SRC_FERTIG;
})();

// magnetic pills (Footer) — nur bei Maus-Zeiger und ohne reduced motion
if (!REDUCE && matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.magnet').forEach(el => {
    let raf = null, tx = 0, ty = 0, cx = 0, cy = 0;
    const tick = () => {
      cx += (tx - cx) * .18; cy += (ty - cy) * .18;
      el.style.transform = 'translate(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px)';
      if (Math.abs(tx - cx) > .1 || Math.abs(ty - cy) > .1) raf = requestAnimationFrame(tick);
      else { if (!tx && !ty) el.style.transform = ''; raf = null; }
    };
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - r.left - r.width / 2) * .35;
      ty = (e.clientY - r.top - r.height / 2) * .35;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    el.addEventListener('mouseleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
  });
}

// back to top
const toTop = document.getElementById('toTop');
if (toTop) toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: REDUCE ? 'instant' : 'smooth' }));

// Offerte-Formular: Versand via FormSubmit an info@sb-plattenleger.ch
// (erste echte Anfrage loest einmalig eine Aktivierungs-Mail von formsubmit.co aus)
const form = document.getElementById('offerForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (form.querySelector('[name="_honey"]').value) return; // Spam-Falle
  const btn = form.querySelector('button[type="submit"]');
  const err = document.getElementById('formErr');
  err.hidden = true;
  btn.disabled = true;
  const label = btn.innerHTML;
  btn.textContent = 'Wird gesendet ...';
  try {
    const data = new FormData(form);
    data.append('_subject', 'Offerte-Anfrage über die Website');
    data.append('_template', 'table');
    const res = await fetch('https://formsubmit.co/ajax/info@sb-plattenleger.ch', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: data
    });
    if (!res.ok) throw new Error('send failed');
    form.style.display = 'none';
    document.getElementById('formOk').classList.add('show');
  } catch (_) {
    err.hidden = false;
    btn.disabled = false;
    btn.innerHTML = label;
  }
});

// ===== v2.1 Animationen (2026-07-08) =====

// 1) Fliesen-Reveal: 4 Deck-Kacheln pro Referenzbild, verschwinden versetzt (CSS uebernimmt Timing)
// (v2.4: nicht mehr auf .sc-media — die Showcase-Slides werden dynamisch aus projects.json gebaut)
if (!REDUCE) {
  document.querySelectorAll('.gallery figure.g-item').forEach(fig => {
    const c = document.createElement('div'); c.className = 'tile-cover'; c.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) c.appendChild(document.createElement('i'));
    fig.appendChild(c);
    c.addEventListener('transitionend', (e) => {
      if (e.target === c.lastElementChild && e.propertyName === 'opacity') c.remove();
    });
    // Sicherheitsnetz: falls Transitions gedrosselt werden (Hintergrund-Tab, schwache Geraete),
    // Cover spaetestens 2s nach dem Reveal hart entfernen
    const host = fig.closest('[data-rv]') || fig;
    const watch = setInterval(() => {
      if (host.classList.contains('in')) { clearInterval(watch); setTimeout(() => c.remove(), 2000); }
    }, 400);
  });
}

// 2) Goldene Fugenlinie: Pfad durch die Sektionen, zeichnet sich mit dem Scrollen
(() => {
  if (REDUCE) return;
  const main = document.getElementById('main'); if (!main) return;
  const secs = ['.statement', '#leistungen', '#ablauf', '#referenzen', '.trust', '#stellen', '#ueber', '#offerte']
    .map(s => document.querySelector(s)).filter(Boolean);
  if (secs.length < 3) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'joint-svg'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  svg.appendChild(path); main.appendChild(svg);
  let len = 0;
  const xs = [.07, .93]; // wechselseitig — Diagonalen greifen das Rauten-Motiv auf
  const upd = () => {
    if (!len) return;
    const mr = main.getBoundingClientRect();
    const tipY = -mr.top + innerHeight * .62; // Linienspitze bei ~62% Viewport
    let lo = 0, hi = len;
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (path.getPointAtLength(m).y < tipY) lo = m; else hi = m; }
    path.style.strokeDashoffset = String(Math.max(len - lo, 0));
  };
  const build = () => {
    const mr = main.getBoundingClientRect();
    const W = main.clientWidth, H = Math.round(mr.height);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    const pts = [];
    secs.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const yTop = Math.round(r.top - mr.top) + 24;
      const yMid = yTop + Math.round(r.height * .55);
      const x = Math.round(xs[i % 2] * W);
      pts.push([x, yTop], [x, yMid]);
    });
    path.setAttribute('d', pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' '));
    len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    upd();
  };
  let jraf = false;
  addEventListener('scroll', () => { if (!jraf) { jraf = true; requestAnimationFrame(() => { jraf = false; upd(); }); } }, { passive: true });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); }, { passive: true });
  addEventListener('load', build);
  build();
})();

// 6) Cursor-Spotlight: warmer Lichtkegel folgt der Maus (nur Desktop, gedrosselt via rAF-Lerp)
if (!REDUCE && matchMedia('(pointer:fine)').matches) {
  const sp = document.createElement('div'); sp.className = 'spotlight'; sp.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sp);
  let sx = innerWidth / 2, sy = innerHeight / 2, tx = sx, ty = sy, sr = null;
  const tick = () => {
    sx += (tx - sx) * .12; sy += (ty - sy) * .12;
    sp.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)';
    if (Math.abs(tx - sx) > .5 || Math.abs(ty - sy) > .5) sr = requestAnimationFrame(tick); else sr = null;
  };
  addEventListener('mousemove', (e) => {
    tx = e.clientX; ty = e.clientY; sp.classList.add('on');
    if (!sr) sr = requestAnimationFrame(tick);
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => sp.classList.remove('on'));
}

// ===== v2.2/v2.4 Referenzen-Showcase: Projekte aus projects.json (via admin.html pflegbar) =====
(() => {
  const track = document.getElementById('scTrack'); if (!track) return;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Slides aus den Projektdaten bauen (statisches Markup in index.html bleibt als Fallback)
  const build = (projekte) => {
    track.innerHTML = projekte.map(p => (
      '<article class="sc-slide">'
      + '<figure class="sc-media img-grade"><img src="' + esc(p.bild) + '" alt="' + esc(p.alt || p.titel) + '" loading="lazy" width="800" height="600"></figure>'
      + '<div class="sc-info">'
      + '<span class="tag">' + esc(p.tag) + '</span>'
      + '<h3>' + esc(p.titel) + '</h3>'
      + '<p>' + esc(p.text) + '</p>'
      + '<button class="sc-zoom" type="button" aria-label="Projekt gross ansehen">Gross ansehen <span class="arrow" aria-hidden="true">→</span></button>'
      + '</div></article>'
    )).join('');
  };

  const init = () => {
  const slides = [...track.querySelectorAll('.sc-slide')];
  const curEl = document.getElementById('scCur'), dots = document.getElementById('scDots');
  const totalEl = document.querySelector('.sc-count span');
  if (totalEl) totalEl.textContent = ' / ' + String(slides.length).padStart(2, '0');
  const GAP = 24;
  let idx = 0;
  slides.forEach((_, i) => {
    const d = document.createElement('button'); d.type = 'button'; d.className = 'sc-dot';
    d.setAttribute('aria-label', 'Projekt ' + (i + 1));
    d.addEventListener('click', () => go(i));
    dots.appendChild(d);
  });
  const dEls = [...dots.children];
  const setUi = () => { curEl.textContent = String(idx + 1).padStart(2, '0'); dEls.forEach((d, i) => d.classList.toggle('on', i === idx)); };
  const go = (i) => {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: idx * (track.clientWidth + GAP), behavior: REDUCE ? 'instant' : 'smooth' });
    setUi();
  };
  track.addEventListener('scroll', () => {
    const i = Math.round(track.scrollLeft / (track.clientWidth + GAP));
    if (i !== idx) { idx = Math.max(0, Math.min(slides.length - 1, i)); setUi(); }
  }, { passive: true });
  document.getElementById('scPrev').addEventListener('click', () => go(idx - 1));
  document.getElementById('scNext').addEventListener('click', () => go(idx + 1));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
  });
  setUi();

  // Lightbox
  const lb = document.createElement('div'); lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Projektansicht');
  lb.innerHTML = '<button class="lb-close" type="button" aria-label="Schliessen">×</button>'
    + '<button class="lb-prev" type="button" aria-label="Vorheriges Projekt"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg></button>'
    + '<img alt="">'
    + '<button class="lb-next" type="button" aria-label="Naechstes Projekt"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7"/></svg></button>';
  document.body.appendChild(lb);
  const lbImg = lb.querySelector('img'); let lbi = 0;
  const open = (i) => {
    lbi = (i + slides.length) % slides.length;
    const im = slides[lbi].querySelector('img');
    lbImg.src = im.src; lbImg.alt = im.alt;
    lb.classList.add('open'); document.body.style.overflow = 'hidden';
  };
  const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };
  slides.forEach((s, i) => {
    s.querySelector('.sc-zoom').addEventListener('click', () => open(i));
    s.querySelector('.sc-media').addEventListener('click', () => open(i));
  });
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', () => open(lbi - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => open(lbi + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') open(lbi + 1);
    if (e.key === 'ArrowLeft') open(lbi - 1);
  });
  };

  // Projekte laden; wenn das schiefgeht, bleiben die statischen Slides aus index.html stehen
  fetch('projects.json', { cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error('load failed'); return r.json(); })
    .then(data => { if (Array.isArray(data.projekte) && data.projekte.length) build(data.projekte); })
    .catch(() => {})
    .finally(init);
})();
