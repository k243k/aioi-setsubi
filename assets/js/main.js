/* 相生設備事務所 v2 — スクロール演出（追加演出のみ。JS無しでも全コンテンツは表示される） */
(function () {
  'use strict';

  /* ---- スクロール連動リビール ---- */
  var SELECTORS = [
    '.sec__head', '.sysrow', '.pos__text', '.pos__cols .diagram',
    '.band__inner', '.company__cols > *', '.careers__inner > *',
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
