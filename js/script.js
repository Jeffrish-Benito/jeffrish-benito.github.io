/*
  PERSONALISE THIS FILE BEFORE PUBLISHING.
  Add your real email and profile URLs before publishing.
*/
const siteConfig = {
  // Add your real details before publishing. Empty values stay safely disabled.
  contactEmail: 'wimiwimiwimi1324@gmail.com',
  githubUrl: 'https://github.com/Jeffrish-Benito',
  hackerOneUrl: ''
};

(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  const toast = document.getElementById('toast');
  let toastTimer;

  // Light is the designed default. A saved visitor preference takes priority.
  const savedTheme = (() => {
    try { return localStorage.getItem('portfolio-theme'); } catch { return null; }
  })();
  const initialTheme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';

  const setTheme = theme => {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = safeTheme;
    const dark = safeTheme === 'dark';
    const themeToggle = document.getElementById('themeToggle');
    const mobileThemeToggle = document.getElementById('mobileThemeToggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');
    const themeLabel = themeToggle?.querySelector('.theme-label');
    if (themeIcon) themeIcon.textContent = dark ? '☀' : '☾';
    if (themeLabel) themeLabel.textContent = dark ? 'LIGHT MODE' : 'DARK MODE';
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      themeToggle.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
    }
    if (mobileThemeToggle) mobileThemeToggle.textContent = dark ? '☀  SWITCH TO LIGHT THEME' : '☾  SWITCH TO DARK THEME';
    const themeColor = dark ? '#10120f' : '#f4f3ed';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
    try { localStorage.setItem('portfolio-theme', safeTheme); } catch { /* Storage may be unavailable in private contexts. */ }
  };

  setTheme(initialTheme);
  // Theme swaps expand as a circle from the button that was pressed.
  const toggleTheme = event => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reduceMotion) { setTheme(next); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    root.style.setProperty('--vt-x', `${rect.left + rect.width / 2}px`);
    root.style.setProperty('--vt-y', `${rect.top + rect.height / 2}px`);
    document.startViewTransition(() => setTheme(next));
  };
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('mobileThemeToggle')?.addEventListener('click', toggleTheme);

  // Automatically keep the footer year current.
  const yearNode = document.getElementById('currentYear');
  if (yearNode) yearNode.textContent = new Date().getFullYear();

  // Mobile navigation.
  const closeMenu = () => {
    if (!menuToggle || !mobileNav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
  };
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
      mobileNav.classList.toggle('open', !isOpen);
      mobileNav.setAttribute('aria-hidden', String(isOpen));
      document.body.classList.toggle('menu-open', !isOpen);
    });
    mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  }

  // Reveal elements once as they enter the viewport. Items that arrive in the
  // same frame are staggered top-to-bottom, left-to-right. Variants (direction,
  // scale, wipe) and parallax are assigned in js/scrollfx.js.
  const revealItems = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left))
        .forEach((entry, order) => {
          const item = entry.target;
          const delay = Math.min(order * 90, 450);
          item.style.transitionDelay = `${delay}ms`;
          item.classList.add('is-visible');
          revealObserver.unobserve(item);
          // Once the entrance has finished, hand control back to hover/tilt transitions.
          window.setTimeout(() => {
            item.style.transitionDelay = '';
            item.classList.add('reveal-done');
          }, delay + 1800);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealItems.forEach(item => revealObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible', 'reveal-done'));
  }

  // Tiny animated particles orbit the largest headlines without blocking text.
  if (!reduceMotion) {
    const particleLayouts = [
      [4, 10, '✦'], [92, 7, '·'], [84, 88, '✳'], [12, 83, '·'],
      [72, 3, '✧'], [25, 96, '·'], [98, 55, '✦'], [2, 49, '·']
    ];
    document.querySelectorAll('.hero-title, .section-heading h2, .contact-main h2, .about-title').forEach((heading, headingIndex) => {
      const field = document.createElement('span');
      field.className = 'heading-particles';
      field.setAttribute('aria-hidden', 'true');
      particleLayouts.forEach(([x, y, glyph], index) => {
        const particle = document.createElement('span');
        particle.className = `heading-particle${glyph !== '·' ? ' spark' : ''}`;
        if (glyph !== '·') particle.textContent = glyph;
        particle.style.setProperty('--particle-x', `${x}%`);
        particle.style.setProperty('--particle-y', `${y}%`);
        particle.style.setProperty('--particle-size', `${index % 3 === 0 ? 7 : 4}px`);
        particle.style.setProperty('--particle-duration', `${4.6 + ((index + headingIndex) % 4) * 1.15}s`);
        particle.style.setProperty('--particle-delay', `${-((index * .73 + headingIndex * .8) % 6)}s`);
        particle.style.setProperty('--particle-color', index % 3 === 0 ? 'var(--secondary)' : 'var(--accent)');
        field.appendChild(particle);
      });
      heading.appendChild(field);
    });
  }

  // Reading progress line.
  const progress = document.getElementById('scrollProgress');
  let scrollQueued = false;
  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const amount = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    if (progress) progress.style.width = `${Math.min(100, Math.max(0, amount))}%`;
    scrollQueued = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollQueued) {
      window.requestAnimationFrame(updateProgress);
      scrollQueued = true;
    }
  }, { passive: true });
  updateProgress();

  // Friendly toast messages.
  const showToast = message => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3000);
  };

  // Contact actions use only real details supplied in siteConfig.
  const hasRealEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(siteConfig.contactEmail);
  const emailButton = document.getElementById('emailButton');
  const contactArrow = document.getElementById('contactArrow');
  const emailHref = hasRealEmail
    ? `mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent('Let’s create something interesting')}`
    : '#contact';
  const openEmail = () => {
    if (!hasRealEmail) {
      showToast('Add your email address in js/script.js to activate this contact link.');
      return;
    }
    window.location.href = emailHref;
  };
  if (emailButton) {
    emailButton.href = emailHref;
    emailButton.addEventListener('click', event => {
      if (!hasRealEmail) { event.preventDefault(); openEmail(); }
    });
  }
  if (contactArrow) contactArrow.addEventListener('click', openEmail);

  // Keep social links safe until real profile URLs are entered; never send
  // visitors to generic /yourusername placeholders.
  const profileConfig = [
    ['github', siteConfig.githubUrl, 'GitHub'],
    ['hackerOne', siteConfig.hackerOneUrl, 'HackerOne']
  ];
  profileConfig.forEach(([key, url, label]) => {
    const link = document.querySelector(`[data-profile="${key}"]`);
    if (!link) return;
    let validUrl = '';
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' && parsed.hostname) validUrl = parsed.href;
    } catch { /* An empty or invalid URL remains inactive. */ }
    if (validUrl) {
      link.href = validUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else {
      link.href = '#contact';
      link.addEventListener('click', event => {
        event.preventDefault();
        showToast(`Add your ${label} profile URL in js/script.js to activate this link.`);
      });
    }
  });

  // Interactive tilt on engine cards, with touch and reduced-motion fallbacks.
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.transform = `perspective(900px) rotateX(${y * -3.2}deg) rotateY(${x * 3.2}deg) translateY(-3px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  // Custom cursor on pointer devices only.
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorRing = document.querySelector('.cursor-ring');
  if (finePointer && cursorDot && cursorRing && !reduceMotion) {
    document.body.classList.add('has-custom-cursor');
    let pointerX = -100, pointerY = -100, ringX = -100, ringY = -100;
    window.addEventListener('pointermove', event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      cursorDot.style.opacity = '1';
      cursorRing.style.opacity = '1';
      cursorDot.style.transform = `translate(${pointerX - 2.5}px, ${pointerY - 2.5}px)`;
    }, { passive: true });
    const moveRing = () => {
      ringX += (pointerX - ringX) * .16;
      ringY += (pointerY - ringY) * .16;
      cursorRing.style.transform = `translate(${ringX - 16.5}px, ${ringY - 16.5}px)`;
      window.requestAnimationFrame(moveRing);
    };
    moveRing();
    document.querySelectorAll('a, button, .model-stage').forEach(element => {
      element.addEventListener('pointerenter', () => { cursorRing.style.width = '49px'; cursorRing.style.height = '49px'; });
      element.addEventListener('pointerleave', () => { cursorRing.style.width = '33px'; cursorRing.style.height = '33px'; });
    });
    document.addEventListener('pointerleave', () => { cursorDot.style.opacity = '0'; cursorRing.style.opacity = '0'; });
  }

  // The hero artwork lives in js/hero.js; section motion lives in js/motion.js.
})();
