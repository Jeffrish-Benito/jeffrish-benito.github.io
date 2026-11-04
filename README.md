# G. Jeffrish Benito — Creative Technologist Portfolio

A one-page personal portfolio for G. Jeffrish Benito: developer, 3D modeller, game developer, digital artist, UI/UX designer and bug hunter. It uses plain HTML, CSS and JavaScript — no framework, bundler or build step.

## Highlights

- **Idea Foundry hero.** A continuously animated CSS laboratory scene with a symbolic reactor core, articulated robotic arms, moving fabrication carriage, particles and conveyor. Its surfaces and highlights adapt to the light and dark themes.
- **Seamless ticker.** A rightward marquee that measures its own cycle, expands identical content to cover wide viewports, and loops without gaps or visible resets.
- **Responsive code showcase.** On narrow screens, the editor prioritises readable code, lets long lines scroll horizontally, and removes cramped preview panes.
- **Smooth scroll experience.** Inertial wheel, keyboard and in-page-link scrolling on mouse/trackpad devices, once-only cinematic reveals (rise, slide, scale, curtain wipe) with staggering, and subtle depth parallax. Touch devices keep native scrolling.
- Light/dark themes, responsive layouts, custom cursor, reduced-motion handling for non-essential effects, and the original portfolio sections and content.

## Project layout

```
index.html          ← site entry point at the project root
assets/             ← favicon and static assets
css/style.css       ← design system, layout and themes
css/motion.css      ← interface motion and interaction effects
css/studio.css      ← showcase scenes and idea-foundry hero
css/scrollfx.css    ← reveal variants, wipes, parallax and focus polish
js/script.js        ← theme, navigation, reveal observer and contact configuration
js/hero.js          ← hero-art enhancement
js/motion.js        ← headline effects, interactions and seamless ticker
js/studio.js        ← live code editor animation
js/scrollfx.js      ← reveal variants, parallax and smooth scrolling
netlify.toml        ← publishes the repository root
```

## Run locally

Open `index.html` directly, or start a local server from this directory:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Personalise

Edit the `siteConfig` object near the top of `js/script.js` to set your contact email and your GitHub and HackerOne profile URLs. Until you add real values, those links stay safely inactive instead of opening example destinations.
