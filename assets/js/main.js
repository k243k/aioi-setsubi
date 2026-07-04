/* 相生設備事務所 v2 — スクロール演出（追加演出のみ。JS無しでも全コンテンツは表示される） */
(function () {
  'use strict';

  /* ---- スクロール連動リビール ---- */
  var SELECTORS = [
    '.sec__head', '.sysrow', '.pos__text', '.pos__cols .diagram',
    '.stmt__body', '.syscard', '.ctaband__inner', '.people__inner > *',
    '.company__cols > *', '.careers__inner > *',
    '.contact__inner > *', '.envrow', '.day-item', '.day .photo',
    '.yoko .ctable', '.yoko__cta'
  ];
  var targets = document.querySelectorAll(SELECTORS.join(','));
  targets.forEach(function (el) {
    el.classList.add('reveal');
    var parent = el.parentElement || document.body;
    var idx = parent.__revealIdx || 0;
    el.style.transitionDelay = (Math.min(idx, 6) * 90) + 'ms';
    parent.__revealIdx = idx + 1;
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- 数字カウントアップ ---- */
  var counters = document.querySelectorAll('[data-countup]');
  if ('IntersectionObserver' in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target;
        var goal = parseInt(el.getAttribute('data-countup'), 10);
        var t0 = null;
        var DUR = 1100;
        function step(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / DUR, 1);
          el.textContent = Math.round(goal * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        }
        el.textContent = '0';
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---- ページ遷移: 黒幕スライドで退場 ---- */
  (function () {
    var veil = document.createElement('div');
    veil.className = 'veil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);
    window.addEventListener('pageshow', function () {
      document.documentElement.classList.remove('is-leaving');
    });
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || a.target === '_blank') return;
      if (/^https?:/.test(href) && a.host !== location.host) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      document.documentElement.classList.add('is-leaving');
      setTimeout(function () { location.href = href; }, 440);
    });
  })();

  /* ---- ローディング画面: ロゴ表示後にリフトアウト ---- */
  var opening = document.getElementById('opening');
  if (opening) {
    document.documentElement.classList.add('is-opening');
    var closeOpening = function () {
      opening.classList.add('is-done');
      document.documentElement.classList.remove('is-opening');
      setTimeout(function () { opening.remove(); }, 800);
    };
    /* ロゴのriseアニメ(0.85s)を見せてから閉じる。読み込みが遅くても最大2.4sで開く */
    var t0 = performance.now();
    var minWait = 1150;
    var done = false;
    var tryClose = function () {
      if (done) return;
      done = true;
      var rest = Math.max(0, minWait - (performance.now() - t0));
      setTimeout(closeOpening, rest);
    };
    if (document.readyState === 'complete') tryClose();
    else window.addEventListener('load', tryClose);
    setTimeout(tryClose, 2400);
  }

  /* ---- STATEMENT画像列: スクロール連動の異速パララックス ---- */
  var cols = document.querySelectorAll('.stmt__col');
  if (cols.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ticking = false;
    var applyParallax = function () {
      ticking = false;
      var vh = window.innerHeight;
      cols.forEach(function (col) {
        var r = col.parentElement.getBoundingClientRect();
        var delta = (r.top + r.height / 2) - vh / 2;
        var speed = parseFloat(col.getAttribute('data-speed')) || -0.1;
        var ty = Math.max(-110, Math.min(110, delta * speed * 1.8)); /* 見出しへの被り防止 */
        col.style.transform = 'translateY(' + ty.toFixed(1) + 'px)';
      });
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(applyParallax); }
    }, { passive: true });
    applyParallax();
  }

  /* ---- FVのBIMモデル: マウスパララックス（微小な奥行き） ---- */
  var model = document.getElementById('bimModel');
  if (model && !document.getElementById('bimCanvas') && window.matchMedia('(pointer:fine)').matches) {
    var hero = model.closest('.hero');
    hero.addEventListener('mousemove', function (ev) {
      var r = hero.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width - 0.5;
      var y = (ev.clientY - r.top) / r.height - 0.5;
      model.style.transform = 'translate(' + (x * -16) + 'px,' + (y * -12) + 'px) scale(1.04)';
    });
    hero.addEventListener('mouseleave', function () {
      model.style.transform = '';
    });
  }
})();
