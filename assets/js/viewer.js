/* Presentation viewer: one page at a time, arrows, dots strip, swipe. */
(function () {
  'use strict';
  var root = document.querySelector('[data-viewer]');
  if (!root) return;

  var img = root.querySelector('.viewer-img');
  var count = root.querySelector('.viewer-count');
  var full = document.getElementById('viewerFull');
  var strip = root.querySelector('.viewer-thumbs');
  var thumbs = [].slice.call(root.querySelectorAll('.thumb'));
  if (!img || !thumbs.length) return;

  var pages = thumbs.map(function (t) {
    return { src: t.dataset.src, alt: t.dataset.alt || '' };
  });
  var index = 0;

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

  root.addEventListener('click', function (e) {
    if (e.target.closest('.viewer-next')) { show(index + 1); return; }
    if (e.target.closest('.viewer-prev')) { show(index - 1); return; }
    var th = e.target.closest('.thumb');
    if (th) show(parseInt(th.dataset.i, 10) || 0);
  });

  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
    if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'ArrowLeft') show(index - 1);
  });

  var stage = root.querySelector('.viewer-stage');
  var startX = null;
  stage.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) show(dx < 0 ? index + 1 : index - 1);
  }, { passive: true });

  show(0);
})();
