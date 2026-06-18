/* ============================================================
   Иллюстратор 2030 — landing behavior
   Lenis smooth scroll · GSAP ScrollTrigger reveals · brush cursor
   with fading paint trail · magnetic buttons · marquees · accordions
   · gallery hover-preview · scroll-drawn through-line.
   All effects degrade gracefully; cursor/parallax disabled on touch.
   ============================================================ */
(function () {
  'use strict';
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!window.gsap;
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- PRELOADER ---------- */
  function runPreloader(done) {
    const pl = document.getElementById('preloader');
    const bar = pl.querySelector('.pl-bar');
    const pct = pl.querySelector('.pl-pct');
    const lines = pl.querySelectorAll('.pl-mark .pl-line span');
    document.body.classList.add('is-loading');

    let finished = false;
    function finish() {
      if (finished) return; finished = true;
      pl.style.display = 'none';
      document.body.classList.remove('is-loading');
      done();
    }
    // Hard safety: never trap the user even if rAF/GSAP stalls.
    setTimeout(finish, 2300);

    if (!hasGSAP) {
      lines.forEach(l => l.style.transform = 'translateY(0)');
      setTimeout(finish, 300);
      return;
    }
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(lines, { yPercent: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }, 0.1)
      .to(bar, { scaleX: 1, duration: 1.25, ease: 'power2.inOut' }, 0.15)
      .to({ v: 0 }, { v: 100, duration: 1.25, ease: 'power2.inOut',
            onUpdate: function () { pct.textContent = Math.round(this.targets()[0].v) + '%'; } }, 0.15)
      .to(pl, { yPercent: -100, duration: 0.7, ease: 'power3.inOut' }, '+=0.1')
      .set(pl, { display: 'none' });
  }

  /* ---------- LENIS SMOOTH SCROLL ---------- */
  let lenis = null;
  function initLenis() {
    if (isTouch || reduced || !window.Lenis) return;
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length > 1) { e.preventDefault(); lenis.scrollTo(id, { offset: -10 }); }
      });
    });
  }
  function scrollToSel(sel) {
    const el = document.querySelector(sel); if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -10 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }

  /* ---------- SPLIT TEXT ---------- */
  function splitWords(el) {
    if (el.dataset.split) return;
    const text = el.textContent;
    el.textContent = '';
    el.dataset.split = '1';
    text.split(/(\s+)/).forEach(tok => {
      if (tok === '') return;
      if (/^\s+$/.test(tok)) {
        const sp = document.createElement('span');
        sp.textContent = tok;
        sp.style.whiteSpace = 'pre';
        el.appendChild(sp);
        return;
      }
      const w = document.createElement('span');
      w.className = 'word';
      w.style.display = 'inline-block';
      w.style.willChange = 'transform, opacity';
      w.textContent = tok;
      el.appendChild(w);
    });
    return el.querySelectorAll('.word');
  }

  /* ---------- SCROLL REVEALS ---------- */
  function initReveals() {
    if (!hasGSAP) { document.querySelectorAll('[data-fade]').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }); return; }
    if (reduced) return;

    // line-mask reveals (hero / section heads)
    document.querySelectorAll('[data-reveal-lines] .ln > span').forEach(s => gsap.set(s, { yPercent: 110 }));
    document.querySelectorAll('[data-reveal-lines]').forEach(group => {
      const spans = group.querySelectorAll('.ln > span');
      ScrollTrigger.create({
        trigger: group, start: 'top 85%', once: true,
        onEnter: () => gsap.to(spans, { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: 0.09 })
      });
    });

    // word-by-word reveals
    document.querySelectorAll('[data-reveal]').forEach(el => {
      const words = splitWords(el);
      gsap.set(words, { yPercent: 60, opacity: 0 });
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(words, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.018 })
      });
    });

    // simple fade-ups
    gsap.utils.toArray('[data-fade]').forEach((el, i) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });

    // parallax on tagged elements
    if (!isTouch) {
      gsap.utils.toArray('[data-parallax]').forEach(el => {
        const amt = parseFloat(el.dataset.parallax) || 0.15;
        gsap.to(el, { yPercent: -amt * 100, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }
  }

  /* ---------- MARQUEE ---------- */
  function initMarquees() {
    document.querySelectorAll('.marquee-track').forEach(track => {
      // duplicate content for seamless loop
      track.innerHTML += track.innerHTML;
      const dir = track.dataset.dir === 'right' ? 1 : -1;
      const speed = parseFloat(track.dataset.speed) || 28;
      let x = 0, half = 0, last = performance.now();
      function measure() { half = track.scrollWidth / 2; }
      measure(); window.addEventListener('resize', measure);
      if (reduced) return;
      function tick(now) {
        const dt = (now - last) / 1000; last = now;
        x += dir * speed * dt;
        if (dir < 0 && -x >= half) x += half;
        if (dir > 0 && x >= 0) x -= half;
        track.style.transform = 'translateX(' + x + 'px)';
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- CUSTOM BRUSH CURSOR + PAINT TRAIL ---------- */
  function initCursor() {
    return; /* classic system cursor — custom brush cursor removed per feedback */
    if (isTouch) return;
    const dot = document.getElementById('cursor');
    const label = document.getElementById('cursor-label');
    const canvas = document.getElementById('brush-canvas');
    const ctx = canvas.getContext('2d');
    let W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { W = canvas.width = innerWidth * dpr; H = canvas.height = innerHeight * dpr; canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px'; }
    size(); addEventListener('resize', size);

    let mx = innerWidth / 2, my = innerHeight / 2, px = mx, py = my;
    let cx = mx, cy = my; // eased cursor dot
    let lastPaint = 0;

    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (label.dataset.on === '1') { label.style.left = mx + 'px'; label.style.top = my + 'px'; }
    }, { passive: true });
    addEventListener('pointerdown', () => dot.classList.add('is-down'));
    addEventListener('pointerup', () => dot.classList.remove('is-down'));

    // paint a soft brush dab
    function dab(x, y, r, a) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,45,68,' + a + ')');
      g.addColorStop(1, 'rgba(255,45,68,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    function loop(now) {
      // ease dot
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      dot.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)' + (dot.classList.contains('is-down') ? ' scale(0.8)' : '');

      // fade existing paint (trail vanishes ~1s)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';

      // draw stroke between last and current scaled positions
      const sx = mx * dpr, sy = my * dpr, lx = px * dpr, ly = py * dpr;
      const dist = Math.hypot(sx - lx, sy - ly);
      const steps = Math.max(1, Math.floor(dist / 4));
      const vr = Math.min(13, 5 + dist * 0.25) * dpr;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        dab(lx + (sx - lx) * t, ly + (sy - ly) * t, vr, 0.10);
      }
      px = mx; py = my;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // hover states on interactive elements
    document.querySelectorAll('a, button, .btn, [data-cursor], .prog-head, .faq-head, .gal-row, .gal-tab').forEach(el => {
      el.addEventListener('pointerenter', () => {
        dot.classList.add('is-hover');
        const lab = el.getAttribute('data-cursor-label');
        if (lab) { label.textContent = lab; label.style.opacity = 1; label.dataset.on = '1'; }
      });
      el.addEventListener('pointerleave', () => {
        dot.classList.remove('is-hover');
        label.style.opacity = 0; label.dataset.on = '0';
      });
    });
  }

  /* ---------- MAGNETIC BUTTONS ---------- */
  function initMagnetic() {
    if (isTouch || !hasGSAP) return;
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.4;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * strength;
        const y = (e.clientY - (r.top + r.height / 2)) * strength;
        gsap.to(el, { x, y, duration: 0.5, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' }));
    });
  }

  /* ---------- ACCORDIONS ---------- */
  function initAccordions() {
    document.querySelectorAll('[data-accordion]').forEach(group => {
      const items = group.querySelectorAll('[data-acc-item]');
      items.forEach(item => {
        item.querySelector('[data-acc-head]').addEventListener('click', () => {
          const open = item.classList.contains('open');
          items.forEach(i => i.classList.remove('open'));
          if (!open) item.classList.add('open');
          if (hasGSAP && window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 520);
        });
      });
    });
  }

  /* ---------- GALLERY ---------- */
  function initGallery() {
    const preview = document.querySelector('.gal-preview');
    const img = preview ? preview.querySelector('img') : null;
    const rows = document.querySelectorAll('.gal-row');
    if (preview && !isTouch) {
      let tx = 0, ty = 0, vx = 0, vy = 0, active = false;
      addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
      function follow() {
        vx += (tx - vx) * 0.12; vy += (ty - vy) * 0.12;
        preview.style.transform = 'translate(' + vx + 'px,' + vy + 'px) translate(-50%,-50%) scale(' + (active ? 1 : 0.85) + ')';
        requestAnimationFrame(follow);
      }
      follow();
      rows.forEach(row => {
        row.addEventListener('pointerenter', () => {
          const src = row.getAttribute('data-img');
          if (src && img) img.src = src;
          active = true; preview.style.opacity = 1;
        });
        row.addEventListener('pointerleave', () => { active = false; preview.style.opacity = 0; });
      });
    }
    // tabs
    const tabs = document.querySelectorAll('.gal-tab');
    const panes = document.querySelectorAll('[data-gal-pane]');
    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const k = tab.dataset.galTab;
      panes.forEach(p => p.style.display = p.dataset.galPane === k ? '' : 'none');
      if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
    }));
  }

  /* ---------- THROUGH-LINE ---------- */
  function initThread() {
    const path = document.querySelector('#thread path');
    if (!path || !hasGSAP || reduced) return;
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(path, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.6 }
    });
  }

  /* ---------- CONTACT MODAL ---------- */
  function initContactModal() {
    const modal = document.getElementById('contact-modal');
    if (!modal) return;
    const open = () => {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      if (lenis) lenis.stop();
    };
    const close = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      if (lenis) lenis.start();
    };
    document.querySelectorAll('[data-contact]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); open(); }));
    modal.querySelectorAll('[data-contact-close]').forEach(b => b.addEventListener('click', close));
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
  }

  /* ---------- BOOT ---------- */
  function boot() {
    initLenis();
    initMarquees();
    initCursor();
    initMagnetic();
    initAccordions();
    initGallery();
    initContactModal();
    initReveals();
    initThread();
    // expose nav helpers
    window.__scrollTo = scrollToSel;
    document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => scrollToSel(b.dataset.goto)));
    if (hasGSAP && window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => runPreloader(boot));
  } else {
    runPreloader(boot);
  }
})();
