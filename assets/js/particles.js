/* 相生設備事務所 — HERO パーティクル v4（3段階・シルエット至上）
   FLOW(見えない流れ) → MEP SYSTEM(設備そのもの) → INSIDE BUILDING(躯体の隙間を通る) → 崩れてFLOWへ
   ダクト/配管は稜線でなく「表面リング連打」で管として塗る（箱感の排除）。 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const holder = document.querySelector('.hero__bg');
const img = document.getElementById('bimModel');
if (holder && img) {
  try { init(); }
  catch (e) {
    console.error('[particles]', e);
    img.style.opacity = '1'; /* index.html側で先行非表示にした静止画フォールバックを復帰 */
  }
}

function init() {
  const W = () => holder.clientWidth, H = () => holder.clientHeight;
  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  const COUNT = isMobile ? 12000 : 26000;
  const N_STR = Math.floor(COUNT * 0.30);
  const N_MEP = COUNT - N_STR;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); /* bloom込みのフレーム時間短縮。粒子は1.5xで見分け不能 */
  renderer.setSize(W(), H());
  renderer.domElement.id = 'bimCanvas';
  Object.assign(renderer.domElement.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%', opacity: '0',
    transition: 'opacity 1.6s ease'
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.1, 200);
  camera.position.set(-4.5, -1.2, 15.5);
  camera.lookAt(2.2, 1.0, 0);

  /* =====================================================
     サンプラー（表面化ヘルパー）
     ===================================================== */
  const V = (p) => new THREE.Vector3(p[0], p[1], p[2]);

  /* 角ダクト表面: 断面矩形リングを密に連打して「管」として塗る */
  function ductSurface(out, pts, w, h, step) {
    step = step || 0.22;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = V(pts[i]), b = V(pts[i + 1]);
      const d = b.clone().sub(a), len = d.length(), n = d.clone().normalize();
      const up = Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const sv = new THREE.Vector3().crossVectors(n, up).normalize();
      const tv = new THREE.Vector3().crossVectors(sv, n).normalize();
      for (let q = 0; q <= len; q += step) {
        const c = a.clone().add(n.clone().multiplyScalar(Math.min(q, len)));
        const isFlange = (q % 1.4) < step;                 /* フランジ位置は全周密 */
        const pts = isFlange ? 14 : 6;
        for (let k = 0; k < pts; k++) {
          let su, tw;
          if (!isFlange && Math.random() < 0.72) {
            /* コーナー寄せ = 4本の稜線が光って輪郭が立つ */
            su = Math.random() < 0.5 ? -1 : 1;
            tw = Math.random() < 0.5 ? -1 : 1;
          } else {
            const e = Math.random() * 4;
            if (e < 1)      { su = -1 + 2 * e;        tw = 1; }
            else if (e < 2) { su = 1;  tw = 1 - 2 * (e - 1); }
            else if (e < 3) { su = 1 - 2 * (e - 2);  tw = -1; }
            else            { su = -1; tw = -1 + 2 * (e - 3); }
          }
          const p = c.clone()
            .add(sv.clone().multiplyScalar(su * w / 2))
            .add(tv.clone().multiplyScalar(tw * h / 2));
          out.push(p.x, p.y, p.z);
        }
      }
    }
  }
  /* 丸配管表面: 円周リング連打 */
  function pipeSurface(out, pts, r, step) {
    step = step || 0.16;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = V(pts[i]), b = V(pts[i + 1]);
      const d = b.clone().sub(a), len = d.length(), n = d.clone().normalize();
      const up = Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const sv = new THREE.Vector3().crossVectors(n, up).normalize();
      const tv = new THREE.Vector3().crossVectors(sv, n).normalize();
      for (let q = 0; q <= len; q += step) {
        const c = a.clone().add(n.clone().multiplyScalar(Math.min(q, len)));
        for (let k = 0; k < 2; k++) {
          const th = Math.random() * Math.PI * 2;
          const p = c.clone()
            .add(sv.clone().multiplyScalar(Math.cos(th) * r))
            .add(tv.clone().multiplyScalar(Math.sin(th) * r));
          out.push(p.x, p.y, p.z);
        }
      }
    }
  }
  /* 箱表面（AHU等・6面ランダム） */
  function boxSurface(out, cx, cy, cz, w, h, d, n) {
    for (let i = 0; i < n; i++) {
      const f = Math.floor(Math.random() * 6);
      let x = (Math.random() - 0.5) * w, y = (Math.random() - 0.5) * h, z = (Math.random() - 0.5) * d;
      if (f === 0) x = -w / 2; else if (f === 1) x = w / 2;
      else if (f === 2) y = -h / 2; else if (f === 3) y = h / 2;
      else if (f === 4) z = -d / 2; else z = d / 2;
      out.push(cx + x, cy + y, cz + z);
    }
  }
  /* 円環（ファンガード） */
  function ringPts(out, c, r, axis, n) {
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      if (axis === 'x') out.push(c[0], c[1] + Math.cos(th) * r, c[2] + Math.sin(th) * r);
      else if (axis === 'z') out.push(c[0] + Math.cos(th) * r, c[1] + Math.sin(th) * r, c[2]);
      else out.push(c[0] + Math.cos(th) * r, c[1], c[2] + Math.sin(th) * r);
    }
  }
  /* 細い角材（柱・梁）: 表面まばら */
  function memberSurface(out, pts, w, h, step) {
    ductSurface(out, pts, w, h, step || 0.3);
  }
  /* 水平スラブ面: まばらな面サンプル + 縁 */
  function slabSurface(out, cx, cy, cz, w, d, n) {
    for (let i = 0; i < n; i++) {
      out.push(cx + (Math.random() - 0.5) * w, cy + (Math.random() - 0.5) * 0.05, cz + (Math.random() - 0.5) * d);
    }
  }

  /* 座標プールを COUNT 個へ整形（過不足はランダム複製/切詰め） */
  function fitTo(arrRaw, n) {
    const m = arrRaw.length / 3;
    const outArr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const src = i < m ? i : Math.floor(Math.random() * m);
      outArr[i * 3] = arrRaw[src * 3] + (Math.random() - 0.5) * 0.03;
      outArr[i * 3 + 1] = arrRaw[src * 3 + 1] + (Math.random() - 0.5) * 0.03;
      outArr[i * 3 + 2] = arrRaw[src * 3 + 2] + (Math.random() - 0.5) * 0.03;
    }
    return outArr;
  }

  /* =====================================================
     ① FLOW — 一方向へ流れる流線
     ===================================================== */
  const flowRaw = [];
  for (let k = 0; k < 16; k++) {
    const y0 = -3.6 + k * 0.52 + (Math.random() - 0.5) * 0.3;
    const z0 = (Math.random() - 0.5) * 2.4;
    const amp = 0.35 + Math.random() * 0.5;
    const ph = Math.random() * Math.PI * 2;
    for (let x = -14; x <= 14; x += 0.12) {
      if (Math.random() < 0.45)
        flowRaw.push(x, y0 + Math.sin(x * 0.42 + ph) * amp, z0 + Math.cos(x * 0.3 + ph) * 0.5);
    }
  }
  const flow = fitTo(flowRaw, COUNT);

  /* =====================================================
     ② MEP SYSTEM — 表面まで塗った設備（箱感なし・0.5秒認識）
     ===================================================== */
  const mepRaw = [];
  /* 配置原則: 最終画面座標 = raw + 5（右側の見える窓 x[0.5..10] に全要素を集約） */
  /* AHU（ファンはカメラ正面向き） */
  boxSurface(mepRaw, -3.4, -2.4, 1.0, 3.0, 2.4, 2.0, 1400);
  for (const r of [0.8, 0.55, 0.3]) ringPts(mepRaw, [-3.4, -2.3, 2.02], r, 'z', Math.round(r * 110));
  /* AHU→立ち上がり→90°エルボ→主ダクト（レデューサ付き）→右画面外へ */
  ductSurface(mepRaw, [[-3.4, -1.1, 0.2], [-3.4, 2.3, 0.2]], 1.3, 1.0, 0.18);
  ductSurface(mepRaw, [[-3.4, 2.3, 0.2], [1.6, 2.3, 0.2]], 1.5, 1.15, 0.18);
  ductSurface(mepRaw, [[1.6, 2.3, 0.2], [2.2, 2.3, 0.2]], 1.2, 0.95, 0.09);   /* レデューサ */
  ductSurface(mepRaw, [[2.2, 2.3, 0.2], [5.6, 2.3, 0.2]], 1.05, 0.85, 0.18);
  /* T字分岐: 下へ→手前へ→吹出口2連 */
  ductSurface(mepRaw, [[0.2, 2.3, 0.25], [0.2, -0.7, 0.25], [0.2, -0.7, 2.4]], 0.8, 0.65, 0.18);
  boxSurface(mepRaw, 0.2, -1.15, 1.7, 0.85, 0.14, 0.6, 80);
  boxSurface(mepRaw, 0.2, -1.15, 2.4, 0.85, 0.14, 0.6, 80);
  /* 縦管1本（上画面外へ） */
  ductSurface(mepRaw, [[3.6, 2.3, 0.15], [3.6, 5.4, 0.15]], 0.8, 0.65, 0.18);
  /* 丸配管3本並走（下段・1本は右で90°立ち上がり） */
  pipeSurface(mepRaw, [[-4.6, -3.5, 1.5], [5.6, -3.5, 1.5]], 0.24, 0.15);
  pipeSurface(mepRaw, [[-4.6, -3.9, 1.75], [4.4, -3.9, 1.75], [4.4, 0.4, 1.75]], 0.17, 0.17);
  pipeSurface(mepRaw, [[-4.6, -4.25, 1.5], [5.1, -4.25, 1.5]], 0.12, 0.2);
  for (let i = 0; i < mepRaw.length; i += 3) mepRaw[i] += 3.4;
  const mep = fitTo(mepRaw, COUNT);
  const mepKeep = mep.slice(0, N_MEP * 3);

  /* =====================================================
     ③ INSIDE BUILDING — スラブ2枚・梁3本・柱4本だけ（隙間を設備が通る）
     ===================================================== */
  const strRaw = [];
  /* 床スラブ2枚（上・下）— 見える窓を横断 */
  slabSurface(strRaw, 0.5, 4.1, 0.8, 14, 6.0, 1500);
  slabSurface(strRaw, 0.5, -5.0, 0.8, 14, 6.0, 1100);
  /* 梁3本（上スラブ直下・主ダクトはこの下端ギリを通る） */
  memberSurface(strRaw, [[-5.5, 3.5, -1.0], [6.5, 3.5, -1.0]], 0.5, 0.95, 0.16);
  memberSurface(strRaw, [[-5.5, 3.5, 2.2], [6.5, 3.5, 2.2]], 0.5, 0.95, 0.16);
  memberSurface(strRaw, [[1.4, 3.5, -2.4], [1.4, 3.5, 3.4]], 0.5, 0.95, 0.16);
  /* 柱4本（上下スラブをつなぐ） */
  for (const [px, pz] of [[-4.6, -1.3], [-0.4, 2.7], [2.8, -1.5], [5.8, 2.5]]) {
    memberSurface(strRaw, [[px, -5.0, pz], [px, 4.0, pz]], 0.6, 0.6, 0.15);
  }
  for (let i = 0; i < strRaw.length; i += 3) strRaw[i] += 3.4;
  const structure = fitTo(strRaw, N_STR);

  const inside = new Float32Array(COUNT * 3);
  inside.set(mepKeep, 0);
  inside.set(structure, N_MEP * 3);

  /* =====================================================
     ジオメトリ + シェーダー（3ステート循環）
     ===================================================== */
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(flow, 3));
  geo.setAttribute('aP1', new THREE.BufferAttribute(mep, 3));
  geo.setAttribute('aP2', new THREE.BufferAttribute(inside, 3));
  const rnd = new Float32Array(COUNT), role = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) { rnd[i] = Math.random(); role[i] = i >= N_MEP ? 1 : 0; }
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
  geo.setAttribute('aRole', new THREE.BufferAttribute(role, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);

  const uniforms = {
    uTime:  { value: 0 },
    uMorph: { value: 0 },                /* 0 FLOW / 1 MEP / 2 INSIDE (3循環) */
    uMouse: { value: new THREE.Vector3(999, 999, 0) },
    uSize:  { value: (isMobile ? 34 : 42) * renderer.getPixelRatio() },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aP1; attribute vec3 aP2;
      attribute float aRnd; attribute float aRole;
      uniform float uTime; uniform float uMorph; uniform vec3 uMouse; uniform float uSize;
      varying float vRole; varying float vFog; varying float vDim; varying float vFlow;

      float wgt(float i){
        float d = abs(uMorph - i);
        d = min(d, 3.0 - d);
        return clamp(1.0 - d, 0.0, 1.0); /* 線形。時間側のease()と二重に丸めると端が粘る */
      }
      void main(){
        float w0 = wgt(0.0), w1 = wgt(1.0), w2 = wgt(2.0);
        float sum = max(w0 + w1 + w2, 0.0001);
        vec3 p = (position * w0 + aP1 * w1 + aP2 * w2) / sum;
        float fw = w0 / sum, mw = w1 / sum, cw = w2 / sum;

        /* FLOW: 一方向へ流れ続ける */
        p.x += (mod(uTime * (2.2 + 2.6 * aRnd) + aRnd * 63.0, 30.0) - 15.0) * fw;
        /* 形状保持中も止めない。2層: 芯(85%)は微揺れでシルエット維持、浮遊層(15%)だけ大きく漂う */
        float drift = mix(0.06, 0.28, smoothstep(0.85, 0.97, aRnd));
        float amp = mix(drift, 0.32, fw);
        float t = uTime * 0.6 + aRnd * 43.0;
        p += vec3(sin(t * 0.9 + p.y * 0.8), cos(t * 0.7 + p.x * 0.5) * 0.8, sin(t * 0.8 + p.z * 0.9) * 0.6) * amp;

        vec3 dm = p - uMouse;
        float dist = length(dm);
        p += (dm / max(dist, 0.001)) * exp(-dist * dist * 0.5) * 0.7;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        /* INSIDEは設備を描く粒子が70%に減る分、粒を太らせて濃度維持 */
        float sizeMul = 1.0 + (mw * 0.25 + cw * 0.5) * (1.0 - aRole);
        /* 明滅(twinkle): 位置が保持中でも生きて見える */
        float twk = 0.85 + 0.3 * sin(uTime * (1.2 + aRnd * 2.4) + aRnd * 47.0);
        gl_PointSize = uSize * (0.35 + 0.75 * aRnd) * sizeMul * twk / -mv.z;
        vRole = aRole;
        vFlow = fw;
        vDim = aRole * cw;                 /* INSIDEで躯体役だけ暗く薄く */
        vFog = smoothstep(34.0, 12.0, -mv.z);
      }`,
    fragmentShader: /* glsl */`
      varying float vRole; varying float vFog; varying float vDim; varying float vFlow;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.06, length(c));
        vec3 steel = vec3(0.498, 0.686, 0.757);
        vec3 paper = vec3(0.953, 0.941, 0.910);
        vec3 col = mix(steel, paper, vRole * 0.45 + vFlow * 0.2);
        col *= 1.0 - vDim * 0.28;
        float alpha = a * 0.85 * vFog * (1.0 - vDim * 0.12);
        gl_FragColor = vec4(col, alpha);
      }`
  });

  const group = new THREE.Group();
  group.add(new THREE.Points(geo, mat));
  group.position.set(1.6, 0.3, 0);
  group.scale.setScalar(1.04);
  if (isMobile) group.scale.setScalar(0.9);
  scene.add(group);

  /* SPは専用ブロック表示: MEPモデルの実バウンディングへ正対し、
     キャンバスのアスペクト比からカメラ距離を算出して中央フィットさせる */
  function fitMobileCamera() {
    const s = group.scale.x, gx = group.position.x, gy = group.position.y;
    /* MEP world範囲: x -1.2..9.0 / y -4.25..5.4 / z 0..2.4（raw+3.4済み） */
    const cx = 3.9 * s + gx, cy = 0.575 * s + gy;
    const halfW = 5.1 * s + 0.6, halfH = 4.85 * s + 0.4;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspect = W() / Math.max(H(), 1);
    const dist = Math.max(halfW / (tanV * aspect), halfH / tanV) + 3.2;
    camera.position.set(cx, cy, dist);
    camera.lookAt(cx, cy, 0.8);
  }
  if (isMobile) fitMobileCamera();

  let composer = null;
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(W() / 2, H() / 2), 0.5, 0.85, 0.12));
    composer.addPass(new OutputPass());
    composer.setSize(W(), H());
  } catch (e) { composer = null; }

  /* ---------- 進行制御（3ステート循環） ---------- */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOLD = 3.0, TWEEN = 1.6, STEP = HOLD + TWEEN;
  const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const labels = document.querySelectorAll('.layers span');
  let lastStage = -1;

  const ray = new THREE.Raycaster();
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const ndc = new THREE.Vector2(9, 9);
  const hit = new THREE.Vector3(999, 999, 0);
  if (window.matchMedia('(pointer:fine)').matches) {
    const heroEl = holder.closest('.hero');
    heroEl.addEventListener('mousemove', (ev) => {
      const r = holder.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    });
    heroEl.addEventListener('mouseleave', () => ndc.set(9, 9));
  }

  const clock = new THREE.Clock();
  let shown = false;
  function render() {
    const t = clock.getElapsedTime();
    let morph;
    if (reduced) morph = 2;
    else {
      const cyc = Math.max(t - 1.0, 0);
      const k = Math.floor(cyc / STEP);
      const ph = cyc - k * STEP;
      morph = (k + (ph < HOLD ? 0 : ease((ph - HOLD) / TWEEN))) % 3;
    }
    uniforms.uMorph.value = morph;
    uniforms.uTime.value = t;

    const stage = Math.round(morph) % 3;
    if (stage !== lastStage && labels.length >= 3) {
      lastStage = stage;
      labels.forEach((el, i) => { el.style.color = (i === stage) ? 'var(--steel)' : ''; });
    }

    /* ゆっくり旋回のみ（正対・紙モードは廃止） */
    group.rotation.y += ((Math.sin(t * 0.09) * 0.07 + 0.06) - group.rotation.y) * 0.04;
    group.rotation.x += (0.05 - group.rotation.x) * 0.04;

    if (ndc.x < 5) {
      ray.setFromCamera(ndc, camera);
      ray.ray.intersectPlane(planeZ, hit) || hit.set(999, 999, 0);
      uniforms.uMouse.value.copy(group.worldToLocal(hit.clone()));
    } else {
      uniforms.uMouse.value.set(999, 999, 0);
    }

    if (composer) composer.render(); else renderer.render(scene, camera);
    if (!shown) {
      shown = true;
      holder.appendChild(renderer.domElement);
      requestAnimationFrame(() => {
        renderer.domElement.style.opacity = '1';
        img.style.transition = 'opacity 1.1s ease .5s';
        img.style.opacity = '0';
      });
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  window.addEventListener('resize', () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
    if (composer) composer.setSize(W(), H());
    if (isMobile) fitMobileCamera();
  });
}
