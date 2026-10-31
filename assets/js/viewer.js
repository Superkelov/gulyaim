/* Presentation viewers: one page at a time, arrows, thumbnails, swipe, autoplay. */
(function () {
  'use strict';

  function init(root) {
    var img = root.querySelector('.viewer-img');
    var count = root.querySelector('.viewer-count');
    var full = root.querySelector('.viewer-full');
    var strip = root.querySelector('.viewer-thumbs');
    var thumbs = [].slice.call(root.querySelectorAll('.thumb'));
    if (!img || !thumbs.length) return;

    var pages = thumbs.map(function (t) {
      return { src: t.dataset.src, alt: t.dataset.alt || '' };
    });
    var index = 0;
    var timer = null;
    var pausedUntil = 0;
    var inView = false;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var DELAY = 4500;

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function show(n) {
      index = (n + pages.length) % pages.length;
      img.src = pages[index].src;
      img.alt = pages[index].alt;
      if (count) count.textContent = pad(index + 1) + ' / ' + pad(pages.length);
      if (full) full.href = pages[index].src;
      thumbs.forEach(function (t, k) {
        t.classList.toggle('is-active', k === index);
      });
      var t = thumbs[index];
      if (strip && t) {
        var left = t.offsetLeft - strip.clientWidth / 2 + t.clientWidth / 2;
        if (strip.scrollTo) strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
        else strip.scrollLeft = Math.max(0, left);
      }
    }

    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    function start() {
      stop();
      if (reduce || !inView || document.hidden) return;
      timer = setInterval(function () {
        if (Date.now() < pausedUntil) return;
        show(index + 1);
      }, DELAY);
    }

    function pause() { pausedUntil = Date.now() + 15000; }

    root.addEventListener('click', function (e) {
      if (e.target.closest('.viewer-next')) { pause(); show(index + 1); return; }
      if (e.target.closest('.viewer-prev')) { pause(); show(index - 1); return; }
      var th = e.target.closest('.thumb');
      if (th) { pause(); show(parseInt(th.dataset.i, 10) || 0); }
    });

    var stage = root.querySelector('.viewer-stage');
    var startX = null;
    stage.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) { pause(); show(dx < 0 ? index + 1 : index - 1); }
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) start(); else stop();
      }, { threshold: 0.15 });
      io.observe(root);
    } else {
      inView = true;
      start();
    }

    root._viewerStep = function (d) { pause(); show(index + d); };
    show(0);
  }

  document.querySelectorAll('[data-viewer]').forEach(init);

  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var mid = window.innerHeight / 2;
    var best = null, bestDist = Infinity;
    document.querySelectorAll('[data-viewer]').forEach(function (v) {
      var r = v.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < bestDist) { bestDist = d; best = v; }
    });
    if (best && best._viewerStep) best._viewerStep(e.key === 'ArrowRight' ? 1 : -1);
  });
})();
