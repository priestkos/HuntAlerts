/**
 * In-page walkthrough helpers (injected during video render only).
 */
(function () {
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  }

  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function ensureCursor() {
    if (document.getElementById('wt-cursor')) {
      return;
    }
    const cursor = document.createElement('div');
    cursor.id = 'wt-cursor';
    cursor.className = 'wt-cursor';
    cursor.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">' +
      '<path d="M4 2 L4 22 L10 16 L14 24 L17 22 L13 14 L20 14 Z" fill="#fff" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/></svg>';
    document.body.appendChild(cursor);

    const ripples = document.createElement('div');
    ripples.id = 'wt-ripples';
    ripples.className = 'wt-ripples';
    document.body.appendChild(ripples);

    let overlay = document.getElementById('wt-scene-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'wt-scene-overlay';
      overlay.className = 'wt-scene-overlay';
      document.body.appendChild(overlay);
    }
  }

  function setCursorTransform(x, y, scale = 1) {
    const cursor = document.getElementById('wt-cursor');
    cursor.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    cursor.dataset.x = String(x);
    cursor.dataset.y = String(y);
  }

  function initCursorPosition(x, y) {
    ensureCursor();
    setCursorTransform(x, y, 1);
  }

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function animateValue(duration, onFrame) {
    return new Promise((resolve) => {
      const start = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        onFrame(easeInOutCubic(t), t);
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  async function moveCursorTo(x, y, duration = 520) {
    ensureCursor();
    const cursor = document.getElementById('wt-cursor');
    const startX = parseFloat(cursor.dataset.x || '640');
    const startY = parseFloat(cursor.dataset.y || '360');
    await animateValue(duration, (e) => {
      const cx = startX + (x - startX) * e;
      const cy = startY + (y - startY) * e;
      setCursorTransform(cx, cy, 1);
    });
  }

  async function moveCursorToElement(selector, duration = 520) {
    const el = document.querySelector(selector);
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    return moveCursorTo(rect.left + rect.width / 2, rect.top + rect.height / 2, duration);
  }

  function clickRipple(x, y) {
    ensureCursor();
    const ripples = document.getElementById('wt-ripples');
    const ripple = document.createElement('div');
    ripple.className = 'wt-click-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripples.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  async function clickElement(selector, options = {}) {
    const el = document.querySelector(selector);
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    await moveCursorTo(x, y, options.moveDuration ?? 520);
    await wait(options.preClickWait ?? 70);

    ensureCursor();
    const cursor = document.getElementById('wt-cursor');
    const cx = parseFloat(cursor.dataset.x || '0');
    const cy = parseFloat(cursor.dataset.y || '0');
    el.classList.add('wt-target-pressed');
    setCursorTransform(cx, cy, 0.88);
    clickRipple(x, y);
    await wait(100);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    await wait(options.postClickWait ?? 90);
    el.classList.remove('wt-target-pressed');
    setCursorTransform(cx, cy, 1);
  }

  async function sceneFadeOut(duration = 380) {
    ensureCursor();
    const overlay = document.getElementById('wt-scene-overlay');
    overlay.style.transition = `opacity ${duration}ms ease`;
    overlay.style.opacity = '1';
    await wait(duration);
  }

  async function sceneFadeIn(duration = 380) {
    ensureCursor();
    const overlay = document.getElementById('wt-scene-overlay');
    overlay.style.transition = `opacity ${duration}ms ease`;
    overlay.style.opacity = '0';
    await wait(duration + 40);
  }

  async function introFadeIn(duration = 500) {
    ensureCursor();
    const overlay = document.getElementById('wt-scene-overlay');
    overlay.style.opacity = '1';
    overlay.style.transition = `opacity ${duration}ms ease`;
    await wait(30);
    overlay.style.opacity = '0';
    await wait(duration);
  }

  async function animateCaption(text, duration = 280) {
    const el = document.getElementById('walkthrough-caption');
    if (!el) {
      return;
    }
    el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(6px)';
    await wait(duration);
    el.textContent = text;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    await wait(duration);
  }

  async function slideCaption(text) {
    return animateCaption(text, 300);
  }

  window.WT = {
    easeInOutCubic,
    easeOutQuad,
    ensureCursor,
    initCursorPosition,
    wait,
    moveCursorTo,
    moveCursorToElement,
    clickElement,
    clickRipple,
    sceneFadeOut,
    sceneFadeIn,
    introFadeIn,
    animateCaption,
    slideCaption,
  };
})();
