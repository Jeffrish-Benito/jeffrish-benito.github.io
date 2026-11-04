/*
  MOTION LAYER — gives every section its own movement:
  split-letter headlines, scrambled mono labels, staggered lists,
  a count-up stat, magnetic buttons, scroll-reactive hero and ticker,
  and an active-section indicator in the navigation.
*/
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  // ---------- 1. Split headlines into animated characters.
  const SKIP = '.heading-outline, .contact-word, .heading-particles, .accent-period';
  const splitHeading = heading => {
    const clone = heading.cloneNode(true);
    clone.querySelectorAll('.heading-particles').forEach(n => n.remove());
    heading.setAttribute('aria-label', clone.textContent.replace(/\s+/g, ' ').trim());
    let index = 0;
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.parentElement.closest(SKIP) || !node.textContent.trim()
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const word = document.createElement('span');
        word.className = 'split-word';
        word.setAttribute('aria-hidden', 'true');
        [...part].forEach(ch => {
          const c = document.createElement('span');
          c.className = 'char';
          c.textContent = ch;
          c.style.setProperty('--ci', String(index++));
          word.appendChild(c);
        });
        frag.appendChild(word);
      });
      node.replaceWith(frag);
    });
    // Outline / contact words still need an accessible reading via the aria-label above.
    heading.querySelectorAll('.heading-outline, .contact-word, .accent-period').forEach(n => n.setAttribute('aria-hidden', 'true'));
  };
  if (!reduceMotion) {
    document.querySelectorAll('.hero-title, .section-heading h2, .about-title, .capabilities-head h2, .contact-main h2, .model-copy h3').forEach(splitHeading);
  }

  // ---------- 2. Staggered children.
  document.querySelectorAll('.capability-list, .tool-grid, .model-skills').forEach(list => {
    list.classList.add('stagger');
    [...list.children].forEach((child, i) => child.style.setProperty('--si', String(i)));
  });

  // ---------- 3. Scramble mono labels when they enter the viewport.
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_+*#';
  const scramble = el => {
    if (el.dataset.scrambling === '1') return;
    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
    if (!nodes.length) return;
    const originals = nodes.map(n => n.__original || (n.__original = n.textContent));
    el.dataset.scrambling = '1';
    const start = performance.now(), dur = 750;
    const tick = now => {
      const p = Math.min(1, (now - start) / dur);
      nodes.forEach((n, k) => {
        const text = originals[k];
        const keep = Math.floor(text.length * p);
        let out = text.slice(0, keep);
        for (let i = keep; i < text.length; i++) {
          const ch = text[i];
          out += /[\s•/→↗↘—.,:]/.test(ch) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        n.textContent = out;
      });
      if (p < 1) requestAnimationFrame(tick);
      else { nodes.forEach((n, k) => { n.textContent = originals[k]; }); el.dataset.scrambling = '0'; }
    };
    requestAnimationFrame(tick);
  };
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const scrambleTargets = document.querySelectorAll('.eyebrow, .mono-label, .project-number, .engine-visual-tag, .visual-footnote span, .model-topline > span:first-child, .contact-pretitle, .about-signature span, .toolbox-head span');
    const so = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) scramble(entry.target); });
    }, { threshold: .6 });
    scrambleTargets.forEach(t => so.observe(t));
  }

  // ---------- 4. Count-up statistic.
  document.querySelectorAll('.count-up').forEach(node => {
    const target = Number(node.dataset.count || node.textContent) || 0;
    if (reduceMotion || !('IntersectionObserver' in window)) { node.textContent = String(target); return; }
    node.textContent = '0';
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) { node.textContent = '0'; return; }
        const start = performance.now(), dur = 1700;
        const tick = now => {
          const p = Math.min(1, (now - start) / dur);
          node.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 4))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: .6 });
    io.observe(node);
  });

  // ---------- 5. Magnetic buttons.
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.button, .header-cta, .contact-arrow, .theme-toggle').forEach(el => {
      el.classList.add('magnetic');
      const strength = el.classList.contains('contact-arrow') ? .4 : .25;
      el.addEventListener('pointermove', event => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${((event.clientX - r.left - r.width / 2) * strength).toFixed(1)}px`);
        el.style.setProperty('--my', `${((event.clientY - r.top - r.height / 2) * strength).toFixed(1)}px`);
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
    });
  }

  // ---------- 6. Scroll-reactive header, hero, and ticker.
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  const ticker = document.getElementById('ticker');

  // Build a gap-free rightward marquee. A full repeat is measured in pixels,
  // then mirrored exactly; add repeats when the viewport is wider than the text.
  if (ticker) {
    const track = ticker.querySelector('.ticker-track');
    const groups = track ? [...track.querySelectorAll('.ticker-group')] : [];
    const first = groups[0], second = groups[1];
    if (track && first && second) {
      const seed = [...first.children].map(node => node.cloneNode(true));
      let resizeFrame = 0;
      const rebuildTicker = () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          first.replaceChildren(...seed.map(node => node.cloneNode(true)));
          const minimumWidth = ticker.clientWidth + 96;
          let passes = 0;
          while (first.scrollWidth < minimumWidth && passes < 24) {
            seed.forEach(node => first.appendChild(node.cloneNode(true)));
            passes++;
          }
          second.replaceChildren(...[...first.children].map(node => node.cloneNode(true)));
          const cycleWidth = first.getBoundingClientRect().width;
          track.style.setProperty('--ticker-cycle', `${cycleWidth}px`);
          // Keep a measured, consistent pixel speed across small and wide screens.
          track.style.setProperty('--ticker-duration', `${Math.max(18, cycleWidth / 48)}s`);
          track.style.animation = 'none';
          void track.offsetWidth;
          track.style.animation = '';
        });
      };
      rebuildTicker();
      if ('ResizeObserver' in window) {
        const tickerObserver = new ResizeObserver(rebuildTicker);
        tickerObserver.observe(ticker);
      } else {
        let resizeTimer;
        window.addEventListener('resize', () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(rebuildTicker, 140);
        }, { passive: true });
      }
    }
  }

  let lastY = window.scrollY, skew = 0, queued = false, settling = 0;
  const onFrame = () => {
    queued = false;
    const y = window.scrollY;
    header?.classList.toggle('scrolled', y > 24);
    if (!reduceMotion) {
      if (hero) {
        const h = hero.offsetHeight || 1;
        hero.style.setProperty('--hero-scroll', Math.min(1, Math.max(0, y / h)).toFixed(3));
      }
      const v = y - lastY;
      skew += (Math.max(-7, Math.min(7, -v * .18)) - skew) * .3;
      ticker?.style.setProperty('--skew', `${skew.toFixed(2)}deg`);
      if (Math.abs(skew) > .05 && settling++ < 60) { queued = true; requestAnimationFrame(onFrame); }
    }
    lastY = y;
  };
  window.addEventListener('scroll', () => {
    settling = 0;
    if (!queued) { queued = true; requestAnimationFrame(onFrame); }
  }, { passive: true });
  onFrame();

  // ---------- 7. Active section in the navigation.
  const links = [...document.querySelectorAll('.desktop-nav a')];
  if ('IntersectionObserver' in window && links.length) {
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const nav = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const link = map.get(entry.target.id);
        if (link && entry.isIntersecting) { links.forEach(l => l.classList.remove('active')); link.classList.add('active'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) nav.observe(s); });
  }

  // ---------- 8. Spotlight glow follows the pointer inside the code stage.
  const stage = document.getElementById('codeStage');
  if (stage && finePointer && !reduceMotion) {
    stage.addEventListener('pointermove', event => {
      const r = stage.getBoundingClientRect();
      stage.style.setProperty('--cx', `${event.clientX - r.left}px`);
      stage.style.setProperty('--cy', `${event.clientY - r.top}px`);
    });
  }
})();
