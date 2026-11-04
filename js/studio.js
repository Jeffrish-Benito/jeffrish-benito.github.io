/*
  STUDIO LAYER: the live code editor in the showcase and the "running"
  engine editor thumbnails.
  - The editor types three real-looking files in a loop. Each one has its own
    syntax colours, line numbers, minimap, terminal output and live preview.
  - The engine thumbnails move the player, satellites and sequencer playhead
    from JS so the inspector values stay in sync with what you see.
  Everything pauses off-screen and stays static under reduced motion.
*/
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  /* ---------------------------------------------------------------
     1. Live code editor
     --------------------------------------------------------------- */
  const FILES = [
    {
      name: 'world.ts', path: 'src › world.ts › buildWorld', lang: 'TypeScript', obj: 'Orbit System',
      log: ['✓ world.ts compiled in 142ms', 'hmr update → scene rebuilt'],
      kw: ['import', 'from', 'export', 'function', 'const', 'let', 'new', 'return', 'number'],
      code: [
        "import { Scene, Orbit } from './engine';",
        '',
        'export function buildWorld(seed: number) {',
        '  const scene = new Scene({ fog: 0.12 });',
        '  const core = scene.add(new Orbit(3, seed));',
        '',
        '  scene.onFrame((dt) => {',
        '    core.rotate(0.6 * dt);',
        '    core.glow = Math.sin(scene.time);',
        '  });',
        '  return scene;',
        '}'
      ]
    },
    {
      name: 'aurora.glsl', path: 'src › shaders › aurora.glsl › main', lang: 'GLSL', obj: 'Aurora Material',
      log: ['✓ aurora.glsl linked · 0 warnings', 'gpu → 2 uniforms bound'],
      kw: ['uniform', 'varying', 'void', 'float', 'vec2', 'vec3', 'vec4'],
      code: [
        '// a soft aurora that drifts with time',
        'uniform float uTime;',
        'varying vec2 vUv;',
        '',
        'void main() {',
        '  vec2 p = vUv - 0.5;',
        '  float r = length(p) * 2.0;',
        '  float a = atan(p.y, p.x) + uTime;',
        '  vec3 col = mix(uAccent, uWarm, sin(a * 3.0));',
        '  col *= smoothstep(1.0, 0.2, r);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ]
    },
    {
      name: 'player.gd', path: 'src › game › player.gd › _physics_process', lang: 'GDScript', obj: 'Player',
      log: ['✓ player.gd parsed · scene reloaded', 'physics → 60 ticks/s'],
      kw: ['extends', 'var', 'func', 'if', 'and', 'export'],
      code: [
        'extends CharacterBody2D',
        '',
        '@export var speed := 220.0',
        '@export var jump := -420.0',
        '',
        'func _physics_process(delta):',
        '  velocity.y += gravity * delta',
        '  if is_on_floor() and Input.is_action_pressed("jump"):',
        '    velocity.y = jump',
        '  velocity.x = Input.get_axis("left", "right") * speed',
        '  move_and_slide()',
        ''
      ]
    }
  ];

  // Small tokenizer: comments, strings, numbers, keywords, types, calls.
  const tokenize = (line, kw) => {
    const out = [];
    const re = /(\/\/.*$)|("[^"]*"|'[^']*')|(@\w+)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;
    let m;
    while ((m = re.exec(line))) {
      const [t, com, str, ann, num, word, space] = m;
      if (com) out.push(['com', t]);
      else if (str) out.push(['str', t]);
      else if (ann) out.push(['kw', t]);
      else if (num) out.push(['num', t]);
      else if (word) {
        const next = line[re.lastIndex];
        if (kw.includes(word)) out.push(['kw', t]);
        else if (next === '(') out.push(['fn', t]);
        else if (/^[A-Z]/.test(word)) out.push(['type', t]);
        else if (line[m.index - 1] === '.') out.push(['prop', t]);
        else out.push(['id', t]);
      } else if (space) out.push(['', t]);
      else out.push(['pun', t]);
    }
    return out;
  };

  const stage = $('codeStage');
  const codeNode = $('ideCode');
  if (stage && codeNode) {
    const gutter = $('ideGutter');
    const minimap = $('ideMinimap');
    const crumbs = $('ideCrumbs');
    const langNode = $('ideLang');
    const cursorNode = $('ideCursor');
    const logNode = $('ideLog');
    const preview = $('idePreview');
    const objNode = $('ideObj');
    const stateNode = $('ideState');
    const fpsNode = $('ideFps');
    const tabs = [...stage.querySelectorAll('.ide-tab')];
    const treeFiles = [...stage.querySelectorAll('.ide-tree .file[data-file]')];
    const tokens = FILES.map(f => f.code.map(line => tokenize(line, f.kw)));

    let file = 0, line = 0, tok = 0, ch = 0, timer = 0, visible = false, running = false;
    let lineEl = null, spanEl = null, caret = null;

    const setState = (text, ok) => {
      stateNode.textContent = text;
      stateNode.classList.toggle('ok', ok);
      stateNode.classList.toggle('warn', !ok);
    };
    const pushLog = (text, cls = '') => {
      const p = document.createElement('p');
      p.className = cls;
      p.textContent = text;
      logNode.appendChild(p);
      while (logNode.children.length > 4) logNode.firstElementChild.remove();
    };
    const newLine = () => {
      lineEl = document.createElement('span');
      lineEl.className = 'ln';
      codeNode.appendChild(lineEl);
      const n = document.createElement('li');
      n.textContent = String(codeNode.children.length);
      gutter.appendChild(n);
      const bar = document.createElement('i');
      const len = FILES[file].code[line]?.length || 0;
      const indent = (FILES[file].code[line] || '').search(/\S|$/);
      bar.style.width = `${Math.min(100, len * 1.6)}%`;
      bar.style.marginLeft = `${indent * 3}%`;
      minimap.appendChild(bar);
      [...codeNode.children].forEach(c => c.classList.remove('cur'));
      lineEl.classList.add('cur');
      if (caret) lineEl.appendChild(caret);
    };
    const openFile = index => {
      file = index; line = 0; tok = 0; ch = 0; spanEl = null;
      codeNode.textContent = '';
      gutter.textContent = '';
      minimap.querySelectorAll('i').forEach(n => n.remove());
      tabs.forEach((t, i) => t.classList.toggle('active', i === index));
      treeFiles.forEach(t => t.classList.toggle('active', Number(t.dataset.file) === index));
      crumbs.textContent = FILES[index].path;
      langNode.textContent = FILES[index].lang;
      objNode.textContent = FILES[index].obj;
      preview.dataset.scene = String(index);
      preview.classList.remove('live');
      stage.dataset.file = String(index);
      setState('● compiling', false);
      newLine();
    };
    const finishFile = () => {
      preview.classList.add('live');
      setState('● running', true);
      const [a, b] = FILES[file].log;
      pushLog(a, 'ok');
      pushLog(b, 'dim');
    };
    const renderAll = index => {
      openFile(index);
      tokens[index].forEach((lineTokens, li) => {
        if (li) { line = li; newLine(); }
        lineTokens.forEach(([cls, text]) => {
          const s = document.createElement('span');
          if (cls) s.className = cls;
          s.textContent = text;
          lineEl.insertBefore(s, caret && caret.parentNode === lineEl ? caret : null);
        });
      });
      finishFile();
    };

    // One typing step. Speed varies a little so it reads as a person typing.
    const step = () => {
      timer = 0;
      if (!visible || document.hidden) { running = false; return; }
      const lines = tokens[file];
      if (line >= lines.length) {
        finishFile();
        timer = setTimeout(() => { openFile((file + 1) % FILES.length); step(); }, 3400);
        return;
      }
      const lineTokens = lines[line];
      if (tok >= lineTokens.length) {
        line++; tok = 0; ch = 0; spanEl = null;
        if (line < lines.length) newLine();
        timer = setTimeout(step, 110 + Math.random() * 90);
        return;
      }
      const [cls, text] = lineTokens[tok];
      if (!spanEl) {
        spanEl = document.createElement('span');
        if (cls) spanEl.className = cls;
        lineEl.insertBefore(spanEl, caret);
      }
      // Whitespace and punctuation land faster than words.
      const burst = cls === '' ? text.length : 1;
      spanEl.textContent += text.slice(ch, ch + burst);
      ch += burst;
      const col = lineEl.textContent.length + 1;
      cursorNode.textContent = `Ln ${line + 1}, Col ${col}`;
      if (ch >= text.length) { tok++; ch = 0; spanEl = null; }
      timer = setTimeout(step, cls === '' ? 20 : 22 + Math.random() * 38);
    };
    const start = () => { if (!running && !reduceMotion) { running = true; step(); } };

    tabs.forEach((tab, i) => tab.addEventListener('click', () => {
      clearTimeout(timer); timer = 0; running = false;
      if (reduceMotion) { renderAll(i); return; }
      openFile(i);
      start();
    }));

    if (reduceMotion) {
      renderAll(0);
    } else {
      caret = document.createElement('b');
      caret.className = 'caret';
      openFile(0);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
          visible = entries[0].isIntersecting;
          if (visible) start();
        }, { threshold: .15 }).observe(stage);
      } else { visible = true; start(); }
      document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) start(); });
      setInterval(() => {
        if (visible && fpsNode) fpsNode.textContent = String(58 + Math.round(Math.random() * 2));
      }, 700);
    }
  }

  /* ---------------------------------------------------------------
     2. Engine editor thumbnails
     --------------------------------------------------------------- */
  const section = $('engines');
  const gdPlayer = $('gdPlayer');
  if (!section || !gdPlayer || reduceMotion) return;

  const nodes = {
    gdX: $('gdPosX'), gdY: $('gdPosY'), gdVel: $('gdVel'),
    satA: $('unSatA'), satB: $('unSatB'), rotY: $('unRotY'),
    playhead: $('uePlayhead'), frame: $('ueFrame'), pitch: $('uePitch'),
    intBar: $('ueIntBar'), intText: $('ueInt'), fps: $('ueFps')
  };
  const tri = t => { const f = t - Math.floor(t); return f < .5 ? f * 2 : 2 - f * 2; };
  let raf = 0, onScreen = false, lastText = 0;

  const frame = now => {
    raf = 0;
    if (!onScreen || document.hidden) return;
    const t = now / 1000;
    const updateText = now - lastText > 90;
    if (updateText) lastText = now;

    // Godot: the player runs back and forth and hops on a rhythm.
    const p = tri(t / 7);
    const x = 116 + p * 160;
    const dir = (t / 7) % 1 < .5 ? 1 : -1;
    const hopT = (t / 1.15) % 1;
    const hop = hopT < .55 ? Math.sin(Math.PI * hopT / .55) : 0;
    const y = 152 - hop * 30;
    gdPlayer.setAttribute('transform', dir > 0
      ? `translate(${x.toFixed(1)} ${y.toFixed(1)})`
      : `translate(${(x + 14).toFixed(1)} ${y.toFixed(1)}) scale(-1 1)`);
    if (updateText) {
      nodes.gdX.textContent = x.toFixed(0);
      nodes.gdY.textContent = y.toFixed(0);
      const vy = hopT < .55 ? Math.round(-420 * Math.cos(Math.PI * hopT / .55)) : 0;
      nodes.gdVel.textContent = `(${dir * 220}, ${vy})`;
    }

    // Unity: two satellites orbit the selected system.
    const a = t * .9;
    nodes.satA.setAttribute('cx', (193 + Math.cos(a) * 62).toFixed(1));
    nodes.satA.setAttribute('cy', (98 + Math.sin(a) * 20).toFixed(1));
    nodes.satA.setAttribute('opacity', Math.sin(a) < 0 ? '.45' : '1');
    const b = -t * 1.3, ex = Math.cos(b) * 44, ey = Math.sin(b) * 34, rot = -28 * Math.PI / 180;
    nodes.satB.setAttribute('cx', (193 + ex * Math.cos(rot) - ey * Math.sin(rot)).toFixed(1));
    nodes.satB.setAttribute('cy', (98 + ex * Math.sin(rot) + ey * Math.cos(rot)).toFixed(1));
    if (updateText) nodes.rotY.textContent = ((a * 180 / Math.PI) % 360).toFixed(0);

    // Unreal: the sequencer plays the shot and the sun light follows it.
    const shot = (t / 9) % 1;
    nodes.playhead.setAttribute('transform', `translate(${(70 + shot * 216).toFixed(1)} 0)`);
    const intensity = 6 + Math.sin(shot * Math.PI) * 6;
    nodes.intBar.setAttribute('width', (14 + intensity * 4).toFixed(1));
    if (updateText) {
      nodes.frame.textContent = `${String(Math.round(shot * 240)).padStart(4, '0')} / 0240`;
      nodes.pitch.textContent = (-4 - shot * 24).toFixed(0);
      nodes.intText.textContent = `${intensity.toFixed(1)} lux`;
      if (Math.random() < .08) nodes.fps.textContent = `${(118 + Math.random() * 3).toFixed(1)} FPS`;
    }
    raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!raf && onScreen) raf = requestAnimationFrame(frame); };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      onScreen = entries[0].isIntersecting;
      wake();
    }, { threshold: .05 }).observe(section);
  } else { onScreen = true; wake(); }
  document.addEventListener('visibilitychange', wake);
})();
