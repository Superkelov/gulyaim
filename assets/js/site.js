/* Shared behaviour: header, prices, product cards, featured rail, toast. */
(function () {
  'use strict';

  var body = document.body;
  var SITE = {
    wa: body.dataset.wa || '',
    max: body.dataset.max || '',
    vk: body.dataset.vk || '',
    email: body.dataset.email || '',
    name: body.dataset.name || 'Гуляим'
  };
  window.SITE = SITE;

  var nf = new Intl.NumberFormat('ru-RU');

  function money(value) {
    if (value === null || value === undefined || isNaN(value)) return 'по запросу';
    return nf.format(Math.round(value)) + '\u00A0₽';
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function prettyName(name) {
    return String(name).trim().split(/\s+/).map(function (w, i) {
      var hasLatinCaps = /[A-Z]/.test(w);
      if (hasLatinCaps && w === w.toUpperCase()) return w;
      var lw = w.toLowerCase();
      if (i === 0) lw = lw.charAt(0).toUpperCase() + lw.slice(1);
      return lw;
    }).join(' ');
  }

  function metaLine(p) {
    return [p.brand, p.vol].filter(Boolean).join(' · ');
  }

  function card(p) {
    var alt = esc(p.name) + (p.vol ? ', ' + esc(p.vol) : '');
    return '<button class="p-card" type="button" data-id="' + p.id + '" aria-label="' + alt + '">' +
      '<span class="p-media"><img src="' + esc(p.img) + '" alt="" loading="lazy" decoding="async" width="640" height="480"></span>' +
      '<span class="p-brand">' + esc(metaLine(p)) + '</span>' +
      '<span class="p-name">' + esc(prettyName(p.name)) + '</span>' +
      '<span class="p-price"><b>' + money(p.client) + '</b>' + (p.partner ? '<span>партнёр ' + money(p.partner) + '</span>' : '') + '</span>' +
    '</button>';
  }

  window.SiteUI = { money: money, esc: esc, card: card, metaLine: metaLine, prettyName: prettyName, SITE: SITE };

  /* header shadow */
  var header = document.querySelector('.header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 4);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* year */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* toast */
  var toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastEl);
  var toastTimer = null;
  window.toast = function (message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-visible');
    }, 2600);
  };

  /* copy helper */
  window.copyText = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); resolve(); }
      catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  };

  /* back-forward cache safety */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && document.body.classList.contains('is-locked')) {
      document.body.classList.remove('is-locked');
    }
  });

  /* featured rail on the landing page */
  var featured = document.getElementById('featured');
  if (featured) {
    var ids = featured.dataset.ids
      ? featured.dataset.ids.split(',').map(Number)
      : [3, 147, 192, 105, 318, 384];

    fetch('data/products.json')
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (all) {
        var byId = {};
        all.forEach(function (p) { byId[p.id] = p; });
        var html = ids.map(function (id) { return byId[id] ? card(byId[id]) : ''; }).join('');
        featured.innerHTML = html;
        featured.removeAttribute('aria-busy');
        featured.addEventListener('click', function (e) {
          var el = e.target.closest('[data-id]');
          if (el) location.href = 'catalog.html?p=' + el.dataset.id;
        });
      })
      .catch(function () {
        featured.innerHTML = '<p class="lead">Не удалось загрузить подборку. <a class="text-link" href="catalog.html">Открыть каталог</a></p>';
        featured.removeAttribute('aria-busy');
      });
  }
})();
