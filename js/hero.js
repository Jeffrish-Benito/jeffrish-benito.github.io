/*
 * IDEA FOUNDRY HERO
 * The complete artwork is CSS-driven so it loops smoothly without a canvas,
 * external dependencies, timers, or GPU-heavy particle simulation.
 */
(() => {
  const art = document.getElementById('heroArt');
  if (!art) return;
  art.classList.add('foundry-ready');
  // Keep the descriptive label in sync with the new visual concept.
  art.setAttribute('aria-label', 'An animated miniature idea foundry with a glowing creative reactor, moving robotic arms, and a looping conveyor carrying finished creations.');
})();
