/*
  SCROLL EXPERIENCE
  1. Reveal variants and curtain wipes (the observer itself lives in script.js).
  2. Gentle depth parallax.
  3. Inertial smooth scrolling for wheel, keyboard and in-page links.
  Touch devices keep native momentum scrolling (with smooth in-page links). Reduced-motion visitors get
  the reveals and smooth scrolling in a gentler form, but no parallax.
*/
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  // ---------- 1. Reveal variants. Declared here so index.html stays clean.
  const variants = [
    ['.about-title', 'left'], ['.about-copy', 'right'],
    ['.capability-list', 'left'], ['.toolbox', 'right'],
    ['.contact-main', 'left'], ['.contact-action-card', 'right'],
    ['.model-feature', 'scale'], ['.hero-art', 'scale'], ['.proof-strip', 'scale'],
    ['.hero-meta', 'fade']
  ];
  variants.forEach(([selector, kind]) => document.querySelectorAll(selector).forEach(el => {
    if (el.classList.contains('reveal')) el.dataset.reveal = kind;
  }));
  document.querySelectorAll('.engine-visual, .model-stage').forEach(el => el.classList.add('wipe'));

  // ---------- 2. Parallax. The offset is measured from each item's parent,
  // which the item's own translation never affects, so there is no feedback.
  const wide = window.matchMedia('(min-width: 901px)');
  const parallax = [
    ['.engine-card:nth-child(1)', .04], ['.engine-card:nth-child(3)', .04],
    ['.about-title', .05], ['.about-copy', -.03],
    ['.contact-action-card', .05]
  ];
  const parallaxItems = [];
  // Parallax is the one effect we skip when the visitor asks for reduced motion.
  if (!reduceMotion)
  parallax.forEach(([selector, speed]) => document.querySelectorAll(selector).forEach(el => {
    el.setAttribute('data-parallax', '');
    parallaxItems.push({ el, parent: el.parentElement, speed });
  }));
  const updateParallax = () => {
    const mid = window.innerHeight / 2;
    parallaxItems.forEach(({ el, parent, speed }) => {
      if (!wide.matches) { el.style.removeProperty('--py'); return; }
      const rect = parent.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      const offset = Math.max(-60, Math.min(60, (rect.top + rect.height / 2 - mid) * speed));
      el.style.setProperty('--py', `${offset.toFixed(1)}px`);
    });
  };
  let parallaxQueued = false;
  window.addEventListener('scroll', () => {
    if (parallaxQueued) return;
    parallaxQueued = true;
    requestAnimationFrame(() => { parallaxQueued = false; updateParallax(); });
  }, { passive: true });
  window.addEventListener('resize', updateParallax, { passive: true });
  updateParallax();

  // ---------- 3. Smooth scrolling (mouse and trackpad devices only).
  if (!finePointer) return;
  root.classList.add('has-smooth-scroll');

  const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);
  const clamp = value => Math.max(0, Math.min(maxScroll(), value));
  const HALF_LIFE = 0.085; // seconds for the remaining distance to halve — lower is snappier
  let target = window.scrollY, current = window.scrollY, lastWritten = window.scrollY, frame = 0, lastTime = 0;
  const recent = []; // positions we wrote lately; scroll events can arrive a frame or two late
  let anchor = null; // section being scrolled to; re-measured each frame because content above may still be growing

  const step = now => {
    const dt = Math.max(.001, Math.min(.05, (now - lastTime) / 1000 || .016)); // rAF timestamps can precede performance.now()
    lastTime = now;
    if (anchor) target = anchor.top();
    target = clamp(target);
    const ease = 1 - Math.pow(.5, dt / HALF_LIFE);
    current += (target - current) * ease;
    if (Math.abs(target - current) < .4) current = target;
    lastWritten = current;
    recent.push(current);
    if (recent.length > 6) recent.shift();
    window.scrollTo(0, current);
    frame = current === target ? 0 : requestAnimationFrame(step);
  };
  const run = () => { if (!frame) { lastTime = performance.now(); frame = requestAnimationFrame(step); } };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; anchor = null; recent.length = 0; target = current = lastWritten = window.scrollY; };

  // If the position changes for any reason other than us (scrollbar drag,
  // Tab focus, find-in-page, history), adopt it instead of fighting it.
  window.addEventListener('scroll', () => {
    if (frame && (window.scrollY < Math.min(...recent) - 3 || window.scrollY > Math.max(...recent) + 3)) stop();
    else if (!frame) target = current = lastWritten = window.scrollY;
  }, { passive: true });

  // Let nested scrollers (code editor panes, menus) use the wheel first.
  const nestedScroller = (node, dy) => {
    for (let el = node; el && el !== document.body && el !== root; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (!/(auto|scroll)/.test(style.overflowY) || el.scrollHeight <= el.clientHeight + 1) continue;
      if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
    }
    return false;
  };

  window.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || event.defaultPrevented || document.body.classList.contains('menu-open')) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (nestedScroller(event.target, event.deltaY)) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 34 : event.deltaMode === 2 ? window.innerHeight : 1;
    anchor = null;
    if (!frame) target = current = window.scrollY;
    target = clamp(target + event.deltaY * unit);
    run();
  }, { passive: false });

  const typing = el => el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || typing(event.target)) return;
    if (/^(BUTTON|A)$/.test(event.target.tagName) && (event.key === ' ' || event.key === 'Enter')) return;
    const page = window.innerHeight * .88;
    const moves = { ArrowDown: 90, ArrowUp: -90, PageDown: page, PageUp: -page, Home: -Infinity, End: Infinity };
    let delta = moves[event.key];
    if (event.key === ' ') delta = event.shiftKey ? -page : page;
    if (delta === undefined) return;
    event.preventDefault();
    anchor = null;
    if (!frame) target = current = window.scrollY;
    target = clamp(Number.isFinite(delta) ? target + delta : (delta < 0 ? 0 : maxScroll()));
    run();
  });

  // In-page links glide to their section, respecting the fixed header.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const hash = link.getAttribute('href');
    if (hash.length < 2) return;
    const section = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!section) return;
    event.preventDefault();
    const offset = hash === '#top' ? 0 : parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    if (!frame) target = current = window.scrollY;
    anchor = { top: () => section.getBoundingClientRect().top + window.scrollY - offset };
    target = clamp(anchor.top());
    history.pushState(null, '', hash);
    run();
  });
})();
