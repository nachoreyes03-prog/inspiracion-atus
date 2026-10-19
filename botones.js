/* Botones: tooltips that pour out of the button like liquid, then slide and resize
   between neighbouring buttons. No dependencies.

   Markup:
     <div class="pour" data-pour>       (data-pour="below": tooltips under the buttons;
                                        "contain": tooltips stay inside the group box, e.g. a card)
       <button class="pour-btn" data-tip="Copiar link">Compartir</button>
       <button class="pour-btn icon" data-tip="Buscar" aria-label="Buscar">…svg…</button>
     </div>
   A lone <button data-tip="…"> outside a [data-pour] group gets its own group.
   Buttons added later are picked up automatically (MutationObserver).
   Colors: the tooltip uses the button's --pour-color / --pour-text when set (CSS custom
   properties, so they can follow a theme), otherwise the button's background and white. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;
  var mk = function (cls) { var s = document.createElement('span'); s.className = cls; return s; };
  var later = function (fn, ms) { return window.setTimeout(fn, ms || 16); };

  // The "goo" filter: blur + alpha threshold, so shapes that get close melt into one
  function ensureFilter() {
    if (document.getElementById('pour-goo')) return;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    // The liquid layer already reaches up (or down) to where the tooltip goes, so the
    // region only needs room for the blur vertically and for wide tooltips sideways
    svg.innerHTML = '<filter id="pour-goo" x="-100%" y="-15%" width="300%" height="130%" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>' +
      '<feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"/></filter>';
    document.body.appendChild(svg);
  }

  function cssNum(el, name, fallback) {
    var v = parseFloat(getComputedStyle(el).getPropertyValue(name));
    return isNaN(v) ? fallback : v;
  }
  function colorsOf(b) {
    var cs = getComputedStyle(b);
    var c = cs.getPropertyValue('--pour-color').trim();
    if (!c) {
      c = cs.backgroundColor;
      if (!c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c)) c = '#141414';
    }
    return { bg: c, text: cs.getPropertyValue('--pour-text').trim() || '#fff' };
  }
  // data-pour holds space-separated options: "below", "contain"
  function has(group, opt) { return (' ' + (group.getAttribute('data-pour') || '') + ' ').indexOf(' ' + opt + ' ') >= 0; }
  function rectIn(group, el) {
    var g = group.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height };
  }
  function place(node, x, y, w, h) {
    node.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    node.style.width = w + 'px';
    node.style.height = h + 'px';
  }

  function setup(group) {
    if (group.__pour) return;
    ensureFilter();
    group.classList.add('pour-group');
    var layer = mk('pour-goo'), src = mk('pour-src'), bg = mk('pour-bg'), tip = mk('pour-tip'), measure = mk('pour-tip pour-measure');
    layer.setAttribute('aria-hidden', 'true');
    measure.setAttribute('aria-hidden', 'true');
    tip.id = 'pour-tip-' + (++uid);
    tip.setAttribute('role', 'tooltip');
    layer.appendChild(src);
    layer.appendChild(bg);
    group.insertBefore(layer, group.firstChild);
    group.appendChild(tip);
    group.appendChild(measure);
    var st = { group: group, layer: layer, src: src, bg: bg, tip: tip, measure: measure, active: null, shown: false, timer: 0 };
    group.__pour = st;

    group.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'touch') return; // no tooltips on phones: tapping just acts
      var b = e.target.closest && e.target.closest('[data-tip]');
      if (b && group.contains(b)) show(st, b);
    });
    group.addEventListener('pointerleave', function () { hide(st); });
    group.addEventListener('focusin', function (e) {
      var b = e.target.closest && e.target.closest('[data-tip]');
      if (b && group.contains(b) && b.matches(':focus-visible')) show(st, b);
    });
    group.addEventListener('focusout', function (e) { if (!group.contains(e.relatedTarget)) hide(st); });
    group.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(st); });
  }

  function setLabel(st, text, entering) {
    var old = st.tip.querySelector('.pour-label:not(.pour-out)');
    if (old && old.textContent === text) return;
    if (old) { old.classList.add('pour-out'); later(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 400); }
    var s = mk('pour-label' + (entering ? ' pour-late' : ''));
    s.textContent = text;
    st.tip.appendChild(s);
    later(function () { s.classList.add('pour-in'); });
  }

  // Where the drop hides inside the button: the edge that faces the tooltip
  function dropRect(r, w, h, below) {
    var dw = Math.min(w, r.w * 0.6), dh = Math.min(h, r.h - 4);
    return { x: r.x + r.w / 2 - dw / 2, y: below ? r.y + r.h - dh - 2 : r.y + 2, w: dw, h: dh };
  }

  function show(st, b) {
    clearTimeout(st.timer);
    var text = b.getAttribute('data-tip');
    // Disabled buttons don't pour (Chrome still sends them pointer events)
    if (b.disabled || b.getAttribute('aria-disabled') === 'true') { hide(st); return; }
    if (!text || (st.active === b && st.shown)) return;
    var col = colorsOf(b);
    // The tooltip takes the button's own color, so it reads as coming out of it
    st.group.style.setProperty('--pour-color', col.bg);
    st.group.style.setProperty('--pour-text', col.text);
    st.measure.textContent = text;
    var m = { w: st.measure.offsetWidth, h: st.measure.offsetHeight };
    var r = rectIn(st.group, b);
    var gap = cssNum(st.group, '--pour-gap', 10);
    var below = has(st.group, 'below');
    var x = Math.round(r.x + r.w / 2 - m.w / 2), y = Math.round(below ? r.y + r.h + gap : r.y - gap - m.h);
    // "contain": stay inside the group box (a card), so it never slides under the next one
    var gw = st.group.offsetWidth;
    if (has(st.group, 'contain') && m.w <= gw) x = Math.max(0, Math.min(x, gw - m.w));
    // Keep it on screen: a button near the edge gets its tooltip nudged inwards
    var gl = st.group.getBoundingClientRect().left, vw = document.documentElement.clientWidth;
    x = Math.round(Math.max(8 - gl, Math.min(x, vw - 8 - gl - m.w)));
    var entering = !st.shown;

    place(st.src, r.x, r.y, r.w, r.h);
    st.src.style.borderRadius = getComputedStyle(b).borderRadius;
    if (entering) {
      // Start as a drop hidden inside the button, then rise out of it
      var d = dropRect(r, m.w, m.h, below);
      st.group.classList.add('pour-snap');
      place(st.bg, d.x, d.y, d.w, d.h);
      place(st.tip, x, y, m.w, m.h);
      void st.bg.offsetWidth; // apply the start position before animating
      st.group.classList.remove('pour-snap');
    }
    // Already open: a quicker slide and resize to the new button
    st.bg.classList.toggle('moving', !entering);
    place(st.bg, x, y, m.w, m.h);
    place(st.tip, x, y, m.w, m.h);
    setLabel(st, text, entering);
    if (st.active && st.active !== b) st.active.removeAttribute('aria-describedby');
    b.setAttribute('aria-describedby', st.tip.id);
    st.active = b;
    st.shown = true;
    st.group.classList.add('pour-on');
  }

  function hide(st) {
    if (!st.shown) return;
    var b = st.active;
    st.bg.classList.remove('moving');
    if (b && b.isConnected) {
      // Pour back into the button it came from
      var r = rectIn(st.group, b);
      var d = dropRect(r, parseFloat(st.bg.style.width) || r.w, parseFloat(st.bg.style.height) || r.h, has(st.group, 'below'));
      place(st.bg, d.x, d.y, d.w, d.h);
      b.removeAttribute('aria-describedby');
    }
    var lab = st.tip.querySelector('.pour-label:not(.pour-out)');
    if (lab) { lab.classList.add('pour-out'); later(function () { if (lab.parentNode) lab.parentNode.removeChild(lab); }, 400); }
    st.shown = false;
    st.group.classList.remove('pour-on');
    st.timer = later(function () { if (!st.shown) st.active = null; }, 500);
  }

  function init(root) {
    root = root || document;
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    var groups = [].slice.call(root.querySelectorAll('[data-pour]'));
    if (root.matches && root.matches('[data-pour]')) groups.unshift(root);
    for (var i = 0; i < groups.length; i++) setup(groups[i]);
    var tips = [].slice.call(root.querySelectorAll('[data-tip]'));
    if (root.matches && root.matches('[data-tip]')) tips.unshift(root);
    for (var j = 0; j < tips.length; j++) {
      var b = tips[j];
      if (!b.parentNode || b.closest('[data-pour]')) continue;
      var wrap = document.createElement('span');
      wrap.className = 'pour-solo';
      wrap.setAttribute('data-pour', '');
      b.parentNode.insertBefore(wrap, b);
      wrap.appendChild(b);
      setup(wrap);
    }
  }

  function start() {
    init(document);
    // Pick up buttons rendered later (cards, panels…)
    if (window.MutationObserver) {
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var added = list[i].addedNodes;
          for (var k = 0; k < added.length; k++) if (added[k].nodeType === 1 && !/\bpour-/.test(added[k].className || '')) init(added[k]);
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  window.Botones = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
