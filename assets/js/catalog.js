/* Catalog: data, filters, product sheet, local cart, WhatsApp handoff. */
(function () {
  'use strict';

  var UI = window.SiteUI;
  var SITE = UI.SITE;

  var CATS = [
    { id: 'all', label: 'Все' },
    { id: 'face', label: 'Лицо' },
    { id: 'hair', label: 'Волосы' },
    { id: 'body', label: 'Тело' },
    { id: 'makeup', label: 'Макияж' },
    { id: 'mouth', label: 'Гигиена' },
    { id: 'health', label: 'Здоровье' },
    { id: 'home', label: 'Дом' },
    { id: 'kinder', label: 'Детям' }
  ];

  var state = { all: [], cat: 'all', q: '', sort: 'default', page: 1, per: 24 };
  var byId = {};

  var grid = document.getElementById('grid');
  var chips = document.getElementById('chips');
  var search = document.getElementById('search');
  var searchBox = document.getElementById('searchBox');
  var searchClear = document.getElementById('searchClear');
  var countEl = document.getElementById('count');
  var sortEl = document.getElementById('sort');
  var emptyEl = document.getElementById('empty');
  var resetBtn = document.getElementById('resetFilters');
  var moreWrap = document.getElementById('loadMoreWrap');
  var moreBtn = document.getElementById('loadMore');

  var cartBar = document.getElementById('cartBar');
  var cartBarBtn = document.getElementById('cartBarBtn');
  var cartBarLabel = document.getElementById('cartBarLabel');
  var cartBarTotal = document.getElementById('cartBarTotal');

  var productDialog = document.getElementById('productDialog');
  var pdBody = document.getElementById('pdBody');
  var pdFoot = document.getElementById('pdFoot');
  var cartDialog = document.getElementById('cartDialog');
  var cdBody = document.getElementById('cdBody');
  var cdFoot = document.getElementById('cdFoot');

  /* ---------- helpers ---------- */

  function prettyName(name) {
    return String(name).trim().split(/\s+/).map(function (w, i) {
      var hasLatinCaps = /[A-Z]/.test(w);
      if (hasLatinCaps && w === w.toUpperCase()) return w;
      var lw = w.toLowerCase();
      if (i === 0) lw = lw.charAt(0).toUpperCase() + lw.slice(1);
      return lw;
    }).join(' ');
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function pvLabel(p) {
    if (!p.pvNum) return '';
    return String(p.pvNum).replace('.', ',') + ' PV';
  }

  /* ---------- chips ---------- */

  function renderChips() {
    var counts = {};
    state.all.forEach(function (p) { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    chips.innerHTML = CATS.map(function (c) {
      var n = c.id === 'all' ? state.all.length : (counts[c.id] || 0);
      return '<button class="chip' + (state.cat === c.id ? ' is-active' : '') +
        '" type="button" data-cat="' + c.id + '" aria-pressed="' + (state.cat === c.id) + '">' +
        c.label + ' <span class="chip-n">' + n + '</span></button>';
    }).join('');
  }

  chips.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.cat = btn.dataset.cat;
    state.page = 1;
    syncUrl();
    renderChips();
    apply(true);
  });

  /* ---------- filtering ---------- */

  function filtered() {
    var q = norm(state.q).trim();
    var list = state.all.filter(function (p) {
      if (state.cat !== 'all' && p.cat !== state.cat) return false;
      if (!q) return true;
      return norm(p.name).indexOf(q) > -1 ||
             norm(p.brand).indexOf(q) > -1 ||
             norm(p.vol).indexOf(q) > -1;
    });

    if (state.sort === 'price-asc') list.sort(function (a, b) { return (a.client || 0) - (b.client || 0); });
    else if (state.sort === 'price-desc') list.sort(function (a, b) { return (b.client || 0) - (a.client || 0); });
    else if (state.sort === 'name') list.sort(function (a, b) { return a.title.localeCompare(b.title, 'ru'); });

    return list;
  }

  function apply(scrollTop) {
    var list = filtered();
    var shown = list.slice(0, state.page * state.per);

    emptyEl.hidden = list.length !== 0;
    grid.innerHTML = shown.map(UI.card).join('');

    if (list.length === 0) {
      countEl.innerHTML = 'Ничего не найдено';
    } else {
      countEl.innerHTML = '<b>' + list.length + '</b> ' + plural(list.length, 'товар', 'товара', 'товаров');
    }

    moreWrap.hidden = shown.length >= list.length || list.length === 0;

    if (scrollTop) {
      var top = document.getElementById('catalogTop') || document.querySelector('.search-row');
      if (top) {
        var y = top.getBoundingClientRect().top + window.pageYOffset - 72;
        if (window.pageYOffset > y + 40) window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }
  }

  /* ---------- search ---------- */

  var searchTimer = null;
  search.addEventListener('input', function () {
    searchBox.classList.toggle('has-value', search.value.length > 0);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      state.q = search.value;
      state.page = 1;
      syncUrl();
      apply(false);
    }, 120);
  });

  searchClear.addEventListener('click', function () {
    search.value = '';
    searchBox.classList.remove('has-value');
    state.q = '';
    state.page = 1;
    syncUrl();
    apply(false);
    search.focus();
  });

  sortEl.addEventListener('change', function () {
    state.sort = sortEl.value;
    state.page = 1;
    apply(false);
  });

  moreBtn.addEventListener('click', function () {
    state.page += 1;
    apply(false);
  });

  resetBtn.addEventListener('click', function () {
    state.cat = 'all'; state.q = ''; state.sort = 'default'; state.page = 1;
    search.value = '';
    searchBox.classList.remove('has-value');
    sortEl.value = 'default';
    renderChips();
    syncUrl();
    apply(false);
  });

  function syncUrl() {
    if (!history.replaceState) return;
    var params = new URLSearchParams();
    if (state.cat !== 'all') params.set('cat', state.cat);
    if (state.q) params.set('q', state.q);
    var qs = params.toString();
    history.replaceState(null, '', 'catalog.html' + (qs ? '?' + qs : ''));
  }

  function readUrl() {
    var params = new URLSearchParams(location.search);
    var cat = params.get('cat');
    if (cat && CATS.some(function (c) { return c.id === cat; })) state.cat = cat;
    var q = params.get('q');
    if (q) { state.q = q; search.value = q; searchBox.classList.add('has-value'); }
    return params.get('p');
  }

  /* ---------- cart ---------- */

  var CART_KEY = 'gl_cart_v1';
  var cart = {};

  function loadCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      Object.keys(obj).forEach(function (k) {
        var q = parseInt(obj[k], 10);
        if (byId[k] && q > 0) cart[k] = Math.min(q, 99);
      });
    } catch (e) { cart = {}; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
  }
  function cartCount() {
    return Object.keys(cart).reduce(function (n, k) { return n + cart[k]; }, 0);
  }
  function cartTotal() {
    return Object.keys(cart).reduce(function (sum, k) {
      var p = byId[k];
      return sum + (p ? (p.client || 0) * cart[k] : 0);
    }, 0);
  }
  function addToCart(id) {
    var key = String(id);
    cart[key] = Math.min((cart[key] || 0) + 1, 99);
    saveCart();
    updateCartUI();
    toast('Добавлено в корзину');
  }
  function setQty(id, delta) {
    var key = String(id);
    var next = (cart[key] || 0) + delta;
    if (next < 1) delete cart[key]; else cart[key] = Math.min(next, 99);
    saveCart();
    updateCartUI();
    if (cartDialog.open) renderCart();
  }
  function removeItem(id) {
    delete cart[String(id)];
    saveCart();
    updateCartUI();
    if (cartDialog.open) renderCart();
  }

  function updateCartUI() {
    var n = cartCount();
    var total = cartTotal();
    cartBar.classList.toggle('is-visible', n > 0 && !cartDialog.open);
    cartBarLabel.textContent = n + ' ' + plural(n, 'товар', 'товара', 'товаров');
    cartBarTotal.textContent = UI.money(total);
    if (productDialog.open) syncAddButton();
  }

  function syncAddButton() {
    var btn = pdFoot.querySelector('[data-add]');
    if (!btn) return;
    var n = cart[btn.dataset.add] || 0;
    btn.innerHTML = n
      ? 'В корзине: ' + n + ' <svg aria-hidden="true"><use href="#i-check"></use></svg>'
      : 'В корзину <svg aria-hidden="true"><use href="#i-bag"></use></svg>';
  }

  /* ---------- cart sheet ---------- */

  function renderCart() {
    var ids = Object.keys(cart);
    if (!ids.length) {
      cdBody.innerHTML = '<div class="empty-cart">' +
        '<h3>В корзине пока пусто</h3>' +
        '<p>Добавьте товары из каталога, и я помогу оформить заказ.</p>' +
        '<button class="btn btn-quiet" type="button" data-close>Перейти к каталогу</button>' +
        '</div>';
      cdFoot.innerHTML = '';
      return;
    }

    var total = 0;
    cdBody.innerHTML = ids.map(function (id) {
      var p = byId[id];
      var q = cart[id];
      if (!p) return '';
      total += (p.client || 0) * q;
      return '<div class="cart-line">' +
        '<img src="' + UI.esc(p.img) + '" alt="" loading="lazy">' +
        '<div>' +
          '<div class="nm">' + UI.esc(p.title) + '</div>' +
          '<div class="pr">' + UI.money(p.client) + '</div>' +
          '<div class="qty">' +
            '<button type="button" data-dec="' + p.id + '" aria-label="Уменьшить количество"><svg aria-hidden="true"><use href="#i-minus"></use></svg></button>' +
            '<span>' + q + '</span>' +
            '<button type="button" data-inc="' + p.id + '" aria-label="Увеличить количество"><svg aria-hidden="true"><use href="#i-plus"></use></svg></button>' +
          '</div>' +
        '</div>' +
        '<button class="cart-remove" type="button" data-remove="' + p.id + '" aria-label="Удалить товар"><svg aria-hidden="true"><use href="#i-trash"></use></svg></button>' +
      '</div>';
    }).join('') +
      '<div class="cart-total"><span>Итого по цене клиента</span><b>' + UI.money(total) + '</b></div>' +
      '<p class="cart-note">Отправьте список мне в WhatsApp: проверю наличие, подтвержу стоимость и доставку.</p>';

    cdFoot.innerHTML =
      '<button class="btn btn-primary btn-block" type="button" id="sendOrder">' +
        'Отправить в WhatsApp <svg aria-hidden="true"><use href="#i-whatsapp"></use></svg>' +
      '</button>' +
      '<button class="btn btn-outline btn-block" type="button" id="copyOrder">' +
        'Скопировать список <svg aria-hidden="true"><use href="#i-copy"></use></svg>' +
      '</button>';
  }

  function orderText() {
    var lines = ['Заказ с сайта «' + SITE.name + ' · GreenLeaf»', ''];
    var total = 0, i = 0;
    Object.keys(cart).forEach(function (id) {
      var p = byId[id];
      if (!p) return;
      var q = cart[id];
      var sum = (p.client || 0) * q;
      total += sum;
      i += 1;
      lines.push(i + ') ' + p.title + (p.vol ? ' (' + p.vol + ')' : '') +
        ' × ' + q + ' = ' + UI.money(sum));
    });
    lines.push('', 'Итого: ' + UI.money(total));
    lines.push('', 'Подскажите, пожалуйста, наличие и доставку.');
    return lines.join('\n');
  }

  async function sendOrder() {
    var text = orderText();
    if (!text) return;
    try { await window.copyText(text); } catch (e) {}
    if (navigator.share) {
      try {
        await navigator.share({ text: text });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    toast('Заказ скопирован, вставьте его в чат');
    window.open(SITE.wa, '_blank', 'noopener');
  }

  cdBody.addEventListener('click', function (e) {
    var inc = e.target.closest('[data-inc]');
    var dec = e.target.closest('[data-dec]');
    var rem = e.target.closest('[data-remove]');
    if (inc) setQty(inc.dataset.inc, 1);
    else if (dec) setQty(dec.dataset.dec, -1);
    else if (rem) removeItem(rem.dataset.remove);
    else if (e.target.closest('[data-close]')) closeDialog(cartDialog);
  });

  cdFoot.addEventListener('click', function (e) {
    if (e.target.closest('#sendOrder')) sendOrder();
    if (e.target.closest('#copyOrder')) {
      window.copyText(orderText()).then(function () {
        toast('Список заказа скопирован');
      }).catch(function () {
        toast('Не удалось скопировать');
      });
    }
  });

  /* ---------- product sheet ---------- */

  var currentProduct = null;

  function openProduct(id) {
    var p = byId[id];
    if (!p) return;
    currentProduct = p;

    var meta = [p.vol, pvLabel(p)].filter(Boolean).join(' · ');

    pdBody.innerHTML =
      '<div class="psheet-media"><img src="' + UI.esc(p.img) + '" alt="' + UI.esc(p.title) + '"></div>' +
      '<div class="psheet-info">' +
        '<div class="psheet-brand">' + UI.esc(p.brand || 'GreenLeaf') + '</div>' +
        '<h2 class="psheet-name" id="pdName">' + UI.esc(p.title) + '</h2>' +
        (meta ? '<div class="psheet-meta">' + UI.esc(meta) + '</div>' : '') +
        '<div class="psheet-prices' + (p.partner ? '' : ' one') + '">' +
          '<div class="price-box"><span>Цена для клиента</span><b>' + UI.money(p.client) + '</b></div>' +
          (p.partner ? '<div class="price-box"><span>Цена партнёра</span><b>' + UI.money(p.partner) + '</b></div>' : '') +
        '</div>' +
        (p.desc ? '<p class="psheet-desc">' + UI.esc(p.desc) + '</p>' : '') +
      '</div>';

    pdFoot.innerHTML =
      '<div class="sheet-foot-inner">' +
        '<button class="btn btn-primary" type="button" data-add="' + p.id + '">В корзину</button>' +
        '<a class="btn btn-outline" href="' + SITE.wa + '" target="_blank" rel="noopener">' +
          '<svg aria-hidden="true"><use href="#i-whatsapp"></use></svg> Спросить' +
        '</a>' +
      '</div>';

    syncAddButton();
    openDialog(productDialog);
  }

  pdFoot.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add && currentProduct) {
      addToCart(currentProduct.id);
      syncAddButton();
    }
  });

  grid.addEventListener('click', function (e) {
    var el = e.target.closest('[data-id]');
    if (el) openProduct(el.dataset.id);
  });

  /* ---------- dialogs ---------- */

  function openDialog(d) {
    if (typeof d.showModal === 'function') d.showModal();
    else d.setAttribute('open', '');
    var sheet = d.querySelector('.sheet');
    if (sheet) {
      sheet.setAttribute('tabindex', '-1');
      sheet.focus({ preventScroll: true });
    }
    document.body.classList.add('is-locked');
    if (d === cartDialog) {
      cartBar.classList.remove('is-visible');
      renderCart();
    }
  }
  function closeDialog(d) {
    if (typeof d.close === 'function') d.close();
    else d.removeAttribute('open');
  }

  [productDialog, cartDialog].forEach(function (d) {
    d.addEventListener('close', function () {
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('is-locked');
      updateCartUI();
    });
    d.addEventListener('click', function (e) {
      if (e.target === d) closeDialog(d);
      if (e.target.closest('[data-close]')) closeDialog(d);
    });
  });

  cartBarBtn.addEventListener('click', function () {
    openDialog(cartDialog);
  });

  /* ---------- load ---------- */

  function skeleton(n) {
    var out = '';
    for (var i = 0; i < n; i++) {
      out += '<div class="sk"><div class="sk-media"></div><div class="sk-line"></div><div class="sk-line short"></div></div>';
    }
    return out;
  }

  function boot() {
    var deepLink = readUrl();
    grid.innerHTML = skeleton(8);

    fetch('data/products.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (list) {
        state.all = list.map(function (p) {
          p.title = prettyName(p.name);
          return p;
        });
        state.all.forEach(function (p) { byId[p.id] = p; });

        loadCart();
        renderChips();
        apply(false);
        updateCartUI();

        if (deepLink && byId[deepLink]) openProduct(deepLink);
      })
      .catch(function () {
        grid.innerHTML = '';
        countEl.textContent = 'Каталог не загрузился';
        emptyEl.hidden = false;
        emptyEl.querySelector('h3').textContent = 'Не удалось загрузить каталог';
        emptyEl.querySelector('p').textContent = 'Проверьте соединение и обновите страницу.';
        resetBtn.textContent = 'Обновить';
        resetBtn.addEventListener('click', function () { location.reload(); });
      });
  }

  boot();
})();
