/* =========================================================
   Arch AI Drawing Kit — Studio renderers
   Presentation-grade drawings that replace the base renderers:
   01 massing diagram · 02 site/floor plan · 03 elevation + section strip
   04 section perspective · 05 detailed wall section
   Relies on helpers defined in index.html (rect, line, path, poly, text, …).
   ========================================================= */
(function () {
  'use strict';

  /* ---------- seeded randomness ---------- */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let RND = mulberry(1);
  const seed = n => { RND = mulberry(((n | 0) + 1) * 9301 + 49297); };
  const rr = (a, b) => a + (b - a) * RND();
  const pick = a => a[Math.floor(RND() * a.length)];
  const P2 = p => f2(p[0]) + ' ' + f2(p[1]);

  function smooth(pts) {
    const n = pts.length; let d = 'M' + P2(pts[0]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += 'C' + P2([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' + P2([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + P2(p2);
    }
    return d + 'Z';
  }
  function blob(cx, cy, rx, ry, n = 9, jit = .35) {
    const pts = [], ph = RND() * 6.28;
    for (let i = 0; i < n; i++) { const a = ph + i / n * Math.PI * 2, k = 1 - jit / 2 + jit * RND(); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    return smooth(pts);
  }

  /* ---------- extra patterns / filters ---------- */
  const SDEFS = `
<pattern id="pave" width="16" height="8" patternUnits="userSpaceOnUse"><rect width="16" height="8" fill="#ecebe6"/><path d="M0 0H16M0 4H16M8 0V4M0 4V8" stroke="#d2cfc7" stroke-width=".5"/></pattern>
<pattern id="pave2" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#e9e7e1"/><path d="M0 0H22M0 0V22" stroke="#cbc7be" stroke-width=".6"/></pattern>
<pattern id="grass" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="#f3f3ef"/><g fill="#b4b2a8"><circle cx="3" cy="5" r=".55"/><circle cx="12" cy="2" r=".45"/><circle cx="22" cy="8" r=".55"/><circle cx="30" cy="4" r=".4"/><circle cx="7" cy="15" r=".5"/><circle cx="17" cy="19" r=".45"/><circle cx="27" cy="16" r=".55"/><circle cx="4" cy="27" r=".45"/><circle cx="14" cy="30" r=".55"/><circle cx="24" cy="26" r=".45"/><circle cx="31" cy="30" r=".5"/></g><path d="M9 9l1-2M19 12l1-2M28 23l1-2M11 24l1-2" stroke="#b4b2a8" stroke-width=".5"/></pattern>
<pattern id="tile" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#fff"/><path d="M0 0H9M0 0V9" stroke="#dcd9d2" stroke-width=".45"/></pattern>
<pattern id="hardcore" width="34" height="16" patternUnits="userSpaceOnUse"><rect width="34" height="16" fill="#fff"/><g fill="none" stroke="#444" stroke-width=".55"><ellipse cx="6" cy="5" rx="4" ry="2.4"/><ellipse cx="18" cy="10" rx="5" ry="2.6"/><ellipse cx="29" cy="4" rx="3.4" ry="2"/><ellipse cx="8" cy="13" rx="2.6" ry="1.6"/><ellipse cx="30" cy="12" rx="2.8" ry="1.8"/></g><circle cx="13" cy="3" r=".6" fill="#444"/><circle cx="24" cy="15" r=".6" fill="#444"/></pattern>
<pattern id="zig" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#fff"/><path d="M0 0L4 8L8 0" fill="none" stroke="#333" stroke-width=".55"/></pattern>
<pattern id="cross" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#fff"/><path d="M0 0L7 7M7 0L0 7" stroke="#333" stroke-width=".45"/></pattern>
<pattern id="ply" width="12" height="4" patternUnits="userSpaceOnUse"><rect width="12" height="4" fill="#fff"/><path d="M0 2H12" stroke="#555" stroke-width=".4"/></pattern>
<linearGradient id="glassG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f898c"/><stop offset=".55" stop-color="#aeb6b7"/><stop offset="1" stop-color="#cfd4d3"/></linearGradient>
<linearGradient id="glassD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4e5456"/><stop offset="1" stop-color="#8d9596"/></linearGradient>
<linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eeece6"/><stop offset="1" stop-color="#fbfaf7"/></linearGradient>
<filter id="blur6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="blur2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 .22  0 0 0 0 .16  0 0 0 0 .12  0 0 0 .75 -.3"/></filter>`;

  function sheet(W, H, inner, defs = '') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"${H > W ? ' class="portrait"' : ''}>${DEFS}<defs>${SDEFS}${defs}</defs><rect width="${W}" height="${H}" fill="#fff"/>${inner}</svg>`;
  }
  function block(W, H, title, scale, code) {
    const y = H - 52, d = new Date();
    const ds = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    const cells = [['PROJECT', G.project, 28], ['DRAWING', title, W * .32], ['SCALE', scale, W * .64], ['DATE', ds, W * .77], ['NO.', code, W * .89]];
    let s = line(28, y, W - 28, y, { stroke: INK, strokeWidth: .8 });
    cells.forEach(([k, v, x]) => {
      s += text(x, y + 16, k, { fontSize: 8.5, fill: GRAY, fontFamily: MONO, letterSpacing: '.08em' });
      s += text(x, y + 34, v, { fontSize: 12.5, fontWeight: 700 });
    });
    return s;
  }
  const out = (title, meta, W, H, inner, defs, prompt) => ({ title, meta, w: W, h: H, svg: sheet(W, H, inner, defs), prompt });

  /* ---------- entourage ---------- */
  const POSES = [
    'M-8 -82C-4 -85 4 -85 8 -82L11 -48L8 -47L6 -70L7 -45L6 0L1 0L0 -40L-1 0L-6 0L-7 -45L-6 -70L-8 -47L-11 -48Z',
    'M-7 -82C-3 -85 4 -85 8 -82L12 -55L9 -53L6 -70L7 -45L13 0L8 0L1 -36L-5 0L-10 0L-6 -45L-6 -70L-11 -52L-14 -54Z',
    'M-7 -82C-3 -85 3 -85 7 -82L9 -60L15 -28L4 -28L4 0L1 0L0 -28L-1 0L-4 0L-4 -28L-15 -28L-9 -60Z',
    'M-8 -82C-4 -85 4 -85 8 -82L10 -60L16 -50L14 -47L8 -55L7 -45L9 0L4 0L1 -38L-2 0L-7 0L-7 -45L-7 -70L-9 -46L-12 -47Z',
  ];
  function fig(x, gy, hpx, o = {}) {
    const k = hpx / 96, pose = o.pose ?? Math.floor(RND() * POSES.length), fl = o.flip ?? RND() < .5;
    const fill = o.fill || '#4a4a4a', st = o.stroke ? ` stroke="${o.stroke}" stroke-width="${f2((o.sw || .6) / k)}" stroke-linejoin="round"` : '';
    return `<g transform="translate(${f2(x)},${f2(gy)}) scale(${f2(fl ? -k : k)},${f2(k)})" opacity="${o.op ?? 1}"><circle cx="0" cy="-90.5" r="6.4" fill="${fill}"${st}/><path d="${POSES[pose]}" fill="${fill}"${st}/></g>`;
  }
  const lineFig = (x, gy, hpx, o = {}) => fig(x, gy, hpx, { fill: '#fff', stroke: '#2a2a2a', sw: .7, ...o });

  function softTree(x, gy, h, col = '#d4d4d0', op = .62) {
    let o = line(x, gy, x, gy - h * .45, { stroke: col, strokeWidth: Math.max(2, h * .025) });
    for (let i = 0; i < 6; i++) o += `<path d="${blob(x + rr(-.26, .26) * h, gy - h * rr(.55, .82), h * rr(.16, .26), h * rr(.14, .22), 9, .4)}" fill="${col}" fill-opacity="${op}"/>`;
    return o;
  }
  function darkTree(x, gy, h) {
    let o = line(x, gy, x, gy - h * .5, { stroke: '#3c3a33', strokeWidth: Math.max(1.4, h * .03) });
    const cs = ['#56614f', '#6b7762', '#7f8b74'];
    for (let i = 0; i < 5; i++) o += `<path d="${blob(x + rr(-.2, .2) * h, gy - h * rr(.6, .85), h * rr(.14, .24), h * rr(.12, .2), 8, .45)}" fill="${pick(cs)}" fill-opacity=".92"/>`;
    return o;
  }
  function lineTree(x, gy, h) {
    let o = path(`M${f2(x - 2)} ${f2(gy)}L${f2(x - 1)} ${f2(gy - h * .45)}M${f2(x + 2)} ${f2(gy)}L${f2(x + 1)} ${f2(gy - h * .45)}`, { stroke: '#444', strokeWidth: .6, fill: 'none' });
    for (let i = 0; i < 4; i++) o += `<path d="${blob(x + rr(-.2, .2) * h, gy - h * rr(.58, .82), h * rr(.17, .25), h * rr(.14, .2), 10, .35)}" fill="#fff" stroke="#555" stroke-width=".55"/>`;
    return o;
  }
  function plant(x, gy, h) { // potted plant, px
    let o = poly([[x - h * .18, gy - h * .32], [x + h * .18, gy - h * .32], [x + h * .13, gy], [x - h * .13, gy]], { fill: '#fff', stroke: '#333', strokeWidth: .6 });
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + rr(-1.1, 1.1), L = h * rr(.45, .8), bx = x + Math.cos(a) * L, by = gy - h * .32 + Math.sin(a) * L;
      o += path(`M${f2(x)} ${f2(gy - h * .32)}Q${f2((x + bx) / 2 + rr(-6, 6))} ${f2((gy - h * .32 + by) / 2)} ${f2(bx)} ${f2(by)}`, { fill: 'none', stroke: '#333', strokeWidth: .5 });
      o += `<ellipse cx="${f2(bx)}" cy="${f2(by)}" rx="${f2(h * .1)}" ry="${f2(h * .045)}" transform="rotate(${f2(a * 180 / Math.PI)} ${f2(bx)} ${f2(by)})" fill="#fff" stroke="#333" stroke-width=".5"/>`;
    }
    return o;
  }
  function arrow2(x1, y1, x2, y2, w = 8, col = '#ff5a1f') {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, hl = Math.min(L * .5, w * 2.4), hw = w * 1.3;
    const bx = x2 - ux * hl, by = y2 - uy * hl;
    return poly([[x1 + nx * w / 2, y1 + ny * w / 2], [bx + nx * w / 2, by + ny * w / 2], [bx + nx * hw, by + ny * hw], [x2, y2], [bx - nx * hw, by - ny * hw], [bx - nx * w / 2, by - ny * w / 2], [x1 - nx * w / 2, y1 - ny * w / 2]], { fill: col, stroke: '#fff', strokeWidth: 1.6, strokeLinejoin: 'round' });
  }
  const note = (x, y, lines, ax, ay, o = {}) => {
    const wmax = Math.max(...lines.map(l => [...l].reduce((q, ch) => q + (ch.charCodeAt(0) > 255 ? 8.6 : 5.3), 0)));
    let s = rect(x - 3, y - 10, wmax + 6, lines.length * 11 + 4, { fill: '#fff' });
    lines.forEach((l, i) => s += text(x, y + i * 11, l, { fontSize: o.fs || 8.6, fontFamily: MONO, fill: '#222' }));
    if (ax !== undefined) {
      const ex = o.right ? x - 4 : x + (o.w || 120), ey = y - 3;
      s += pline([[ex, ey], [o.right ? ex - 10 : ex + 10, ey], [ax, ay]], { fill: 'none', stroke: '#222', strokeWidth: .5 }) + circ(ax, ay, 1.6, { fill: '#222' });
    }
    return s;
  };

  /* =========================================================
     01  MASSING DIAGRAM (bold isometric, BIG-like)
     ========================================================= */
  const ORANGE = '#ff5a1f';
  function vox(bs, fh) {
    const r3 = v => Math.round(v * 1000) / 1000, X = new Set(), Y = new Set(), Z = new Set();
    let zmax = 0;
    bs.forEach(b => { X.add(r3(b.x)); X.add(r3(b.x + b.w)); Y.add(r3(b.y)); Y.add(r3(b.y + b.d)); Z.add(r3(b.z)); Z.add(r3(b.z + b.h)); zmax = Math.max(zmax, b.z + b.h); });
    for (let z = 0; z < zmax - 1e-6; z += fh) Z.add(r3(z));
    const xs = [...X].sort((a, b) => a - b), ys = [...Y].sort((a, b) => a - b), zs = [...Z].sort((a, b) => a - b);
    const nx = xs.length - 1, ny = ys.length - 1, nz = zs.length - 1, occ = new Int8Array(Math.max(1, nx * ny * nz));
    const id = (i, j, k) => (i * ny + j) * nz + k;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2, cz = (zs[k] + zs[k + 1]) / 2;
      for (const b of bs) if (cx > b.x && cx < b.x + b.w && cy > b.y && cy < b.y + b.d && cz > b.z && cz < b.z + b.h) { const t = b.t === 'core' ? 2 : b.t === 'col' ? 3 : 1; occ[id(i, j, k)] = Math.max(occ[id(i, j, k)], t); }
    }
    const get = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) ? 0 : occ[id(i, j, k)];
    return { xs, ys, zs, nx, ny, nz, get, zmax };
  }
  function drawVox(V, P, s, opt) {
    const { xs, ys, zs, nx, ny, nz, get, zmax } = V, cells = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) if (get(i, j, k)) cells.push([i, j, k]);
    cells.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    const topMat = (i, j, k) => { const t = get(i, j, k); if (!t || get(i, j, k + 1)) return null; if (t !== 1) return 't' + t; return zs[k + 1] < zmax - 1e-6 ? 'green' : 'roof'; };
    const hasR = (i, j, k) => get(i, j, k) && !get(i + 1, j, k) ? get(i, j, k) : 0;
    const hasL = (i, j, k) => get(i, j, k) && !get(i, j + 1, k) ? get(i, j, k) : 0;
    const TOPC = { roof: '#ffffff', green: '#a9d38c', t2: '#ffd2bf', t3: '#d7d7d7' };
    const RC = { 1: '#efeeea', 2: '#ffb497', 3: '#c7c7c7' }, LC = { 1: '#dad7cf', 2: '#f2936f', 3: '#b2b2b2' };
    const E = { stroke: '#1c1c1c', strokeWidth: 1.05, strokeLinecap: 'round' };
    let o = '';
    for (const [i, j, k] of cells) {
      const t = get(i, j, k), x0 = xs[i], x1 = xs[i + 1], y0 = ys[j], y1 = ys[j + 1], z0 = zs[k], z1 = zs[k + 1];
      let edges = '', thin = '';
      if (hasR(i, j, k)) {
        o += poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], { fill: RC[t], stroke: RC[t], strokeWidth: .6 });
        if (t === 1 && opt.glass && z1 - z0 > 1.8) {
          const a = z0 + (z1 - z0) * .28, b = z1 - (z1 - z0) * .14;
          o += poly([P(x1, y0, a), P(x1, y1, a), P(x1, y1, b), P(x1, y0, b)], { fill: '#cfe3ee' });
          for (let y = Math.ceil((y0 + .01) / 3) * 3; y < y1 - .01; y += 3) thin += line(...P(x1, y, a), ...P(x1, y, b), { stroke: '#97b9cb', strokeWidth: .55 });
        }
        if (!hasR(i, j, k + 1)) edges += line(...P(x1, y0, z1), ...P(x1, y1, z1), E);
        if (!(k > 0 && hasR(i, j, k - 1))) edges += line(...P(x1, y0, z0), ...P(x1, y1, z0), E); else if (t === 1) thin += line(...P(x1, y0, z0), ...P(x1, y1, z0), { stroke: '#b9b4a9', strokeWidth: .55 });
        if (!hasR(i, j - 1, k)) edges += line(...P(x1, y0, z0), ...P(x1, y0, z1), E);
        if (!hasR(i, j + 1, k)) edges += line(...P(x1, y1, z0), ...P(x1, y1, z1), E);
      }
      if (hasL(i, j, k)) {
        o += poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], { fill: LC[t], stroke: LC[t], strokeWidth: .6 });
        if (t === 1 && opt.glass && z1 - z0 > 1.8) {
          const a = z0 + (z1 - z0) * .28, b = z1 - (z1 - z0) * .14;
          o += poly([P(x0, y1, a), P(x1, y1, a), P(x1, y1, b), P(x0, y1, b)], { fill: '#b4d0df' });
          for (let x = Math.ceil((x0 + .01) / 3) * 3; x < x1 - .01; x += 3) thin += line(...P(x, y1, a), ...P(x, y1, b), { stroke: '#86a9bb', strokeWidth: .55 });
        }
        if (!hasL(i, j, k + 1)) edges += line(...P(x0, y1, z1), ...P(x1, y1, z1), E);
        if (!(k > 0 && hasL(i, j, k - 1))) edges += line(...P(x0, y1, z0), ...P(x1, y1, z0), E); else if (t === 1) thin += line(...P(x0, y1, z0), ...P(x1, y1, z0), { stroke: '#aaa497', strokeWidth: .55 });
        if (!hasL(i - 1, j, k)) edges += line(...P(x0, y1, z0), ...P(x0, y1, z1), E);
        if (!hasL(i + 1, j, k)) edges += line(...P(x1, y1, z0), ...P(x1, y1, z1), E);
      }
      const tm = topMat(i, j, k);
      if (tm) {
        o += poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], { fill: TOPC[tm], stroke: TOPC[tm], strokeWidth: .6 });
        if (topMat(i - 1, j, k) !== tm) edges += line(...P(x0, y0, z1), ...P(x0, y1, z1), E);
        if (topMat(i + 1, j, k) !== tm) edges += line(...P(x1, y0, z1), ...P(x1, y1, z1), E);
        if (topMat(i, j - 1, k) !== tm) edges += line(...P(x0, y0, z1), ...P(x1, y0, z1), E);
        if (topMat(i, j + 1, k) !== tm) edges += line(...P(x0, y1, z1), ...P(x1, y1, z1), E);
        if (tm === 'green' && opt.ppl && (x1 - x0) * (y1 - y0) > 6) {
          const nT = RND() < .55 ? 1 : 0;
          for (let q = 0; q < nT; q++) { const tx = rr(x0 + .8, x1 - .8), ty = rr(y0 + .8, y1 - .8); thin += isoTree(P, tx, ty, z1, s, .8); }
          if (RND() < .7) thin += isoMan(P, rr(x0 + .5, x1 - .5), rr(y0 + .5, y1 - .5), z1, s);
        }
      }
      o += thin + edges;
    }
    return o;
  }
  function isoTree(P, x, y, z, s, k = 1) {
    const a = P(x, y, z), b = P(x, y, z + 2.2 * k), r = Math.max(4, 1.6 * k * s);
    return `<ellipse cx="${f2(a[0] + r * .3)}" cy="${f2(a[1])}" rx="${f2(r * .9)}" ry="${f2(r * .42)}" fill="#000" fill-opacity=".12"/>` + line(...a, ...b, { stroke: '#6b5a44', strokeWidth: 1.4 }) +
      circ(b[0], b[1] - r * .55, r, { fill: '#8cc56d', stroke: '#4f8a3a', strokeWidth: .7 }) + circ(b[0] - r * .3, b[1] - r * .85, r * .38, { fill: '#b6dd97' });
  }
  function isoMan(P, x, y, z, s) {
    const a = P(x, y, z), h = Math.max(7, 1.75 * s), col = pick(['#222', '#222', ORANGE, '#2e86ab', '#555']);
    return line(a[0], a[1], a[0], a[1] - h * .78, { stroke: col, strokeWidth: Math.max(1.6, h * .17), strokeLinecap: 'round' }) + circ(a[0], a[1] - h * .93, Math.max(1.2, h * .1), { fill: col });
  }
  function ghost(b, P) {
    const x2 = b.x + b.w, y2 = b.y + b.d, z2 = b.z + b.h, st = { fill: ORANGE, fillOpacity: .07, stroke: ORANGE, strokeWidth: 1.1, strokeDasharray: '5 3.5', strokeLinejoin: 'round' };
    return poly([P(b.x, b.y, z2), P(x2, b.y, z2), P(x2, y2, z2), P(b.x, y2, z2)], st) + poly([P(x2, b.y, b.z), P(x2, y2, b.z), P(x2, y2, z2), P(x2, b.y, z2)], st) + poly([P(b.x, y2, b.z), P(x2, y2, b.z), P(x2, y2, z2), P(b.x, y2, z2)], st);
  }

  window.drawMass = function () {
    const W = clamp(num('m-w'), 4, 200), D = clamp(num('m-d'), 4, 200), n = clamp(Math.round(num('m-n')), 1, 40), fh = clamp(num('m-fh'), 2, 10), H = n * fh;
    const { steps } = massSteps(W, D, n, fh);
    const OPS = { '기본 볼륨': ['VOLUME', 'base'], '매스 분절': ['SPLIT', 'split'], '중정 비우기': ['CARVE', 'court'], '상부 매스 이동': ['SHIFT', 'shift'], '필로티 들어올리기': ['LIFT', 'elevate'], '계단식 테라스': ['TERRACE', 'terrace'] };
    const ctx = chk('m-ctx'), ppl = chk('m-ppl'), glass = chk('m-glass');
    const SW = 1400, SH = 1000, cnt = steps.length, cols = cnt <= 3 ? cnt : Math.ceil(cnt / 2), rows = Math.ceil(cnt / cols);
    const ax = 30, ay = 150, aw = SW - 60, ah = SH - ay - 80, cw = aw / cols, ch = ah / rows;
    const m = Math.max(6, Math.min(W, D) * .35), site = { x1: -m, y1: -m, x2: W * 1.16 + m, y2: D + m };
    const iso2 = (x, y, z) => [(x - y) * C30, (x + y) * S30 - z];
    let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    const acc = (x, y, z) => { const p = iso2(x, y, z); mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]); };
    [site.x1, site.x2].forEach(x => [site.y1, site.y2].forEach(y => acc(x, y, 0)));
    steps.forEach(st => [...st.bs, ...st.gh].forEach(b => [b.x, b.x + b.w].forEach(x => [b.y, b.y + b.d].forEach(y => [b.z, b.z + b.h + 6].forEach(z => acc(x, y, z))))));
    const s = Math.min((cw - 24) / (mxx - mnx), (ch - 70) / (mxy - mny));
    // context generated once so every step shares it
    seed(11);
    const trees = [], men = [];
    if (ppl) {
      for (let t = 0; t < 60 && trees.length < 9; t++) {
        const x = rr(site.x1 + 1.5, site.x2 - 1.5), y = rr(site.y1 + 1.5, site.y2 - 1.5);
        if (x > -2.5 && x < W * 1.16 + 2.5 && y > -2.5 && y < D + 2.5) continue;
        if (y > site.y2 - 5.5) continue;
        if (trees.some(q => Math.hypot(q[0] - x, q[1] - y) < 4)) continue;
        trees.push([x, y]);
      }
      for (let t = 0; t < 6; t++) men.push([rr(-1, W + 1), D + rr(1, 3.5)]);
    }
    let o = '';
    o += text(40, 62, 'MASSING STRATEGY', { fontSize: 34, fontWeight: 800, letterSpacing: '-.01em' });
    o += text(40, 92, `${G.project} · ${USE_KO[G.use]} · ${W} × ${D} m · ${n}F (H ${f2(H)} m)`, { fontSize: 13, fill: '#555' });
    // legend
    const lg = [['#cfe3ee', '유리 밴드'], ['#a9d38c', '녹화 테라스'], [ORANGE, '조작 / 제거 볼륨'], ['#ffb497', '코어']];
    lg.forEach(([c, t], i) => { const lx = SW - 520 + i * 125; o += rect(lx, 50, 14, 14, { fill: c, stroke: '#1c1c1c', strokeWidth: .6 }) + text(lx + 20, 62, t, { fontSize: 11.5 }); });
    steps.forEach((st, i) => {
      seed(100 + i);
      const [verb, op] = OPS[st.k] || [st.k, 'base'];
      const c = i % cols, r = Math.floor(i / cols), inRow = Math.min(cols, cnt - r * cols), cx = ax + c * cw + (cols - inRow) * cw / 2, cy = ay + r * ch;
      const ox = cx + cw / 2 - (mnx + mxx) / 2 * s, oy = cy + 58 + (ch - 70) / 2 - (mny + mxy) / 2 * s;
      const P = (x, y, z) => { const p = iso2(x, y, z); return [ox + p[0] * s, oy + p[1] * s]; };
      // site
      o += poly([P(site.x1, site.y1, 0), P(site.x2, site.y1, 0), P(site.x2, site.y2, 0), P(site.x1, site.y2, 0)], { fill: '#f1f0ec', stroke: '#d6d4cd', strokeWidth: .8 });
      if (ctx) {
        o += poly([P(site.x1, site.y2 - 5, 0), P(site.x2, site.y2 - 5, 0), P(site.x2, site.y2, 0), P(site.x1, site.y2, 0)], { fill: '#dedcd5' });
        o += line(...P(site.x1, site.y2 - 2.5, 0), ...P(site.x2, site.y2 - 2.5, 0), { stroke: '#fff', strokeWidth: 1.2, strokeDasharray: '7 6' });
        o += line(...P(site.x1, site.y2 - 5.6, 0), ...P(site.x2, site.y2 - 5.6, 0), { stroke: '#c9c6bd', strokeWidth: .8 });
      }
      trees.filter(q => q[0] + q[1] < W / 2 + D / 2).forEach(q => o += isoTree(P, q[0], q[1], 0, s));
      o += drawVox(vox(st.bs, fh), P, s, { glass, ppl });
      trees.filter(q => q[0] + q[1] >= W / 2 + D / 2).forEach(q => o += isoTree(P, q[0], q[1], 0, s));
      men.forEach(q => o += isoMan(P, q[0], q[1], 0, s));
      st.gh.forEach(g => o += ghost(g, P));
      // operation arrows
      const bb = bounds(st.bs), aw8 = Math.max(6, s * 1.1);
      if (op === 'split') { const z = H * .6, y = D + 4; o += arrow2(...P(W / 2 - .5, y, z), ...P(W / 2 - W * .22, y, z), aw8) + arrow2(...P(W / 2 + .5, y, z), ...P(W / 2 + W * .22, y, z), aw8); }
      if (op === 'court') { o += arrow2(...P(W / 2, D / 2, H + 9), ...P(W / 2, D / 2, H + .5), aw8); }
      if (op === 'shift' && st.gh[0]) { const g = st.gh[0], z = bb.z2 + 3; o += arrow2(...P(g.x + g.w * .35, g.y + g.d / 2, z), ...P(g.x + g.w * .35 + W * .16, g.y + g.d / 2 - D * .12, z), aw8); }
      if (op === 'elevate') { [.3, .7].forEach(f => o += arrow2(...P(W * f, D + 3.5, 0), ...P(W * f, D + 3.5, fh * 1.25), aw8)); }
      if (op === 'terrace') { o += arrow2(...P(bb.x2 + 7, bb.y1 + D * .2, bb.z2 + 3), ...P(bb.x2 + 7, bb.y2 + 2, bb.z2 - 2 * fh), aw8); }
      // label
      o += circ(cx + 26, cy + 24, 15, { fill: i === cnt - 1 ? ORANGE : '#1c1c1c' }) + text(cx + 26, cy + 29, i + 1, { fontSize: 14, fontWeight: 800, fill: '#fff', textAnchor: 'middle' });
      o += text(cx + 50, cy + 31, verb, { fontSize: 22, fontWeight: 800, letterSpacing: '.02em' });
      o += text(cx + 51, cy + 49, st.k, { fontSize: 12, fill: '#666' });
    });
    o += block(SW, SH, '매스 진화 다이어그램', 'N.T.S.', 'D-101');
    return out('매스 진화 다이어그램', `${W}×${D}m · ${n}F · ${steps.length} steps`, SW, SH, o, '', {
      type: 'architectural massing evolution diagram',
      parts: [
        ['도면 유형', `bold architectural massing diagram sequence in the style of Danish office diagrams (BIG-like): ${steps.length} isometric steps of a ${USE_EN[G.use]}, read left to right`],
        ['단계', steps.map((st, i) => `(${i + 1}) ${(OPS[st.k] || [st.k])[0]}: ${st.en}`).join(', ')],
        ['투상', 'identical isometric camera and scale in every step, clean white volumes with crisp black outlines and no seam lines'],
        ['표현', 'thick orange operation arrows, translucent orange dashed ghost of removed or moved volumes, light-blue glazing bands, bright green planted terraces with small lollipop trees, tiny people for scale, big bold uppercase step words with numbered dots'],
        ['맥락', `light gray site plate with a road ${CTX_EN[G.context]}, white background, generous spacing`],
      ],
      neg: ['perspective camera', 'photorealistic textures', 'inconsistent scale between steps', 'heavy shadows', 'clutter'],
      ko: `${steps.length}단계 매스 다이어그램. BIG 다이어그램처럼 굵은 오렌지 화살표, 반투명 제거 볼륨, 녹화 테라스, 동일 액소 시점을 지시합니다.`,
    });
  };

  /* =========================================================
     02  SITE / FLOOR PLAN
     ========================================================= */
  function furniture2(r, X, Y, s) {
    const st = { fill: '#fff', stroke: '#6b6b6b', strokeWidth: .6 }, n = r.name, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const R = (x, y, w, h, o2) => rect(X(x), Y(y), w * s, h * s, { ...st, ...o2 });
    const C = (x, y, rad, o2) => circ(X(x), Y(y), rad * s, { ...st, ...o2 });
    const fits = (w, h) => r.w > w + .5 && r.h > h + .5;
    let o = '';
    if (/계단|stair/i.test(n)) {
      const along = r.h >= r.w, len = along ? r.h - .4 : r.w - .4, nT = Math.floor(len / .28);
      for (let i = 0; i <= nT; i++) o += along ? line(X(r.x + .15), Y(r.y + .2 + i * .28), X(r.x + r.w - .15), Y(r.y + .2 + i * .28), { stroke: '#555', strokeWidth: .55 }) : line(X(r.x + .2 + i * .28), Y(r.y + .15), X(r.x + .2 + i * .28), Y(r.y + r.h - .15), { stroke: '#555', strokeWidth: .55 });
      o += along ? line(X(cx), Y(r.y + r.h - .3), X(cx), Y(r.y + .5), { stroke: INK, strokeWidth: .8, markerEnd: 'url(#arrk)' }) : line(X(r.x + .3), Y(cy), X(r.x + r.w - .5), Y(cy), { stroke: INK, strokeWidth: .8, markerEnd: 'url(#arrk)' });
      return o + text(X(cx) + 4, Y(cy) + 14, 'UP', { fontSize: 8, fontFamily: MONO });
    }
    if (/침실|bed/i.test(n)) {
      const bw = /1$|안방|master/i.test(n) ? 1.6 : 1.2, bl = 2.05;
      if (fits(bw + 1.0, bl)) {
        const x = cx - bw / 2, y = r.y + .12;
        o += R(x, y, bw, bl) + R(x + .08, y + .08, bw / 2 - .12, .38, { rx: 2 }) + R(x + bw / 2 + .04, y + .08, bw / 2 - .12, .38, { rx: 2 });
        o += path(`M${f2(X(x))} ${f2(Y(y + .75))}L${f2(X(x + bw))} ${f2(Y(y + .75))}L${f2(X(x + bw))} ${f2(Y(y + 1.0))}L${f2(X(x + bw * .2))} ${f2(Y(y + .75))}`, { fill: 'none', stroke: '#6b6b6b', strokeWidth: .5 });
        o += R(x - .5, y, .42, .42) + C(x - .29, y + .21, .1) + R(x + bw + .08, y, .42, .42) + C(x + bw + .29, y + .21, .1);
        if (r.h > 3.4) o += R(r.x + .12, r.y + r.h - .7, Math.min(r.w - .24, 2.4), .58, { strokeDasharray: '3 2' });
      }
    } else if (/거실|living|라운지|lounge/i.test(n)) {
      if (fits(3.2, 3.2)) {
        const y = r.y + r.h - 1.05;
        o += R(cx - 2.6 / 2 - .2, y - 1.9, 3.0, 2.3, { fill: 'none', strokeDasharray: '2 2' });
        o += R(cx - 1.3, y, 2.6, .88, { rx: 3 }) + R(cx - 1.18, y + .12, 2.36, .5, { rx: 2 }) + line(X(cx), Y(y + .12), X(cx), Y(y + .62), { stroke: '#6b6b6b', strokeWidth: .5 });
        o += R(cx - .6, y - 1.25, 1.2, .62, { rx: 2 }) + R(cx - 2.25, y - 1.4, .82, .82, { rx: 3 }) + R(cx + 1.43, y - 1.4, .82, .82, { rx: 3 });
        o += R(cx - 1.0, r.y + .12, 2.0, .4) + C(r.x + .5, r.y + r.h - .5, .28, { fill: 'none' }) + C(r.x + .5, r.y + r.h - .5, .14, { fill: 'none' });
      }
    } else if (/주방|kitchen/i.test(n)) {
      const len = Math.min(r.w - .3, 4.2);
      if (r.h > 1.8 && len > 1.6) {
        o += R(r.x + .15, r.y + .15, len, .62) + R(r.x + .15 + len * .22, r.y + .25, .7, .42, { rx: 3 }) + C(r.x + .15 + len * .22 + .35, r.y + .46, .06);
        [0, 1].forEach(a => [0, 1].forEach(b => o += C(r.x + .15 + len * .62 + a * .32, r.y + .32 + b * .26, .1)));
        o += R(r.x + .15 + len - .7, r.y + .15, .7, .68) + line(X(r.x + .15 + len - .7), Y(r.y + .15), X(r.x + .15 + len), Y(r.y + .83), { stroke: '#6b6b6b', strokeWidth: .4 });
        if (r.h > 3.6 && r.w > 3) o += R(cx - 1.0, cy + .2, 2.0, .9);
      }
    } else if (/식당|다이닝|dining|회의|meeting/i.test(n)) {
      const tw = Math.min(2.2, r.w - 1.5), th = Math.min(1.0, r.h - 1.5);
      if (tw > .9 && th > .6) {
        o += R(cx - tw / 2, cy - th / 2, tw, th) + C(cx, cy, .45, { fill: 'none', strokeDasharray: '2 2' });
        const k = Math.max(2, Math.floor(tw / .62));
        for (let i = 0; i < k; i++) { const x = cx - tw / 2 + tw * (i + .5) / k - .21; o += R(x, cy - th / 2 - .5, .42, .42, { rx: 2 }) + R(x, cy + th / 2 + .08, .42, .42, { rx: 2 }); }
      }
    } else if (/욕실|화장실|bath|wc/i.test(n)) {
      if (fits(.7, 1.3)) {
        o += R(r.x + .15, r.y + .1, .42, .2) + `<ellipse cx="${f2(X(r.x + .36))}" cy="${f2(Y(r.y + .55))}" rx="${f2(.19 * s)}" ry="${f2(.26 * s)}" fill="#fff" stroke="#6b6b6b" stroke-width=".6"/>`;
        o += R(r.x + r.w - .7, r.y + .1, .58, .45, { rx: 3 }) + `<ellipse cx="${f2(X(r.x + r.w - .41))}" cy="${f2(Y(r.y + .32))}" rx="${f2(.18 * s)}" ry="${f2(.12 * s)}" fill="none" stroke="#6b6b6b" stroke-width=".5"/>`;
        if (r.h > 2.3 && r.w > 1.6) { const tw = Math.min(1.7, r.w - .3); o += R(r.x + .15, r.y + r.h - .85, tw, .72, { rx: 6 }) + R(r.x + .25, r.y + r.h - .75, tw - .2, .52, { rx: 6 }); }
      }
    } else if (/서재|study|사무|office/i.test(n)) {
      if (fits(1.6, 1.4)) { o += R(cx - .8, r.y + .12, 1.6, .7) + R(cx - .25, r.y + .95, .5, .5, { rx: 4 }) + R(r.x + r.w - .45, r.y + .2, .32, Math.min(2.4, r.h - .4)); for (let y = r.y + .5; y < r.y + Math.min(2.4, r.h - .4); y += .4) o += line(X(r.x + r.w - .45), Y(y), X(r.x + r.w - .13), Y(y), { stroke: '#6b6b6b', strokeWidth: .4 }); }
    } else if (/드레스|dress|창고|stor|팬트리/i.test(n)) {
      if (r.w > .9) { o += R(r.x + .1, r.y + .1, r.w - .2, .6, { fill: 'none', strokeDasharray: '3 2' }); for (let x = r.x + .25; x < r.x + r.w - .2; x += .22) o += line(X(x), Y(r.y + .15), X(x + .05), Y(r.y + .65), { stroke: '#8a8a8a', strokeWidth: .4 }); }
    } else if (/현관|로비|entr|lobby/i.test(n)) {
      if (r.w > 1) o += R(r.x + .1, r.y + .1, r.w - .2, .38, { strokeDasharray: '3 2' }) + R(cx - .4, r.y + r.h - .8, .8, .5, { fill: 'none' });
    }
    return o;
  }

  window.drawPlan = function () {
    const W = clamp(num('p-w'), 3, 200), D = clamp(num('p-d'), 3, 200), to = clamp(num('p-to'), 50, 800) / 1000, ti = clamp(num('p-ti'), 50, 400) / 1000, mg = clamp(num('p-margin'), 1, 40);
    const rooms0 = $('#p-rooms').value.split('\n').map(l => l.trim().match(/^(.+?)\s+([\d.]+)\s*(㎡|m2)?$/)).filter(Boolean).map(m => ({ name: m[1].trim(), area: parseFloat(m[2]) })).filter(r => r.area > 0);
    if (!rooms0.length) rooms0.push({ name: '실', area: 1 });
    const rooms = partition(rooms0, { x: 0, y: 0, w: W, h: D });
    const SW = 1200, SH = 1200, top = 120, bot = SH - 120;
    const s = Math.min((SW - 120) / (W + 2 * mg), (bot - top) / (D + 2 * mg)), ox = SW / 2 - W * s / 2, oy = (top + bot) / 2 - D * s / 2;
    const X = x => ox + x * s, Y = y => oy + y * s, e = 1e-3, a = to / 2;
    const onB = (r, side) => side === 'top' ? r.y < e : side === 'bottom' ? r.y + r.h > D - e : side === 'left' ? r.x < e : r.x + r.w > W - e;
    const edges = r => [
      { side: 'top', P: [r.x, r.y], u: [1, 0], n: [0, 1], len: r.w }, { side: 'bottom', P: [r.x, r.y + r.h], u: [1, 0], n: [0, -1], len: r.w },
      { side: 'left', P: [r.x, r.y], u: [0, 1], n: [1, 0], len: r.h }, { side: 'right', P: [r.x + r.w, r.y], u: [0, 1], n: [-1, 0], len: r.h }];
    const entryIdx = Math.max(0, rooms.findIndex(r => /현관|로비|입구|entr|lobby/i.test(r.name)));
    const entryEdge = (() => { const ext = edges(rooms[entryIdx]).filter(E => onB(rooms[entryIdx], E.side) && E.len > 1.4); return ext.find(q => q.side === 'bottom') || ext[0]; })();
    seed(num('p-seed'));
    let o = '';
    // ----- site & landscape
    const sx1 = -mg, sy1 = -mg, sx2 = W + mg, sy2 = D + mg;
    const land = chk('p-land');
    o += rect(X(sx1), Y(sy1), (sx2 - sx1) * s, (sy2 - sy1) * s, { fill: land ? 'url(#grass)' : '#f6f6f3' });
    let fc = null;
    if (land) {
      o += rect(X(-1.6), Y(-1.6), (W + 3.2) * s, (D + 3.2) * s, { fill: 'url(#pave)' });
      if (entryEdge) {
        const r = rooms[entryIdx], mid = entryEdge.side === 'bottom' || entryEdge.side === 'top' ? r.x + r.w / 2 : r.y + r.h / 2, wv = Math.min(7, Math.max(4, W * .3));
        if (entryEdge.side === 'bottom') fc = { x: mid - wv / 2, y: D, w: wv, h: mg };
        else if (entryEdge.side === 'top') fc = { x: mid - wv / 2, y: -mg, w: wv, h: mg };
        else if (entryEdge.side === 'left') fc = { x: -mg, y: mid - wv / 2, w: mg, h: wv };
        else fc = { x: W, y: mid - wv / 2, w: mg, h: wv };
        o += rect(X(fc.x), Y(fc.y), fc.w * s, fc.h * s, { fill: 'url(#pave2)' });
      }
      // curved path from forecourt corner
      o += path(`M${f2(X(sx1))} ${f2(Y(D + mg * .55))}C${f2(X(W * .2))} ${f2(Y(D + mg * .35))} ${f2(X(W * .7))} ${f2(Y(D + mg * .8))} ${f2(X(sx2))} ${f2(Y(D + mg * .5))}`, { fill: 'none', stroke: '#e9e7e1', strokeWidth: 1.1 * s });
      o += path(`M${f2(X(sx1))} ${f2(Y(D + mg * .55))}C${f2(X(W * .2))} ${f2(Y(D + mg * .35))} ${f2(X(W * .7))} ${f2(Y(D + mg * .8))} ${f2(X(sx2))} ${f2(Y(D + mg * .5))}`, { fill: 'none', stroke: '#c9c6bd', strokeWidth: .5, strokeDasharray: '4 3' });
    }
    o += rect(X(sx1), Y(sy1), (sx2 - sx1) * s, (sy2 - sy1) * s, { fill: 'none', stroke: '#444', strokeWidth: .9, strokeDasharray: '14 4 2 4' });
    // trees
    const trees = [];
    if (land) {
      const target = Math.round((sx2 - sx1) * (sy2 - sy1) / 26);
      for (let t = 0; t < 900 && trees.length < target; t++) {
        const r = rr(.9, 2.1), x = rr(sx1 + r * .6, sx2 - r * .6), y = rr(sy1 + r * .6, sy2 - r * .6);
        if (x > -2.2 - r && x < W + 2.2 + r && y > -2.2 - r && y < D + 2.2 + r) continue;
        if (fc && x > fc.x - r && x < fc.x + fc.w + r && y > fc.y - r && y < fc.y + fc.h + r) continue;
        if (trees.some(q => Math.hypot(q[0] - x, q[1] - y) < (q[2] + r) * .75)) continue;
        trees.push([x, y, r]);
      }
    }
    const siteClip = `<clipPath id="siteC"><rect x="${f2(X(sx1))}" y="${f2(Y(sy1))}" width="${f2((sx2 - sx1) * s)}" height="${f2((sy2 - sy1) * s)}"/></clipPath>`;
    o += siteClip + '<g clip-path="url(#siteC)">';
    trees.forEach(([x, y, r]) => o += `<path d="${blob(X(x + r * .5), Y(y + r * .5), r * s, r * s * .95, 14, .2)}" fill="#000" fill-opacity=".07"/>`);
    o += '</g>';
    // building shadow
    if (chk('p-shadow')) o += poly([[X(-a), Y(-a)], [X(W + a), Y(-a)], [X(W + a + 1.1), Y(-a + 1.1)], [X(W + a + 1.1), Y(D + a + 1.1)], [X(-a + 1.1), Y(D + a + 1.1)], [X(-a), Y(D + a)]], { fill: '#000', fillOpacity: .16 });
    // floor
    o += rect(X(0), Y(0), W * s, D * s, { fill: '#fff' });
    rooms.forEach(r => { if (/욕실|화장실|bath|wc|주방|kitchen|다용도|현관/i.test(r.name)) o += rect(X(r.x), Y(r.y), r.w * s, r.h * s, { fill: 'url(#tile)' }); });
    if (chk('p-furn')) rooms.forEach(r => o += furniture2(r, X, Y, s));
    rooms.forEach(r => o += rect(X(r.x), Y(r.y), r.w * s, r.h * s, { fill: 'none', stroke: '#1d1d1d', strokeWidth: Math.max(1.4, ti * s) }));
    o += path(`M${X(-a)} ${Y(-a)}H${X(W + a)}V${Y(D + a)}H${X(-a)}Z M${X(a)} ${Y(a)}V${Y(D - a)}H${X(W - a)}V${Y(a)}Z`, { fill: '#111', fillRule: 'evenodd' });
    // openings (doors, windows)
    const opening = (P, u, n, off, w, th) => {
      const H0 = [P[0] + u[0] * off, P[1] + u[1] * off], H1 = [H0[0] + u[0] * w, H0[1] + u[1] * w];
      return poly([[H0[0] - n[0] * th, H0[1] - n[1] * th], [H1[0] - n[0] * th, H1[1] - n[1] * th], [H1[0] + n[0] * th, H1[1] + n[1] * th], [H0[0] + n[0] * th, H0[1] + n[1] * th]].map(p => [X(p[0]), Y(p[1])]), { fill: '#fff' });
    };
    const door = (E, off, dw, th) => {
      const H0 = [E.P[0] + E.u[0] * off, E.P[1] + E.u[1] * off], A1 = [H0[0] + E.u[0] * dw, H0[1] + E.u[1] * dw], L1 = [H0[0] + E.n[0] * dw, H0[1] + E.n[1] * dw], cr = E.u[0] * E.n[1] - E.u[1] * E.n[0];
      return opening(E.P, E.u, E.n, off, dw, th) + line(X(H0[0]), Y(H0[1]), X(L1[0]), Y(L1[1]), { stroke: INK, strokeWidth: 1.2 }) +
        path(`M${f2(X(A1[0]))} ${f2(Y(A1[1]))} A${f2(dw * s)} ${f2(dw * s)} 0 0 ${cr > 0 ? 1 : 0} ${f2(X(L1[0]))} ${f2(Y(L1[1]))}`, { fill: 'none', stroke: INK, strokeWidth: .5 });
    };
    let over = '';
    rooms.forEach((r, i) => {
      const es = edges(r);
      es.filter(E => onB(r, E.side)).forEach(E => {
        if (i === entryIdx && entryEdge && E.side === entryEdge.side) return;
        const wet = WET.test(r.name); if (wet && !/욕실|화장실|bath/i.test(r.name)) return;
        const ww = wet ? Math.min(.7, E.len * .4) : Math.min(E.len * .55, 2.8); if (ww < .4) return;
        const off = (E.len - ww) / 2, H0 = [E.P[0] + E.u[0] * off, E.P[1] + E.u[1] * off], H1 = [H0[0] + E.u[0] * ww, H0[1] + E.u[1] * ww];
        over += opening(E.P, E.u, E.n, off, ww, a + .005);
        [-a, -a / 3, a / 3, a].forEach((k, q) => over += line(X(H0[0] + E.n[0] * k), Y(H0[1] + E.n[1] * k), X(H1[0] + E.n[0] * k), Y(H1[1] + E.n[1] * k), { stroke: INK, strokeWidth: q === 0 || q === 3 ? .8 : .45 }));
        [H0, H1].forEach(Hh => over += line(X(Hh[0] - E.n[0] * a), Y(Hh[1] - E.n[1] * a), X(Hh[0] + E.n[0] * a), Y(Hh[1] + E.n[1] * a), { stroke: INK, strokeWidth: .9 }));
        // sill / overhang dashed line outside
        over += line(X(H0[0] - E.n[0] * (a + .35)), Y(H0[1] - E.n[1] * (a + .35)), X(H1[0] - E.n[0] * (a + .35)), Y(H1[1] - E.n[1] * (a + .35)), { stroke: '#777', strokeWidth: .5, strokeDasharray: '3 2' });
      });
      const ins = es.filter(E => !onB(r, E.side) && E.len > 1.3).sort((p, q) => q.len - p.len);
      if (ins.length) { const E = ins[0], dw = Math.min(.9, E.len - .4); over += door(E, .2, dw, ti / 2 + .01); }
      if (i === entryIdx && entryEdge) {
        const E = es.find(q => q.side === entryEdge.side), dw = Math.min(1.1, E.len - .4), off = (E.len - dw) / 2;
        over += door(E, off, dw, a + .01);
        const mx = E.P[0] + E.u[0] * (off + dw / 2), my = E.P[1] + E.u[1] * (off + dw / 2);
        over += poly([[X(mx - E.n[0] * 1.9 + E.u[0] * .35), Y(my - E.n[1] * 1.9 + E.u[1] * .35)], [X(mx - E.n[0] * 1.9 - E.u[0] * .35), Y(my - E.n[1] * 1.9 - E.u[1] * .35)], [X(mx - E.n[0] * 1.2), Y(my - E.n[1] * 1.2)]], { fill: INK });
        const tx = X(mx - E.n[0] * 2.15), ty = Y(my - E.n[1] * 2.4) + (E.n[1] ? (E.n[1] < 0 ? 10 : -4) : 4);
        over += text(tx, ty, 'MAIN ENTRANCE', { fontSize: 9, fontFamily: MONO, fontWeight: 600, textAnchor: E.n[0] > 0 ? 'end' : E.n[0] < 0 ? 'start' : 'middle', letterSpacing: '.06em', stroke: '#fff', strokeWidth: 3, paintOrder: 'stroke' });
      }
    });
    o += over;
    // trees on top of ground
    o += '<g clip-path="url(#siteC)">';
    trees.forEach(([x, y, r]) => {
      const pts = [], nP = 22, ph = RND() * 6.28;
      for (let q = 0; q < nP; q++) { const a = ph + q / nP * Math.PI * 2, k = (q % 2 ? .86 : 1.0) * rr(.93, 1.05); pts.push([X(x) + Math.cos(a) * r * s * k, Y(y) + Math.sin(a) * r * s * k]); }
      o += `<path d="${smooth(pts)}" fill="#fff" fill-opacity=".9" stroke="#5f5f5f" stroke-width=".6"/>`;
      for (let q = 0; q < 4; q++) { const a = rr(0, 6.28), rad = r * s * rr(.25, .6); o += path(`M${f2(X(x) + Math.cos(a) * rad)} ${f2(Y(y) + Math.sin(a) * rad)}a${f2(rad * .5)} ${f2(rad * .5)} 0 0 1 ${f2(rr(-4, 4))} ${f2(rr(3, 7))}`, { fill: 'none', stroke: '#9a9a9a', strokeWidth: .45 }); }
      o += circ(X(x), Y(y), 1.1, { fill: '#555' });
    });
    o += '</g>';
    // room tags
    rooms.forEach((r, i) => {
      const fs = clamp(Math.min(r.w, r.h) * s / 7, 9, 13), lx = X(r.x + r.w / 2), ly = Y(r.y + r.h / 2) - fs * .2;
      const halo = { stroke: '#fff', strokeWidth: 3.4, paintOrder: 'stroke' };
      o += text(lx, ly - fs * .9, `1.${String(i + 1).padStart(2, '0')}`, { fontSize: fs * .72, fontFamily: MONO, fill: '#777', textAnchor: 'middle', ...halo });
      o += text(lx, ly + fs * .3, r.name, { fontSize: fs, fontWeight: 700, textAnchor: 'middle', ...halo });
      o += text(lx, ly + fs * 1.35, (r.w * r.h).toFixed(1) + ' m²', { fontSize: fs * .72, fontFamily: MONO, fill: '#555', textAnchor: 'middle', ...halo });
    });
    // grid axes
    const xs = [...new Set([0, W, ...rooms.filter(r => r.y < e).flatMap(r => [r.x, r.x + r.w])].map(v => f2(v)))].sort((p, q) => p - q);
    const ys = [...new Set([0, D, ...rooms.filter(r => r.x < e).flatMap(r => [r.y, r.y + r.h])].map(v => f2(v)))].sort((p, q) => p - q);
    if (chk('p-grid')) {
      const gy0 = -a - Math.min(mg - .6, 3.4), gx0 = -a - Math.min(mg - .6, 3.4);
      xs.forEach((x, i) => { o += line(X(x), Y(gy0) + 10, X(x), Y(D + a + .6), { stroke: '#8d8d8d', strokeWidth: .45, strokeDasharray: '10 3 2 3' }) + circ(X(x), Y(gy0), 9.5, { fill: '#fff', stroke: INK, strokeWidth: .8 }) + text(X(x), Y(gy0) + 3.6, i + 1, { fontSize: 10, fontFamily: MONO, fontWeight: 600, textAnchor: 'middle' }); });
      ys.forEach((y, i) => { o += line(X(gx0) + 10, Y(y), X(W + a + .6), Y(y), { stroke: '#8d8d8d', strokeWidth: .45, strokeDasharray: '10 3 2 3' }) + circ(X(gx0), Y(y), 9.5, { fill: '#fff', stroke: INK, strokeWidth: .8 }) + text(X(gx0), Y(y) + 3.6, String.fromCharCode(65 + i), { fontSize: 10, fontFamily: MONO, fontWeight: 600, textAnchor: 'middle' }); });
    }
    if (chk('p-dim')) {
      const yA = Y(-a) - 16, yB = yA - 16, xA = X(-a) - 16, xB = xA - 16;
      for (let i = 0; i < xs.length - 1; i++) o += dimH(X(xs[i]), X(xs[i + 1]), yA, mm(xs[i + 1] - xs[i]));
      o += dimH(X(0), X(W), yB, mm(W));
      for (let i = 0; i < ys.length - 1; i++) o += dimV(Y(ys[i]), Y(ys[i + 1]), xA, mm(ys[i + 1] - ys[i]));
      o += dimV(Y(0), Y(D), xB, mm(D));
    }
    if (chk('p-cut')) {
      const cy = D * .55, x1 = -a - 1.4, x2 = W + a + 1.4;
      o += line(X(x1), Y(cy), X(x2), Y(cy), { stroke: INK, strokeWidth: 1.1, strokeDasharray: '16 4 3 4' });
      [x1, x2].forEach(x => { o += poly([[X(x) - 8, Y(cy) - 2], [X(x) + 8, Y(cy) - 2], [X(x), Y(cy) - 16]], { fill: INK }) + circ(X(x), Y(cy) + 13, 10, { fill: INK }) + text(X(x), Y(cy) + 17, 'S1', { fontSize: 9, fontWeight: 700, textAnchor: 'middle', fontFamily: MONO, fill: '#fff' }); });
    }
    if (chk('p-north')) { o += northArrow(SW - 70, 70); o += scaleBar(40, SH - 92, s); }
    o += text(40, 56, 'GROUND FLOOR PLAN', { fontSize: 11, fontFamily: MONO, letterSpacing: '.14em', fill: '#666' }) + text(40, 84, `1층 평면도 · 연면적 ${(W * D).toFixed(1)} m²`, { fontSize: 20, fontWeight: 800 });
    o += block(SW, SH, '배치 · 1층 평면도', scaleTxt(s), 'A-101');
    return out('평면도', `${W}×${D}m · ${rooms.length} rooms · ${(W * D).toFixed(1)}㎡`, SW, SH, o, '', {
      type: 'architectural site and floor plan',
      parts: [
        ['도면 유형', `presentation-quality architectural ground floor plan with landscaped site of a ${USE_EN[G.use]}, strict top-down orthographic view, competition-board graphics`],
        ['외곽', `rectangular footprint ${W} m x ${D} m, solid black wall poché, soft cast shadow to the south-east`],
        ['실 구성', rooms.map((r, i) => `1.${String(i + 1).padStart(2, '0')} ${roomEn(r.name)} ${(r.w * r.h).toFixed(0)}m²`).join(', ')],
        ['조경', 'fine paving joints around the building, larger paving at the entrance forecourt, stippled lawn, hand-drawn scribble tree canopies with soft shadows, dashed site boundary'],
        ['기호', 'door swings, window symbols, dashed structural grid with numbered and lettered bubbles, dimension chains, section cut line A-A, north arrow, scale bar, small room tags with number name and area'],
        ['가구', 'detailed thin-line furniture: beds with pillows, sofa set with rug, dining table with chairs, kitchen counter with sink and hob, bathtub, desk, tiled wet rooms'],
      ],
      neg: ['perspective', '3d view', 'tilted camera', 'colored walls', 'missing doors', 'rooms overlapping', 'blurry linework'],
      ko: `조경·그림자·그리드·실 태그까지 그린 배치형 평면입니다. PNG를 첨부하면 벽·문·창 위치를 고정한 채 질감만 올릴 수 있습니다.`,
    });
  };

  /* =========================================================
     03  ELEVATION + SECTION STRIP
     ========================================================= */
  function facPattern(mat, s, sd) {
    seed(sd);
    let w, h, body = '';
    const R = (x, y, ww, hh, fill) => `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(ww)}" height="${f2(hh)}" fill="${fill}"/>`;
    if (mat === 'brick') {
      const bl = .25 * s, bh = .0825 * s, cols = 8, rows = 12, pal = ['#c9765a', '#b8634a', '#d48a6c', '#c06b52', '#a9573f', '#d99a7e', '#bf7d63', '#cf8064', '#b46f58'];
      w = cols * bl; h = rows * bh; body = R(0, 0, w, h, '#e4d7ca');
      for (let r = 0; r < rows; r++) { const off = (r % 2) * bl / 2; for (let c = -1; c <= cols; c++) { const x = c * bl + off; if (x > w || x + bl < 0) continue; body += R(x + .05 * bl / 2, r * bh + .07 * bh, bl * .95, bh * .86, pick(pal)); } }
    } else if (mat === 'conc') {
      w = 2.4 * s; h = 1.2 * s; body = R(0, 0, w, h, '#d9d6d0');
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) body += R(a * w / 2, b * h / 2, w / 2, h / 2, pick(['#dcd9d3', '#d4d1ca', '#e0ddd7', '#d1cec7']));
      body += `<path d="M0 0H${f2(w)}M0 ${f2(h / 2)}H${f2(w)}M0 0V${f2(h)}M${f2(w / 2)} 0V${f2(h)}" stroke="#bcb8af" stroke-width=".7"/>`;
      [.25, .75].forEach(fx => [.25, .75].forEach(fy => [0, 1].forEach(ix => [0, 1].forEach(iy => body += `<circle cx="${f2((ix + fx) * w / 2)}" cy="${f2((iy + fy) * h / 2)}" r="${f2(Math.max(.6, .018 * s))}" fill="#a9a59c"/>`))));
    } else if (mat === 'stone') {
      w = 2.4 * s; h = 1.2 * s; body = R(0, 0, w, h, '#cdc5b6');
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) body += R(a * w / 2 + .5, b * h / 2 + .5, w / 2 - 1, h / 2 - 1, pick(['#e3ddd0', '#dad3c4', '#e8e3d8', '#d5cdbd']));
    } else if (mat === 'wood') {
      const bw = .15 * s, nb = 8; w = nb * bw; h = 3 * s; body = R(0, 0, w, h, '#a98257');
      for (let i = 0; i < nb; i++) { body += R(i * bw + .5, 0, bw - 1, h, pick(['#c9a77c', '#bf9b6e', '#d2b28a', '#b8915f', '#c4a074'])); body += `<path d="M${f2(i * bw + bw * .4)} 0C${f2(i * bw + bw * .6)} ${f2(h * .3)} ${f2(i * bw + bw * .3)} ${f2(h * .6)} ${f2(i * bw + bw * .5)} ${f2(h)}" stroke="#a7845a" stroke-width=".4" fill="none" opacity=".6"/>`; }
    } else if (mat === 'metal') {
      w = .5 * s; h = 2 * s; body = R(0, 0, w, h, '#cfd3d4') + R(w * .1, 0, w * .3, h, '#dde0e1') + `<path d="M.5 0V${f2(h)}" stroke="#8f9597" stroke-width="1"/>`;
    } else {
      w = 1 * s; h = 1 * s; body = R(0, 0, w, h, '#f4f2ed');
    }
    return `<pattern id="fac" width="${f2(w)}" height="${f2(h)}" patternUnits="userSpaceOnUse">${body}</pattern>`;
  }
  function frWindow(x, y, w, h, s, o = {}) { // px coords, y top
    const fr = Math.max(1.6, .06 * s), rv = Math.max(2, .1 * s);
    let g = rect(x, y, w, h, { fill: '#2f2d2a' });
    g += rect(x + fr, y + fr, w - 2 * fr, h - 2 * fr, { fill: o.dark ? 'url(#glassD)' : 'url(#glassG)' });
    if (o.person) g += fig(x + w * rr(.3, .7), y + h - fr, Math.min(h * .78, 1.72 * s), { fill: '#4a4d4f', op: .55 });
    if (o.curtain) {
      const cw = (w - 2 * fr) * .3;
      [x + fr, x + w - fr - cw].forEach(cx => { g += rect(cx, y + fr, cw, h - 2 * fr, { fill: '#f6f4ef', fillOpacity: .8 }); for (let i = 1; i < 4; i++) g += line(cx + cw * i / 4, y + fr, cx + cw * i / 4, y + h - fr, { stroke: '#d9d5cc', strokeWidth: .6 }); });
    }
    g += rect(x + fr, y + fr, w - 2 * fr, rv, { fill: '#000', fillOpacity: .32 }) + rect(x + fr, y + fr + rv, rv * .7, h - 2 * fr - rv, { fill: '#000', fillOpacity: .2 });
    if (o.mullion !== false && w > .9 * s) g += rect(x + w / 2 - fr / 2, y, fr, h, { fill: '#2f2d2a' });
    if (o.transom) g += rect(x, y + h * .22, w, fr, { fill: '#2f2d2a' });
    g += rect(x - .04 * s, y + h, w + .08 * s, Math.max(1.5, .05 * s), { fill: '#d7d2c8', stroke: '#9d978b', strokeWidth: .4 });
    if (o.rail) {
      const rh = Math.min(h * .45, .95 * s), ry = y + h - rh;
      g += rect(x, ry, w, Math.max(1.2, .035 * s), { fill: '#1f1f1f' }) + rect(x, y + h - Math.max(1.2, .035 * s) * 2, w, Math.max(1.2, .035 * s), { fill: '#1f1f1f' });
      for (let bx = x + .06 * s; bx < x + w - .02 * s; bx += .11 * s) g += line(bx, ry, bx, y + h, { stroke: '#1f1f1f', strokeWidth: Math.max(.6, .015 * s) });
    }
    return g;
  }
  function lineFurn(kind, x, z, s, X, Y) { // x in m (interior), z floor level
    const st = { fill: 'none', stroke: '#4a4a4a', strokeWidth: .55 }, L = (x1, z1, x2, z2) => line(X(x1), Y(z1), X(x2), Y(z2), st);
    let o = '';
    if (kind === 'table') {
      o += L(x, z + .75, x + 1.6, z + .75) + L(x + .1, z + .75, x + .1, z) + L(x + 1.5, z + .75, x + 1.5, z);
      [x - .25, x + 1.85].forEach(cx => o += L(cx - .2, z + .45, cx + .2, z + .45) + L(cx - .15, z + .45, cx - .15, z) + L(cx + .15, z + .45, cx + .15, z) + L(cx + (cx < x ? -.2 : .2), z + .45, cx + (cx < x ? -.2 : .2), z + .9));
    } else if (kind === 'bed') {
      o += rect(X(x), Y(z + .45), 2.0 * s, .3 * s, st) + rect(X(x + .05), Y(z + .62), .5 * s, .17 * s, { ...st, rx: 3 }) + L(x + .1, z + .15, x + .1, z) + L(x + 1.9, z + .15, x + 1.9, z);
    } else if (kind === 'desk') {
      o += L(x, z + .75, x + 1.2, z + .75) + L(x + .05, z + .75, x + .05, z) + L(x + 1.15, z + .75, x + 1.15, z) + L(x + .9, z + .75, x + .95, z + 1.1) + circ(X(x + .97), Y(z + 1.14), .06 * s, st);
    } else if (kind === 'sofa') {
      o += rect(X(x), Y(z + .75), 1.9 * s, .35 * s, { ...st, rx: 3 }) + rect(X(x), Y(z + .42), 1.9 * s, .3 * s, { ...st, rx: 3 }) + L(x + .1, z + .12, x + .1, z) + L(x + 1.8, z + .12, x + 1.8, z);
    }
    return o;
  }

  window.drawElev = function () {
    const W = clamp(num('v-w'), 3, 200), n = clamp(Math.round(num('v-n')), 1, 40), gfh = clamp(num('v-gfh'), 2.4, 10), fh = clamp(num('v-fh'), 2.4, 10);
    const bays = clamp(Math.round(num('v-bays')), 1, 30), ent = clamp(Math.round(num('v-ent')), 1, bays), ratio = clamp(num('v-ratio') / 100, .2, .9), wt = $('#v-win').value, roof = $('#v-roof').value, gr = $('#v-ground').value;
    const secOn = chk('v-sec'), sd = clamp(num('v-sd'), 2, 10), band = chk('v-band'), cur = chk('v-curtain'), sv = num('v-seed');
    const L = [0]; for (let k = 1; k <= n; k++) L.push(k === 1 ? gfh : L[k - 1] + fh);
    const top = L[n], ridge = roof === 'gable' ? W * .5 * Math.tan(35 * Math.PI / 180) : roof === 'shed' ? W * .18 : .9, Ht = top + ridge;
    const SW = secOn ? 1200 : 900, maxH = 1500;
    const facW = secOn ? 700 : 820;
    let s = Math.min(facW / (W + 6), (maxH - 260) / (Ht + 1.6));
    if (secOn) s = Math.min(s, 380 / (sd + 1.8));
    const SH = Math.max(900, Math.round((Ht + 1.4) * s + 280));
    const gx = 60 + 3.6 * s + (facW - (W + 6) * s) / 2, gy = SH - 150;
    const X = x => gx + x * s, Y = z => gy - z * s, bw = W / bays;
    const defs = facPattern(G.mat, s, sv) + `<clipPath id="facClip"><polygon id="facPoly" points="__PTS__"/></clipPath>`;
    seed(sv + 5);
    let o = '';
    // ground band
    o += rect(X(-3.6), gy, (W + 7.2) * s + (secOn ? 420 : 0), .35 * s, { fill: '#ecebe7' });
    if (chk('v-tree')) o += softTree(X(-2.2), gy, 9.5 * s);
    let shape;
    if (roof === 'gable') shape = [[0, 0], [W, 0], [W, top], [W / 2, top + ridge], [0, top]];
    else if (roof === 'shed') shape = [[0, 0], [W, 0], [W, top + ridge], [0, top]];
    else shape = [[0, 0], [W, 0], [W, top + ridge], [0, top + ridge]];
    const sp = shape.map(([x, z]) => [X(x), Y(z)]);
    const ptsStr = sp.map(p => f2(p[0]) + ',' + f2(p[1])).join(' ');
    o += poly(sp, { fill: 'url(#fac)' });
    o += `<rect x="${f2(X(0))}" y="${f2(Y(top + ridge))}" width="${f2(W * s)}" height="${f2((top + ridge) * s)}" filter="url(#grain)" clip-path="url(#facClip)" opacity=".9"/>`;
    // roof surfaces
    if (roof === 'gable') { o += poly([[X(-.35), Y(top - .2)], [X(W / 2), Y(top + ridge + .15)], [X(W + .35), Y(top - .2)], [X(W - .2), Y(top - .2)], [X(W / 2), Y(top + ridge - .3)], [X(.2), Y(top - .2)]], { fill: '#4f5357' }); }
    if (roof === 'shed') o += poly([[X(-.3), Y(top - .1)], [X(W + .3), Y(top + ridge + .1)], [X(W + .3), Y(top + ridge - .2)], [X(-.3), Y(top - .4)]], { fill: '#4f5357' });
    if (roof === 'flat') o += rect(X(-.12), Y(top + ridge + .04), (W + .24) * s, .28 * s, { fill: '#e6e1d8', stroke: '#a49e92', strokeWidth: .5 }) + rect(X(-.12), Y(top + ridge - .24), (W + .24) * s, .06 * s, { fill: '#000', fillOpacity: .22 });
    // plinth
    o += rect(X(0), Y(.45), W * s, .45 * s, { fill: '#000', fillOpacity: .1 });
    // floor bands
    if (band) for (let k = 1; k < n; k++) o += rect(X(-.06), Y(L[k] + .18), (W + .12) * s, .2 * s, { fill: '#e6e1d8', stroke: '#a9a295', strokeWidth: .45 }) + rect(X(0), Y(L[k] - .02), W * s, .06 * s, { fill: '#000', fillOpacity: .18 });
    // ground floor
    for (let b = 0; b < bays; b++) {
      const x0 = b * bw;
      if (gr === 'arch') {
        const aw = Math.min(bw * .72, 3.4), ah = gfh - .7, ax = x0 + (bw - aw) / 2, spring = ah - aw / 2, rA = aw / 2 * s;
        const d = `M${f2(X(ax))} ${f2(Y(0))}L${f2(X(ax))} ${f2(Y(spring))}A${f2(rA)} ${f2(rA)} 0 0 1 ${f2(X(ax + aw))} ${f2(Y(spring))}L${f2(X(ax + aw))} ${f2(Y(0))}Z`;
        const fr = .1, ri = (aw / 2 - fr) * s;
        const d2 = `M${f2(X(ax + fr))} ${f2(Y(.05))}L${f2(X(ax + fr))} ${f2(Y(spring))}A${f2(ri)} ${f2(ri)} 0 0 1 ${f2(X(ax + aw - fr))} ${f2(Y(spring))}L${f2(X(ax + aw - fr))} ${f2(Y(.05))}Z`;
        o += path(d, { fill: '#2b2a28' }) + path(d2, { fill: 'url(#glassD)' });
        if (b === ent - 1) o += line(X(ax + aw / 2), Y(spring - .3), X(ax + aw / 2), Y(0), { stroke: '#2b2a28', strokeWidth: Math.max(1.5, .06 * s) }) + line(X(ax + fr), Y(spring - .3), X(ax + aw - fr), Y(spring - .3), { stroke: '#2b2a28', strokeWidth: Math.max(1.5, .06 * s) });
        else o += fig(X(ax + aw * rr(.35, .65)), Y(.05), 1.74 * s, { fill: '#3c3f41', op: .65 });
        o += path(`M${f2(X(ax - .12))} ${f2(Y(spring))}A${f2(rA + .12 * s)} ${f2(rA + .12 * s)} 0 0 1 ${f2(X(ax + aw + .12))} ${f2(Y(spring))}`, { fill: 'none', stroke: '#e6e1d8', strokeWidth: Math.max(2, .16 * s) });
      } else if (gr === 'shop') {
        o += frWindow(X(x0 + .3), Y(gfh - .55), (bw - .6) * s, (gfh - .7) * s, s, { transom: true, dark: true, person: b !== ent - 1 && RND() < .6 });
      } else {
        const ww = bw * ratio, wh = Math.min(gfh * .55, gfh - 1.3);
        o += frWindow(X(x0 + (bw - ww) / 2), Y(.9 + wh), ww * s, wh * s, s, { curtain: cur });
      }
    }
    // upper floors
    for (let k = 1; k < n; k++) {
      const z0 = L[k], hf = L[k + 1] - L[k], zt = z0 + hf - (band ? .55 : .45);
      for (let b = 0; b < bays; b++) {
        const x0 = b * bw;
        if (wt === 'french' || wt === 'punched') {
          const ww = clamp(bw * ratio, .8, bw - .5), wx = x0 + (bw - ww) / 2, zb = wt === 'french' ? z0 + .12 : z0 + .9;
          o += frWindow(X(wx), Y(zt), ww * s, (zt - zb) * s, s, { rail: wt === 'french', curtain: cur, person: RND() < .22, transom: wt === 'punched' });
        } else if (wt === 'vertical') {
          const ww = Math.max(.45, bw * ratio * .4);
          [x0 + bw * .27 - ww / 2, x0 + bw * .73 - ww / 2].forEach(wx => o += frWindow(X(wx), Y(zt), ww * s, (zt - z0 - .3) * s, s, { mullion: false, curtain: cur }));
        }
      }
      if (wt === 'ribbon') o += frWindow(X(.5), Y(zt), (W - 1) * s, (zt - z0 - .9) * s, s, { curtain: cur });
      if (wt === 'curtain') {
        o += rect(X(.25), Y(L[k + 1] - (band ? .25 : 0)), (W - .5) * s, (hf - (band ? .25 : 0)) * s, { fill: 'url(#glassG)' });
        for (let x = .25; x <= W - .25 + 1e-6; x += (W - .5) / (bays * 3)) o += line(X(x), Y(L[k + 1]), X(x), Y(z0), { stroke: '#2f2d2a', strokeWidth: Math.max(1, .05 * s) });
        o += rect(X(.25), Y(z0 + .9), (W - .5) * s, .9 * s, { fill: '#3a3a3a', fillOpacity: .55 });
      }
    }
    o += poly(sp, { fill: 'none', stroke: '#222', strokeWidth: 1.2 });
    // people
    if (chk('v-ppl')) { o += fig(X(-2.9), gy, 1.78 * s, { fill: '#8f8f8f', pose: 1, flip: false }) + fig(X(-2.2), gy, 1.66 * s, { fill: '#9a9a9a', pose: 2, flip: false }); }
    o += line(X(-3.6), gy, X(W + 3.6), gy, { stroke: '#222', strokeWidth: 1.6 });
    if (!secOn && chk('v-lvl')) {
      const lx = X(W) + 34;
      L.forEach((z, k) => o += levelMark(lx, Y(z), k === 0 ? 'GL' : k === n ? 'RF' : `${k + 1}FL`, (z ? '+' : '±') + mm(z)));
    }
    // ---------- section strip
    if (secOn) {
      const sx0 = X(W) + 3.8 * s, SX = x => sx0 + x * s;
      const wl = [['brick', .115], ['air', .04], ['insul', .14], ['conc', .2]], wt2 = wl.reduce((t, q) => t + q[1], 0), slab = .22, fin = .1;
      const st = { stroke: '#222', strokeWidth: .7 };
      // earth + ground slab
      o += rect(SX(-.6), Y(-.05), (sd + 1.2) * s, 1.3 * s, { fill: 'url(#h-earth)' }) + rect(SX(-.6), gy, .6 * s, .35 * s, { fill: '#ecebe7' });
      o += rect(SX(wt2 - .2), Y(0), (sd - wt2 + .2) * s, .32 * s, { fill: 'url(#h-conc)', ...st }) + rect(SX(-.1), Y(-.32), (wt2 + .4) * s, .6 * s, { fill: 'url(#h-conc)', ...st });
      // wall per floor with openings
      for (let k = 0; k < n; k++) {
        const z0 = L[k], z1 = L[k + 1] - slab, hf = L[k + 1] - L[k];
        const ob = k === 0 ? (gr === 'arch' || gr === 'shop' ? .05 : .9) : (wt === 'french' ? .12 : wt === 'curtain' ? 0 : .9), ot = k === 0 ? gfh - .7 : hf - (band ? .55 : .45);
        let x = 0;
        wl.forEach(([h, t]) => {
          const segs = [[z0, z0 + ob], [z0 + ot, z1 + slab]].filter(([a, b]) => b - a > .01);
          segs.forEach(([a, b]) => o += rect(SX(x), Y(b), t * s, (b - a) * s, { fill: `url(#h-${h})`, ...st }));
          x += t;
        });
        // window frame in section
        o += rect(SX(.08), Y(z0 + ot), .1 * s, (ot - ob) * s, { fill: '#fff', stroke: '#222', strokeWidth: .6 }) + line(SX(.13), Y(z0 + ot), SX(.13), Y(z0 + ob), { stroke: '#222', strokeWidth: .5 });
        if (k > 0 && wt === 'french') o += line(SX(-.05), Y(z0 + ob), SX(-.05), Y(z0 + 1.05), { stroke: '#222', strokeWidth: 1.2 }) + line(SX(-.1), Y(z0 + 1.05), SX(.05), Y(z0 + 1.05), { stroke: '#222', strokeWidth: 1.4 });
        // slab above
        if (k < n) {
          const zs = L[k + 1];
          o += rect(SX(.155), Y(zs), (sd - .155) * s, slab * s, { fill: 'url(#h-conc)', ...st });
          if (k + 1 < n) o += rect(SX(wt2), Y(zs + fin), (sd - wt2) * s, fin * s, { fill: 'url(#h-mortar)', ...st }) + line(SX(wt2), Y(zs + fin - .03), SX(sd), Y(zs + fin - .03), { stroke: '#222', strokeWidth: .4 });
        }
        // interior line furniture
        const kinds = ['table', 'desk', 'bed', 'table', 'sofa'];
        const kind = kinds[k % kinds.length], fz = k === 0 ? 0 : z0 + fin;
        o += lineFurn(kind, wt2 + .8, fz, s, SX, Y);
        if (k === 0) { [1.4, 2.0, 2.6].forEach(px => { if (px < sd - .3) o += line(SX(wt2 + px), Y(z1), SX(wt2 + px), Y(z1 - rr(.9, 1.6)), { stroke: '#4a4a4a', strokeWidth: .5 }) + circ(SX(wt2 + px), Y(z1 - 1.0), Math.max(2, .09 * s), { fill: '#d9a441', fillOpacity: .5, stroke: '#4a4a4a', strokeWidth: .4 }); }); }
        else o += line(SX(wt2 + 1.6), Y(z1), SX(wt2 + 1.6), Y(z1 - .7), { stroke: '#4a4a4a', strokeWidth: .5 }) + path(`M${f2(SX(wt2 + 1.45))} ${f2(Y(z1 - .7))}h${f2(.3 * s)}l${f2(-.08 * s)} ${f2(.12 * s)}h${f2(-.14 * s)}z`, { fill: '#fff', stroke: '#4a4a4a', strokeWidth: .5 });
        if (k % 2 === 0 && sd > 2.6) o += lineFig(SX(Math.min(sd - .6, wt2 + 2.7)), Y(fz), 1.7 * s, { pose: 2 });
        if (k > 0) [.3, .55].forEach(f => o += rect(SX(sd - .7), Y(z1 - f * hf * .9), .55 * s, .03 * s, { fill: 'none', stroke: '#4a4a4a', strokeWidth: .5 }));
        // level labels
        const lx = SX(sd) + 22;
        o += poly([[lx, Y(z0 + (k ? fin : 0))], [lx - 5, Y(z0 + (k ? fin : 0)) - 7], [lx + 5, Y(z0 + (k ? fin : 0)) - 7]], { fill: '#222' }) + text(lx + 10, Y(z0 + (k ? fin : 0)) - 2, `FFL ${k + 1}F`, { fontSize: 9.5, fontWeight: 700 }) + text(lx + 10, Y(z0 + (k ? fin : 0)) + 9, (z0 ? '+' : '±') + (z0 + (k ? fin : 0)).toFixed(2) + ' m', { fontSize: 8.5, fontFamily: MONO, fill: '#555' });
        o += poly([[lx, Y(z1)], [lx - 5, Y(z1) + 7], [lx + 5, Y(z1) + 7]], { fill: 'none', stroke: '#222', strokeWidth: .7 }) + text(lx + 10, Y(z1) + 9, `천장 +${z1.toFixed(2)} m`, { fontSize: 8.5, fontFamily: MONO, fill: '#555' });
      }
      // roof build-up + parapet
      o += rect(SX(wt2), Y(top + .3), (sd - wt2) * s, .24 * s, { fill: 'url(#h-insul)', ...st }) + rect(SX(wt2), Y(top + .36), (sd - wt2) * s, .06 * s, { fill: 'url(#h-gravel)', ...st });
      o += rect(SX(0), Y(top + ridge), wt2 * s, ridge * s, { fill: 'url(#h-conc)', ...st }) + rect(SX(-.08), Y(top + ridge + .06), (wt2 + .16) * s, .06 * s, { fill: '#222' });
      // break line on the right
      const bx = SX(sd), pts = [];
      for (let z = -1.2; z <= top + .6; z += .6) pts.push([bx + (Math.round(z / .6) % 2 ? 4 : -4), Y(z)]);
      o += rect(bx, Y(top + .6), 30, (top + 1.8) * s, { fill: '#fff' }) + pline(pts, { fill: 'none', stroke: '#222', strokeWidth: .8 });
      o += text(SX(0), Y(top + ridge) - 18, 'SECTION', { fontSize: 10, fontFamily: MONO, letterSpacing: '.12em', fill: '#666' });
    }
    o = o.replace('__PTS__', ptsStr);
    o += text(40, 56, 'ELEVATION', { fontSize: 11, fontFamily: MONO, letterSpacing: '.14em', fill: '#666' }) + text(40, 84, `정면도${secOn ? ' + 입면 상세 단면' : ''} · ${MAT_KO[G.mat]}`, { fontSize: 20, fontWeight: 800 });
    o += block(SW, SH, '입면도', scaleTxt(s), 'A-201');
    const winEn = { french: `tall French windows with black Juliet balcony railings, ${bays} per floor`, punched: `punched windows with dark frames, ${bays} per floor`, ribbon: 'continuous ribbon windows', curtain: 'glass curtain wall with dark spandrels', vertical: 'paired vertical slit windows' }[wt];
    const grEn = { arch: 'tall arched ground-floor openings with dark steel frames and people visible inside', shop: 'fully glazed shopfront with transoms', plain: 'punched ground-floor windows' }[gr];
    return {
      title: '입면도', meta: `${W}m · ${n}F · H ${f2(top + ridge)}m`, w: SW, h: SH, svg: sheet(SW, SH, o, defs.replace('__PTS__', ptsStr)),
      prompt: {
        type: 'architectural elevation with section strip',
        parts: [
          ['도면 유형', `rendered orthographic front elevation of a ${n}-story ${USE_EN[G.use]}${secOn ? ' paired with a narrow line-drawn facade section on the right' : ''}, flat frontal view, no perspective`],
          ['비례', `${W} m wide, ${bays} bays, ground floor ${gfh} m, upper floors ${fh} m, total height ${f2(top + ridge)} m`],
          ['재료', `${MAT_EN[G.mat]} with realistic texture variation brick by brick, subtle grain, light stone floor bands and coping`],
          ['개구부', `${winEn}; ${grEn}; sheer white curtains, glass with soft gray gradient and deep reveal shadows`],
          ['점경', 'flat gray silhouette people, a pale translucent tree silhouette on the left'],
          secOn ? ['단면 스트립', 'line drawing of wall and slab build-ups with hatching, interior furniture in thin lines, level labels FFL and ceiling heights in meters, break line on the right'] : ['지붕', roof],
        ],
        neg: ['perspective', 'vanishing point', 'tilted camera', 'cartoon', 'oversaturated colors', 'random balconies'],
        ko: `벽돌 한 장 단위 질감, 커튼·난간·아치까지 그린 입면과 단면 스트립입니다. 레퍼런스 4번 보드처럼 수채 톤을 원하면 스타일을 '수채화 렌더'로 바꾸세요.`,
      }
    };
  };

  /* =========================================================
     04  SECTION PERSPECTIVE (competition board)
     ========================================================= */
  window.drawSection = function () {
    const persp = segVal('s-mode') === 'persp';
    const W = clamp(num('s-w'), 6, 200), n = clamp(Math.round(num('s-n')), 1, 20), gfh = clamp(num('s-gfh'), 2.4, 12), fh = clamp(num('s-fh'), 2.4, 10);
    const b = clamp(Math.round(num('s-b')), 0, 4), sl = clamp(num('s-slab'), 150, 1500) / 1000, roof = $('#s-roof').value, t = .45, bh = Math.max(4, fh);
    const ACCN = $('#s-acc').value, POCHE = '#3a221e', EARTH = '#4b2c26';
    const rows = $('#s-rooms').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [nm, gp] = l.split('|').map(x => (x || '').trim()); return { name: nm.replace(/\*/g, '').trim(), acc: /\*/.test(nm), group: gp || '' }; });
    const lv = []; for (let k = -b; k <= n; k++) lv.push(k <= 0 ? k * bh : (k === 1 ? gfh : gfh + (k - 1) * fh));
    const lev = k => lv[k + b], top = lev(n), ridge = roof === 'gable' ? W * .5 * Math.tan(25 * Math.PI / 180) : 1.2, bot = lev(-b) - 1.0;
    const atrP = num('s-atr') / 100, atrOn = atrP > .05 && n >= 2, ax1 = W * (.5 - atrP / 2), ax2 = W * (.5 + atrP / 2);
    const SW = 1400, LX = 270, RX = SW - 40;
    const s = Math.min((RX - LX) / (W + 10), (1150 - 220) / (top + ridge + 6 - bot)), gx = LX + ((RX - LX) - W * s) / 2, gy = 70 + (top + ridge + 6) * s;
    const SH = Math.round(gy - bot * s + 150);
    const X = x => gx + x * s, Y = z => gy - z * s;
    const D = num('s-depth'), d0 = 14, kB = d0 / (d0 + D);
    const eyeLvl = parseInt($('#s-eye').value || '1', 10), vz = lev(clamp(eyeLvl - 1, -b, n - 1)) + 1.6, vx = W * num('s-vpx') / 100, VP = [X(vx), Y(vz)];
    const pb = (p, kk = kB) => [VP[0] + (p[0] - VP[0]) * kk, VP[1] + (p[1] - VP[1]) * kk];
    seed(42);
    let o = '';
    // sky + clouds
    o += rect(0, 0, SW, Y(0), { fill: 'url(#skyG)' });
    if (chk('s-sky')) {
      for (let i = 0; i < 6; i++) { const cx = rr(80, SW - 80), cy = rr(60, Y(top) - 40); o += `<path d="${blob(cx, cy, rr(70, 150), rr(22, 40), 10, .5)}" fill="#cfcac0" fill-opacity=".55" filter="url(#blur6)"/>`; }
      for (let i = 0; i < 9; i++) { const bx = rr(SW * .55, SW - 60), by = rr(50, 160), w2 = rr(4, 7); o += path(`M${f2(bx - w2)} ${f2(by - w2 * .4)}Q${f2(bx - w2 / 2)} ${f2(by - w2 * .8)} ${f2(bx)} ${f2(by)}Q${f2(bx + w2 / 2)} ${f2(by - w2 * .8)} ${f2(bx + w2)} ${f2(by - w2 * .4)}`, { fill: 'none', stroke: '#333', strokeWidth: 1 }); }
    }
    // city backdrop
    if (chk('s-city')) {
      o += rect(X(W * .45), Y(top + ridge + 28), W * .1 * s, (top + ridge + 28) * s, { fill: '#e7e4dd', stroke: '#cfcac0', strokeWidth: .7 });
      for (let i = 0; i < 9; i++) {
        const bw2 = rr(8, 18), bx = i < 4 ? rr(-14, W * .35) : rr(W * .6, W + 10), bh2 = top * rr(.7, 1.6);
        o += rect(X(bx), Y(bh2), bw2 * s, bh2 * s, { fill: '#efece6', stroke: '#d3cec4', strokeWidth: .7 });
        for (let z = 3; z < bh2 - 1; z += 3.2) o += line(X(bx + .6), Y(z), X(bx + bw2 - .6), Y(z), { stroke: '#dfdbd2', strokeWidth: .5 });
      }
      // near neighbours in elevation, cut by the frame
      o += rect(X(-10), Y(top * .95), 9.2 * s, top * .95 * s, { fill: '#f1efea', stroke: '#bdb7ab', strokeWidth: .8 });
      for (let z = 3; z < top * .95 - 1; z += 3.4) for (let x = -9.4; x < -1.6; x += 1.8) o += rect(X(x), Y(z + 1.9), 1.0 * s, 1.6 * s, { fill: '#e2e0da', stroke: '#c9c4b9', strokeWidth: .4 });
      o += rect(X(W + .8), Y(top * .8), 10 * s, top * .8 * s, { fill: '#f1efea', stroke: '#bdb7ab', strokeWidth: .8 });
    }
    // earth
    o += rect(0, Y(0), SW, SH - Y(0), { fill: EARTH });
    o += rect(0, Y(0), SW, 4, { fill: '#2a1714' });
    // rooms
    const rooms = [];
    for (let f = -b; f < n; f++) {
      const z1 = lev(f), z2 = lev(f + 1) - sl, row = rows[f + b] || {};
      if (atrOn && f >= 0) { rooms.push({ x1: t, x2: ax1, z1, z2, f, row, open: 'r' }); rooms.push({ x1: ax2, x2: W - t, z1, z2, f, row, open: 'l' }); }
      else rooms.push({ x1: t, x2: W - t, z1, z2, f, row });
    }
    if (atrOn) rooms.push({ x1: ax1, x2: ax2, z1: lev(0), z2: lev(n) - sl, f: 0, row: rows[b] || {}, atrium: true });
    rooms.forEach((r, i) => {
      seed(500 + i);
      const A = [X(r.x1), Y(r.z2)], Bq = [X(r.x2), Y(r.z2)], Cq = [X(r.x2), Y(r.z1)], Dq = [X(r.x1), Y(r.z1)];
      const accent = r.atrium || r.row.acc;
      const below = r.f < 0;
      // basement levels get their own eye level so their floor reads, as on competition boards
      const VPl = below ? [VP[0], Y(r.z1 + 2.2)] : VP;
      const pb = (p, kk = kB) => [VPl[0] + (p[0] - VPl[0]) * kk, VPl[1] + (p[1] - VPl[1]) * kk];
      o += `<clipPath id="sp${i}"><rect x="${f2(A[0])}" y="${f2(A[1])}" width="${f2(Bq[0] - A[0])}" height="${f2(Dq[1] - A[1])}"/></clipPath><g clip-path="url(#sp${i})">`;
      if (persp) {
        const a = pb(A), bb = pb(Bq), c = pb(Cq), d = pb(Dq);
        o += poly([A, Bq, bb, a], { fill: '#f3f1ec' });
        o += poly([Dq, Cq, c, d], { fill: accent ? ACCN : '#e6e1d8' });
        o += poly([A, a, d, Dq], { fill: r.atrium ? '#f7f5f0' : r.open === 'l' ? '#f6f4ef' : '#ebe7df' });
        o += poly([Bq, bb, c, Cq], { fill: r.atrium ? '#f2efe9' : r.open === 'r' ? '#f6f4ef' : '#e4dfd5' });
        if (r.atrium) for (let f = 1; f < n; f++) {
          // floor edges stacked around the void, receding to the vanishing point
          [r.x1, r.x2].forEach(xe => {
            const f1 = [X(xe), Y(lev(f))], f0 = [X(xe), Y(lev(f) - sl)], b1 = pb(f1), b0 = pb(f0);
            o += poly([f1, b1, b0, f0], { fill: '#5d4038' });
            const r1 = [X(xe), Y(lev(f) + 1.1)], rb = pb(r1);
            o += poly([f1, b1, rb, r1], { fill: '#dfe6e6', fillOpacity: .45 }) + line(...r1, ...rb, { stroke: '#7d7d7d', strokeWidth: .7 });
            if (chk('s-ppl')) for (let q = 0; q < 2; q++) { const kk = d0 / (d0 + D * rr(.15, .8)), p = pb([X(xe), Y(lev(f))], kk); o += fig(p[0] + (xe === r.x1 ? -1 : 1) * rr(2, 6), p[1], 1.72 * s * kk, { fill: '#3a3a3a', op: .8 }); }
          });
        }
        const fl = accent ? '#d9776e' : '#d3ccbf', nb = Math.max(4, Math.round((r.x2 - r.x1) / 1.5));
        for (let j = 0; j <= nb; j++) { const fx = Dq[0] + (Cq[0] - Dq[0]) * j / nb; o += line(fx, Dq[1], ...pb([fx, Dq[1]]), { stroke: fl, strokeWidth: .5 }) + line(fx, A[1], ...pb([fx, A[1]]), { stroke: '#e3dfd6', strokeWidth: .45 }); }
        for (let j = 1; j < 6; j++) { const kk = 1 - (1 - kB) * j / 6; o += line(...pb(Dq, kk), ...pb(Cq, kk), { stroke: fl, strokeWidth: .45 }) + line(...pb(A, kk), ...pb(Bq, kk), { stroke: '#e3dfd6', strokeWidth: .4 }); }
        o += poly([a, bb, c, d], { fill: '#f1eee8', stroke: '#b9b2a5', strokeWidth: .6 });
        // back wall: curtain wall above ground, shelving below
        const bw2 = bb[0] - a[0], bh2 = d[1] - a[1];
        if (!below) { o += rect(a[0], a[1] + bh2 * .08, bw2, bh2 * .84, { fill: '#e3e8e8' }); for (let x = a[0]; x <= bb[0]; x += Math.max(8, 2.4 * s * kB)) o += line(x, a[1], x, d[1], { stroke: '#b7bdbd', strokeWidth: .5 }); }
        else for (let q = 1; q < 6; q++) o += line(a[0], a[1] + bh2 * q / 6, bb[0], a[1] + bh2 * q / 6, { stroke: '#b7b0a3', strokeWidth: .5 });
        // columns at mid depth
        const km = d0 / (d0 + D * .55);
        for (let x = r.x1 + 6; x < r.x2 - 2; x += 8) { const p1 = pb([X(x), Y(r.z2)], km), p2 = pb([X(x), Y(r.z1)], km); o += rect(p1[0] - .3 * s * km, p1[1], .6 * s * km, p2[1] - p1[1], { fill: '#dcd6cb', stroke: '#bdb5a8', strokeWidth: .4 }); }
        // archive shelving rows in basement
        if (below) for (let q = 3; q >= 0; q--) { const kk = d0 / (d0 + D * (.25 + q * .17)); for (let x = r.x1 + 1.5; x < r.x2 - 1.5; x += 4.5) { const p1 = pb([X(x), Y(r.z1 + 2.6)], kk), p2 = pb([X(x + 3.2), Y(r.z1)], kk); o += rect(p1[0], p1[1], p2[0] - p1[0], p2[1] - p1[1], { fill: '#ece7de', stroke: '#9d958a', strokeWidth: .5 }); for (let j = 1; j < 5; j++) o += line(p1[0], p1[1] + (p2[1] - p1[1]) * j / 5, p2[0], p1[1] + (p2[1] - p1[1]) * j / 5, { stroke: '#b3ab9e', strokeWidth: .45 }); } }
        // escalators across the atrium
        if (r.atrium && chk('s-esc')) {
          const ke = d0 / (d0 + D * .22);
          for (let f = 0; f < n - 1; f++) {
            const za = lev(f), zb = lev(f + 1), dir = f % 2 ? -1 : 1, xa = dir > 0 ? ax1 + .6 : ax2 - .6, xb = dir > 0 ? ax2 - .6 : ax1 + .6;
            const p = (x, z) => pb([X(x), Y(z)], ke), q = [p(xa, za), p(xb, zb), p(xb, zb + .9), p(xa, za + .9)];
            o += poly(q, { fill: '#fff', fillOpacity: .5, stroke: ACCN, strokeWidth: 1.6 });
            const ns = Math.round((zb - za) / .25);
            for (let j = 1; j < ns; j++) { const fx = xa + (xb - xa) * j / ns, fz = za + (zb - za) * j / ns; o += line(...p(fx, fz), ...p(fx, fz + .25), { stroke: ACCN, strokeWidth: .5 }); }
            o += line(...p(xa, za + 1.0), ...p(xb, zb + 1.0), { stroke: '#555', strokeWidth: .7 });
            if (chk('s-ppl')) for (let j = 1; j < 4; j++) { const fx = xa + (xb - xa) * j / 4, fz = za + (zb - za) * j / 4, pp = p(fx, fz); o += fig(pp[0], pp[1], 1.7 * s * ke, { fill: '#2a2a2a', op: .85 }); }
          }
        }
        // people, tables, trees
        if (chk('s-ppl')) {
          const cnt = Math.max(3, Math.round((r.x2 - r.x1) / (r.atrium ? 2.2 : 2.8)));
          const ppl = [];
          for (let j = 0; j < cnt; j++) ppl.push([rr(r.x1 + .6, r.x2 - .6), rr(.08, .95)]);
          ppl.sort((p, q) => q[1] - p[1]).forEach(([x, dd]) => {
            const kk = d0 / (d0 + D * dd), p = pb([X(x), Y(r.z1)], kk);
            if (RND() < .18 && !below) o += `<ellipse cx="${f2(p[0] + 8 * kk)}" cy="${f2(p[1] - .75 * s * kk)}" rx="${f2(.5 * s * kk)}" ry="${f2(.12 * s * kk)}" fill="#fff" stroke="#8d857a" stroke-width=".5"/>`;
            o += fig(p[0], p[1], 1.72 * s * kk, { fill: dd > .6 ? '#6d6d6d' : '#2a2a2a', op: dd > .6 ? .7 : .95 });
          });
        }
        if ((r.atrium && r.z1 >= 0) || (r.f === n - 1 && chk('s-garden'))) {
          const kk = d0 / (d0 + D * .5);
          for (let j = 0; j < (r.atrium ? 3 : 4); j++) { const x = rr(r.x1 + 1.2, r.x2 - 1.2), p = pb([X(x), Y(r.z1)], kk); o += darkTree(p[0], p[1], Math.min(r.z2 - r.z1 - .4, 5.5) * s * kk); }
        }
      } else {
        o += rect(A[0], A[1], Bq[0] - A[0], Dq[1] - A[1], { fill: '#fbfaf7' });
        for (let x = r.x1 + 1; x < r.x2 - 2.5; x += 3.6) o += rect(X(x), Y(Math.min(r.z2 - .4, r.z1 + 2.8)), 2.2 * s, (Math.min(r.z2 - .4, r.z1 + 2.8) - r.z1 - .9) * s, { fill: 'none', stroke: '#cdc6b9', strokeWidth: .7 });
        if (accent) o += rect(A[0], Dq[1] - 3, Bq[0] - A[0], 3, { fill: ACCN });
        if (r.atrium && chk('s-esc')) for (let f = 0; f < n - 1; f++) {
          const za = lev(f), zb = lev(f + 1), dir = f % 2 ? -1 : 1, xa = dir > 0 ? ax1 + .6 : ax2 - .6, xb = dir > 0 ? ax2 - .6 : ax1 + .6;
          o += poly([[X(xa), Y(za)], [X(xb), Y(zb)], [X(xb), Y(zb + .9)], [X(xa), Y(za + .9)]], { fill: '#fff', stroke: ACCN, strokeWidth: 1.6 });
          const ns = Math.round((zb - za) / .25);
          for (let j = 1; j < ns; j++) { const fx = xa + (xb - xa) * j / ns, fz = za + (zb - za) * j / ns; o += line(X(fx), Y(fz), X(fx), Y(fz + .25), { stroke: ACCN, strokeWidth: .5 }); }
          o += line(X(xa), Y(za + 1.0), X(xb), Y(zb + 1.0), { stroke: '#555', strokeWidth: .7 });
        }
        if (chk('s-ppl')) for (let j = 0; j < Math.max(1, Math.round((r.x2 - r.x1) / 6)); j++) o += fig(X(rr(r.x1 + .6, r.x2 - .6)), Y(r.z1), 1.72 * s, { fill: '#2a2a2a' });
      }
      o += '</g>';
      if (r.open) { const xe = r.open === 'r' ? r.x2 : r.x1; o += line(X(xe), Y(r.z1 + 1.1), X(xe), Y(r.z1), { stroke: '#6b6b6b', strokeWidth: .8 }) + line(X(xe) - 4, Y(r.z1 + 1.1), X(xe) + 4, Y(r.z1 + 1.1), { stroke: '#6b6b6b', strokeWidth: 1.4 }); }
    });
    if (persp) o += circ(VP[0], VP[1], 2.2, { fill: ACCN });
    // ---- poché
    const PC = { fill: POCHE };
    const wall = (x, z1, z2) => o += rect(X(x), Y(z2), t * s, (z2 - z1) * s, PC);
    [0, W - t].forEach(x => {
      wall(x, bot + .3, 0);
      for (let f = 0; f < n; f++) {
        const z1 = lev(f), z2 = lev(f + 1), head = z2 - sl - .1, sill = z1 + (f === 0 ? .1 : .4);
        wall(x, z1, sill); wall(x, head, z2);
        o += rect(X(x), Y(head), t * s, (head - sill) * s, { fill: '#e6eceb', fillOpacity: .5 }) + line(X(x + t / 2), Y(head), X(x + t / 2), Y(sill), { stroke: '#6f7778', strokeWidth: .8 });
      }
      if (roof === 'flat') wall(x, top, top + ridge);
    });
    for (let f = -b + 1; f <= n; f++) {
      const z = lev(f);
      let segs = [[0, W]];
      if (atrOn && f >= 1 && f < n) segs = [[0, ax1], [ax2, W]];
      segs.forEach(([a1, a2]) => { o += rect(X(a1), Y(z), (a2 - a1) * s, sl * s, PC); if (rows[f + b] && rows[f + b].acc && f > 0) o += rect(X(a1), Y(z) - 2.5, (a2 - a1) * s, 2.5, { fill: ACCN }); });
    }
    if (b === 0) o += rect(X(0), Y(0), W * s, sl * s, PC);
    o += rect(X(-.6), Y(lev(-b)), (W + 1.2) * s, .9 * s, PC);
    if (roof === 'gable') { const th = .5; o += poly([[X(-.8), Y(top - .2)], [X(W / 2), Y(top + ridge)], [X(W + .8), Y(top - .2)], [X(W + .8), Y(top - .2 - th)], [X(W / 2), Y(top + ridge - th)], [X(-.8), Y(top - .2 - th)]], PC); }
    // roof garden
    if (chk('s-garden') && roof === 'flat') {
      o += rect(X(t), Y(top + .5), (W - 2 * t) * s, .5 * s, { fill: '#5c4335' });
      seed(77); for (let j = 0; j < Math.max(3, Math.round(W / 7)); j++) o += darkTree(X(rr(2, W - 2)), Y(top + .5), rr(4, 6.5) * s);
      if (chk('s-ppl')) for (let j = 0; j < Math.max(2, Math.round(W / 9)); j++) o += fig(X(rr(2, W - 2)), Y(top + .5), 1.72 * s, { fill: '#2a2a2a' });
    }
    // plaza entourage
    seed(91);
    o += rect(X(-14), Y(0) - 2, 13.6 * s, 2, { fill: '#8d857a' }) + rect(X(W + .4), Y(0) - 2, 14 * s, 2, { fill: '#8d857a' });
    if (chk('s-ppl')) { [-6, -3.2, W + 2.5, W + 5].forEach(x => o += fig(X(x), Y(0), 1.75 * s, { fill: '#2a2a2a' })); o += darkTree(X(-8.5), Y(0), 7 * s) + darkTree(X(W + 7), Y(0), 6 * s); }
    // ---- level labels with program groups
    const lx = 150;
    const groups = [];
    for (let f = -b; f < n; f++) {
      const z = lev(f), row = rows[f + b] || {}, yy = Y(z);
      o += line(lx - 6, yy, X(0) - 6, yy, { stroke: '#8a8378', strokeWidth: .5, strokeDasharray: '2 3' });
      o += poly([[lx - 2, yy], [lx - 8, yy - 7], [lx + 4, yy - 7]], { fill: 'none', stroke: '#333', strokeWidth: .7 });
      const lc = z <= 0 ? '#f1e7d4' : '#222', halo = z <= 0 ? {} : { stroke: '#f6f4ef', strokeWidth: 3, paintOrder: 'stroke' };
      o += text(lx + 10, yy - 4, (z > 0 ? '+' : z < 0 ? '−' : '±') + Math.abs(z).toFixed(1), { fontSize: 10, fontFamily: MONO, fill: lc, ...halo });
      o += text(lx + 10, yy + 10, row.name || (f < 0 ? `B${-f}` : `${f + 1}F`), { fontSize: 10.5, fill: lc, ...halo });
      if (row.group) { const g = groups[groups.length - 1]; if (g && g.name === row.group) g.z2 = lev(f + 1); else groups.push({ name: row.group, z1: z, z2: lev(f + 1) }); }
    }
    o += line(lx - 6, Y(top), X(0) - 6, Y(top), { stroke: '#8a8378', strokeWidth: .5, strokeDasharray: '2 3' }) + text(lx + 10, Y(top) - 4, '+' + top.toFixed(1), { fontSize: 10, fontFamily: MONO }) + text(lx + 10, Y(top) + 10, chk('s-garden') ? '옥상 정원' : 'Roof', { fontSize: 10.5 });
    groups.forEach(g => {
      const y1 = Y(g.z2) + 4, y2 = Y(g.z1) - 4, my = (y1 + y2) / 2;
      const gc = g.z2 <= 0 ? '#f1e7d4' : '#333';
      o += line(lx - 26, y1, lx - 26, y2, { stroke: gc, strokeWidth: .9 }) + line(lx - 26, y1, lx - 20, y1, { stroke: gc, strokeWidth: .9 }) + line(lx - 26, y2, lx - 20, y2, { stroke: gc, strokeWidth: .9 });
      o += `<text x="${lx - 34}" y="${f2(my)}" transform="rotate(-90 ${lx - 34} ${f2(my)})" text-anchor="middle" font-family="${esc(FONT)}" font-size="15" font-weight="300" fill="${gc}">${esc(g.name)}</text>`;
    });
    o += text(SW / 2, SH - 70, `${G.project} — ${persp ? 'Section Perspective' : 'Section'} A-A′`, { fontSize: 13, textAnchor: 'middle', fill: '#f1e7d4' });
    const ttl = persp ? '단면투시도' : '단면도';
    o += `<g>${rect(0, SH - 58, SW, 58, { fill: '#fff' })}${block(SW, SH, ttl, persp ? 'N.T.S.' : scaleTxt(s), 'A-301')}</g>`;
    return out(ttl, `${W}m · B${b}/${n}F · H ${f2(top)}m`, SW, SH, o, '', {
      type: persp ? 'architectural section perspective' : 'architectural building section',
      parts: [
        ['도면 유형', persp ? `competition-board section perspective of a ${USE_EN[G.use]}: orthographic cut in the foreground, one-point perspective interiors receding to a single vanishing point` : `competition-board building section of a ${USE_EN[G.use]}`],
        ['층 구성', `${n} floors above ground${b ? ` and ${b} basement level${b > 1 ? 's' : ''}` : ''}, ground floor ${gfh} m, typical floor ${fh} m${atrOn ? `, a central multi-storey atrium ${Math.round(atrP * 100)}% of the width with crisscrossing escalators` : ''}`],
        ['프로그램', rows.slice(0, n + b).map((r, i) => `${i - b < 0 ? 'B' + (b - i) : (i - b + 1) + 'F'} ${r.name}${r.group ? ' (' + r.group + ')' : ''}`).join(', ')],
        ['절단 표현', `dark maroon-brown poché for slabs, walls and foundation, dark brown earth below grade, ${ACCN === '#b3261e' ? 'red' : 'accent-colored'} public floors and escalators`],
        ['분위기', 'dense crowds of small black silhouettes, trees in the atrium and on the roof garden, pale skyline buildings behind, soft watercolor clouds and birds, level markers on the left with program groups in vertical brackets'],
        ['맥락', CTX_EN[G.context]],
      ],
      neg: ['two-point perspective', 'multiple vanishing points', 'fisheye', 'empty interiors', 'missing slabs', 'photo noise'],
      ko: `레퍼런스 1번처럼 어두운 포셰 + 강조색 동선 + 아트리움 에스컬레이터 + 군중 + 하늘·도시 배경까지 그렸습니다. 소실점과 눈높이는 왼쪽에서 조정하세요.`,
    });
  };

  /* =========================================================
     05  DETAILED WALL SECTION (line art)
     ========================================================= */
  const GROUND_UP = [['벽돌 마감', 80, 'brick'], ['시멘트 몰탈', 50, 'mortar'], ['압출법 보온판', 100, 'zig'], ['방습층', 2, 'membrane'], ['콘크리트 슬래브', 450, 'conc']];
  const FLOOR_UP = [['테라조 타일', 20, 'tile'], ['몰탈 (온수배관)', 60, 'mortar'], ['차음 완충재', 30, 'zig'], ['RC 슬래브', 250, 'conc']];
  const TERR_UP = [['테라조 타일', 25, 'tile'], ['구배 몰탈 1/50', 100, 'mortar'], ['방수층', 5, 'membrane'], ['RC 캔틸레버 슬래브', 250, 'conc']];
  const CEIL = [['구조용 합판', 20, 'ply'], ['단열재', 100, 'zig']];
  const _assembly = window.drawDetail;
  window.drawDetail = function () {
    if (segVal('d-mode') !== 'wall') return _assembly();
    const n = clamp(Math.round(num('d-n')), 1, 4), fh = clamp(num('d-fh'), 2.6, 5), roofT = $('#d-roof').value, terr = chk('d-terr'), street = chk('d-street');
    const pk = $('#d-preset').value, pr = PRESETS[pk];
    let wallL = pr && pr.orient === 'wall' ? parseLayers() : null;
    if (!wallL || !wallL.length) { $('#d-layers').value; wallL = PRESETS.wallTimber.layers.split('\n').map(l => l.split('|').map(x => x.trim())).map(a => ({ name: a[0], t: parseFloat(a[1]), h: a[2] })); }
    const T = wallL.reduce((q, l) => q + l.t, 0) / 1000;
    const fu = FLOOR_UP.reduce((q, l) => q + l[1], 0) / 1000, slab = .25, finTop = fu - slab;
    const SW = 1000, xl = -6.6, xr = 4.6; let SH = 1700;
    const roofH = roofT === 'glass' ? 3.2 + 4.5 * .05 + .4 : 1.4, Htot = n * fh + roofH;
    const s = Math.min((SW - 60) / (xr - xl), (SH - 300) / (Htot + 1.6));
    let NT = '';
    const ox = 30 - xl * s, gy = 130 + (Htot + .3) * s;
    SH = Math.round(gy + 2.3 * s + 120);
    const X = x => ox + x * s, Y = z => gy - z * s, cut = { stroke: '#111', strokeWidth: 1.3 }, thin = { stroke: '#222', strokeWidth: .5 };
    seed(23);
    let o = '', defs = '';
    // ---- sky hatching with clouds
    if (chk('d-sky')) {
      defs += `<mask id="cloudM"><rect width="${SW}" height="${SH}" fill="#fff"/>`;
      const clouds = [];
      for (let i = 0; i < 4; i++) { const cx = rr(80, SW - 120), cy = rr(150, Y(n * fh * .55)), d = blob(cx, cy, rr(120, 220), rr(30, 55), 12, .45); clouds.push(d); defs += `<path d="${d}" fill="#000"/>`; }
      defs += '</mask>';
      let hl = '';
      for (let y = 90; y < gy - 2; y += 4.2) hl += `M0 ${f2(y)}H${SW}`;
      o += `<path d="${hl}" stroke="#9a9a9a" stroke-width=".45" mask="url(#cloudM)"/>`;
      clouds.forEach(d => o += `<path d="${d}" fill="none" stroke="#9a9a9a" stroke-width=".6"/>`);
    }
    // ---- street context
    if (street) {
      // neighbour house (beyond)
      const hx1 = xl - 1.5, hx2 = -2.4, hh = 6.2, rh = 3.0;
      o += poly([[X(hx1), Y(0)], [X(hx1), Y(hh)], [X((hx1 + hx2) / 2), Y(hh + rh)], [X(hx2), Y(hh)], [X(hx2), Y(0)]], { fill: '#fff', stroke: '#444', strokeWidth: .7 });
      const chx = hx2 - 1.6, chz = hh + rh * (hx2 - chx - .5) / ((hx2 - hx1) / 2);
      o += rect(X(chx), Y(chz + 1.1), .5 * s, 1.1 * s + .4 * s, { fill: '#fff', stroke: '#444', strokeWidth: .6 });
      [[.9, 2.4], [3.6, 5.3]].forEach(([a1, a2]) => { for (let x = hx1 + .8; x < hx2 - 1; x += 1.6) { o += rect(X(x), Y(a2), .9 * s, (a2 - a1) * s, { fill: '#fff', stroke: '#444', strokeWidth: .6 }) + line(X(x + .45), Y(a2), X(x + .45), Y(a1), thin) + line(X(x), Y((a1 + a2) / 2), X(x + .9), Y((a1 + a2) / 2), thin); } });
      o += rect(X(hx1), Y(2.9), (hx2 - hx1) * s, .25 * s, { fill: '#fff', stroke: '#444', strokeWidth: .6 });
      // car
      const cx0 = xl + .4, cw = 4.2;
      o += path(`M${f2(X(cx0))} ${f2(Y(.35))}L${f2(X(cx0))} ${f2(Y(.9))}Q${f2(X(cx0 + .2))} ${f2(Y(1.05))} ${f2(X(cx0 + .9))} ${f2(Y(1.05))}L${f2(X(cx0 + 1.4))} ${f2(Y(1.55))}L${f2(X(cx0 + 3.0))} ${f2(Y(1.55))}L${f2(X(cx0 + 3.7))} ${f2(Y(1.05))}L${f2(X(cx0 + cw))} ${f2(Y(.95))}L${f2(X(cx0 + cw))} ${f2(Y(.35))}Z`, { fill: '#fff', stroke: '#333', strokeWidth: .7 });
      o += path(`M${f2(X(cx0 + 1.5))} ${f2(Y(1.05))}L${f2(X(cx0 + 1.8))} ${f2(Y(1.45))}L${f2(X(cx0 + 2.9))} ${f2(Y(1.45))}L${f2(X(cx0 + 3.4))} ${f2(Y(1.05))}Z`, { fill: 'none', stroke: '#333', strokeWidth: .5 });
      [cx0 + .9, cx0 + 3.3].forEach(wx => o += circ(X(wx), Y(.33), .33 * s, { fill: '#fff', stroke: '#333', strokeWidth: .7 }) + circ(X(wx), Y(.33), .16 * s, { fill: 'none', stroke: '#333', strokeWidth: .5 }));
      // pavement + road
      o += line(X(xl - 1), Y(-.12), X(-3.0), Y(-.12), { stroke: '#111', strokeWidth: 1 }) + line(X(-3.0), Y(-.12), X(-3.0), Y(0), cut) + line(X(-3.0), Y(0), X(0), Y(0), cut);
      [[.08, 'brick'], [.05, 'mortar']].reduce((z, [tt, h]) => { o += rect(X(-3.0), Y(z), 3.0 * s, tt * s, { fill: `url(#h-${h})`, ...thin }); return z - tt; }, 0);
      o += rect(X(-3.0), Y(-.13), 3.0 * s, .35 * s, { fill: 'url(#hardcore)', ...thin });
      o += line(X(-1.8), Y(.02), X(-1.0), Y(.08), thin) + text(X(-1.4), Y(.12) - 2, '80', { fontSize: 8, fontFamily: MONO, textAnchor: 'middle' });
      // people on pavement
      o += lineFig(X(-2.6), Y(0), 1.72 * s, { pose: 3 }) + lineFig(X(-1.75), Y(0), 1.8 * s, { pose: 0 }) + lineFig(X(-.9), Y(0), 1.1 * s, { pose: 2 });
      o += `<g>${rect(X(-5.4), Y(2.5) - 8, 92, 16, { fill: '#fff', stroke: '#222', strokeWidth: .6 })}${text(X(-5.4) + 46, Y(2.5) + 3.5, '가로 · 보행로', { fontSize: 9, textAnchor: 'middle' })}</g>`;
      NT += note(X(xl) + 6, Y(-.75), ['보도:', '벽돌 t = 80mm', '몰탈 t = 50mm', '잡석 다짐'], X(-2.2), Y(-.05), { w: 92 });
      NT += note(X(xl) + 6, Y(-1.5), ['(배수 구배 1/80) 보도 표면수는', '차도 측구로 배수'], X(-3.0), Y(-.1), { w: 175 });
    }
    // ---- building body white (covers sky hatching)
    o += rect(X(0), Y(Htot), (xr - 0 + 1) * s, (Htot + 1.4) * s, { fill: '#fff' });
    // ---- ground: earth, hardcore, slab on grade, footing
    const gu = GROUND_UP.reduce((q, l) => q + l[1], 0) / 1000;
    o += rect(X(xl - 1), Y(-gu - .02), (xr - xl + 2) * s, .4 * s, { fill: 'url(#hardcore)' }) + line(X(xl - 1), Y(-gu - .42), X(xr + 1), Y(-gu - .42), { stroke: '#666', strokeWidth: .5, strokeDasharray: '6 4' });
    let zz = 0;
    GROUND_UP.forEach(([nm, tt, h]) => { const th2 = tt / 1000; o += rect(X(T), Y(zz), (xr - T + 1) * s, Math.max(1.4, th2 * s), { fill: h === 'membrane' ? '#111' : `url(#${['zig', 'tile', 'ply'].includes(h) ? h : 'h-' + h})`, ...thin }); zz -= th2; });
    o += rect(X(-.35), Y(0), (T + .7) * s, (gu + .7) * s, { fill: 'url(#h-conc)', ...cut });
    o += line(X(-3.0), Y(-gu - .02), X(xr + 1), Y(-gu - .02), { stroke: '#111', strokeWidth: .9 });
    NT += note(X(1.2), Y(-gu - .9), ['내부 바닥:', ...GROUND_UP.map(([nm, tt]) => `${nm} t = ${tt}mm`)], X(2.6), Y(-.1), { w: 150 });
    // ---- floors
    const tagX = terr ? -2.05 : -.6;
    const levelTag = (z, lab) => NT += line(X(-.15), Y(z), X(tagX), Y(z), { ...thin, strokeDasharray: '3 2' }) + poly([[X(tagX), Y(z)], [X(tagX) - 6, Y(z) - 6], [X(tagX) + 6, Y(z) - 6]], { fill: '#fff', stroke: '#222', strokeWidth: .6 }) + text(X(tagX) - 10, Y(z) - 1, lab, { fontSize: 8.6, fontFamily: MONO, textAnchor: 'end', stroke: '#fff', strokeWidth: 3, paintOrder: 'stroke' });
    const wallSeg = (z1, z2) => { let x = 0; wallL.forEach(l => { const tt = l.t / 1000; o += rect(X(x), Y(z2), Math.max(1, tt * s), (z2 - z1) * s, { fill: l.h === 'membrane' ? '#111' : l.h === 'insul' ? 'url(#zig)' : l.h === 'air' ? '#fff' : `url(#h-${l.h})`, ...thin }); x += tt; }); o += rect(X(0), Y(z2), T * s, (z2 - z1) * s, { fill: 'none', ...cut }); };
    const furnSets = [
      (z) => { // workshop
        let q = rect(X(1.4), Y(z + .95), 2.3 * s, .08 * s, { fill: '#fff', ...thin }) + rect(X(1.4), Y(z + .87), 2.3 * s, .5 * s, { fill: 'none', stroke: '#222', strokeWidth: .4 });
        [1.5, 3.6].forEach(x => q += line(X(x), Y(z + .87), X(x), Y(z), thin));
        [1.2, 3.9].forEach(x => q += line(X(x - .17), Y(z + .7), X(x + .17), Y(z + .7), thin) + line(X(x - .12), Y(z + .7), X(x - .16), Y(z), thin) + line(X(x + .12), Y(z + .7), X(x + .16), Y(z), thin) + line(X(x - .15), Y(z + .25), X(x + .15), Y(z + .25), thin));
        q += circ(X(3.3), Y(z + fh - .9), .32 * s, { fill: '#fff', ...thin }) + line(X(3.3), Y(z + fh - .58), X(3.3), Y(z + fh - slab - .14), thin) + line(X(3.62), Y(z + fh - .9), X(xr), Y(z + fh - .9), thin) + line(X(3.62), Y(z + fh - 1.1), X(xr), Y(z + fh - 1.1), thin);
        return q + lineFig(X(2.2), Y(z), 1.75 * s, { pose: 0 }) + lineFig(X(3.0), Y(z + 0), 1.65 * s, { pose: 3 });
      },
      (z) => { // shelves + bench
        let q = '';
        [1.4, 1.85].forEach(h => q += line(X(1.6), Y(z + h), X(3.8), Y(z + h), thin) + line(X(1.7), Y(z + h), X(1.7), Y(z + h - .12), thin));
        for (let x = 1.75; x < 3.7; x += .32) q += rect(X(x), Y(z + 1.4 + rr(.12, .22)), .16 * s, rr(.12, .22) * s, { fill: '#fff', ...thin, rx: 2 });
        q += rect(X(2.4), Y(z + .92), 1.9 * s, .06 * s, { fill: '#fff', ...thin }) + line(X(2.5), Y(z + .92), X(2.5), Y(z), thin) + line(X(4.2), Y(z + .92), X(4.2), Y(z), thin);
        return q + lineFig(X(3.1), Y(z), 1.68 * s, { pose: 2 }) + line(X(1.5), Y(z + .55), X(1.5), Y(z), thin) + rect(X(1.38), Y(z + .62), .24 * s, .07 * s, { fill: '#fff', ...thin });
      },
      (z) => { // pegboard + desk + walking person
        let q = rect(X(2.6), Y(z + 1.9), 1.6 * s, .7 * s, { fill: '#fff', ...thin });
        for (let x = 2.7; x < 4.15; x += .12) for (let y = 1.3; y < 1.88; y += .12) q += circ(X(x), Y(z + y), .6, { fill: '#555' });
        [2.8, 3.1, 3.5, 3.8].forEach(x => q += line(X(x), Y(z + 1.8), X(x), Y(z + 1.45), { stroke: '#222', strokeWidth: 1 }));
        q += rect(X(2.5), Y(z + .9), 1.8 * s, .05 * s, { fill: '#fff', ...thin }) + line(X(2.6), Y(z + .9), X(2.6), Y(z), thin) + line(X(4.2), Y(z + .9), X(4.2), Y(z), thin);
        return q + lineFig(X(1.6), Y(z), 1.74 * s, { pose: 1 });
      },
    ];
    for (let f = 0; f < n; f++) {
      const ffl = f * fh, fsl = ffl - (f ? finTop : 0), usl = fsl - slab, nextFFL = (f + 1) * fh, nextUSL = nextFFL - fu;
      // back wall wood grain
      for (let q = 0; q < 6; q++) { const yb = rr(ffl + .4, nextUSL - .3), xb = rr(T + .5, xr - .5); o += path(`M${f2(X(xb))} ${f2(Y(yb))}c${f2(rr(-10, 10))} ${f2(-rr(10, 30))} ${f2(rr(-10, 10))} ${f2(-rr(30, 60))} 0 ${f2(-rr(40, 80))}`, { fill: 'none', stroke: '#bbb', strokeWidth: .4 }); }
      o += furnSets[f % 3](ffl);
      // ceiling inserts below next slab
      let cz = nextUSL;
      CEIL.forEach(([nm, tt, h]) => { const th2 = tt / 1000; o += rect(X(T), Y(cz), (xr - T + 1) * s, th2 * s, { fill: `url(#${h})`, ...thin }); cz -= th2; });
      // wall / glazing
      if (f === 0) {
        o += rect(X(0), Y(nextUSL), T * s, (nextUSL - fh * .78) * s, { fill: 'url(#h-conc)', ...cut });
        o += rect(X(.06), Y(fh * .78), .12 * s, (fh * .78 - .05) * s, { fill: '#fff', ...thin }) + line(X(.12), Y(fh * .78), X(.12), Y(.05), thin) + rect(X(.04), Y(fh * .62), .16 * s, .06 * s, { fill: '#fff', ...thin });
      } else {
        const doorTop = ffl + 2.35;
        wallSeg(doorTop, nextUSL);
        o += rect(X(.05), Y(doorTop), .12 * s, 2.35 * s, { fill: '#fff', ...thin }) + line(X(.11), Y(doorTop), X(.11), Y(ffl), thin);
        if (!terr) wallSeg(ffl, ffl + .9);
      }
      // slab above (next floor)
      if (f < n) {
        const z = nextFFL;
        let zz2 = z;
        FLOOR_UP.forEach(([nm, tt, h]) => { const th2 = tt / 1000; o += rect(X(-.0), Y(zz2), (xr + 1) * s, th2 * s, { fill: h === 'conc' ? 'url(#h-conc)' : `url(#${['zig', 'tile', 'ply'].includes(h) ? h : 'h-' + h})`, ...thin }); zz2 -= th2; });
        o += rect(X(0), Y(z), (xr + 1) * s, fu * s, { fill: 'none', ...cut });
        levelTag(z, `FFL = +${mm(z)}`); levelTag(z - finTop, `FSL = +${mm(z - finTop)}`); levelTag(z - fu, `USL = +${mm(z - fu)}`);
        if (terr && f + 1 < n) {
          const tz = z - .15, tl = 1.7;
          let zz3 = tz;
          TERR_UP.forEach(([nm, tt, h]) => { const th2 = tt / 1000; o += rect(X(-tl), Y(zz3), tl * s, th2 * s, { fill: h === 'conc' ? 'url(#h-conc)' : h === 'membrane' ? '#111' : `url(#${h === 'tile' ? 'tile' : 'h-' + h})`, ...thin }); zz3 -= th2; });
          o += rect(X(-tl), Y(tz), tl * s, (TERR_UP.reduce((q, l) => q + l[1], 0) / 1000) * s, { fill: 'none', ...cut });
          // railing + planter
          o += rect(X(-tl), Y(tz + 1.1), .05 * s, 1.1 * s, { fill: '#fff', ...cut });
          for (let x = -tl + .1; x < -.1; x += .09) o += line(X(x), Y(tz + 1.05), X(x), Y(tz), { stroke: '#333', strokeWidth: .45 });
          o += line(X(-tl), Y(tz + 1.05), X(0), Y(tz + 1.05), { stroke: '#222', strokeWidth: .8 });
          o += plant(X(-tl + .45), Y(tz), 1.0 * s) + plant(X(-.55), Y(tz), .7 * s);
          for (let q = 0; q < 3; q++) o += `<path d="${blob(X(-tl + rr(.1, .5)), Y(tz - .4 - rr(0, .5)), rr(6, 12), rr(8, 16), 8, .5)}" fill="#fff" stroke="#333" stroke-width=".5"/>`;
          o += `<g>${rect(X(-1.35) - 2, Y(tz + 2.0) - 9, 50, 15, { fill: '#fff', stroke: '#222', strokeWidth: .6 })}${text(X(-1.35) + 23, Y(tz + 2.0) + 2, '테라스', { fontSize: 9, textAnchor: 'middle' })}</g>`;
          if (f === 0) NT += note(X(xl) + 6, Y(tz + 2.4), ['테라스 바닥:', ...TERR_UP.map(([nm, tt]) => `${nm} t = ${tt}mm`)], X(-tl * .55), Y(tz - .05), { w: 150 });
          if (f === 0 && n > 2) NT += note(X(xl) + 6, Y(tz + 3.8), ['외벽:', ...wallL.map(l => `${l.name} t = ${l.t}mm`)], X(T / 2), Y(tz + 1.5 + fh * .5), { w: 160 });
        }
        if (f === 0) NT += note(X(.6), Y(z - fu - .55), ['천장 인서트:', ...CEIL.map(([nm, tt]) => `${nm} t = ${tt}mm`), '각재 100×50 @ 330'], X(1.9), Y(z - fu - .1), { w: 130 });
      }
    }
    // ---- roof level
    const rz = n * fh;
    if (roofT === 'glass') {
      const h1 = 3.0, slope = .05, rl = xr + 1;
      const zr = x => rz + h1 + (x + .3) * slope;
      o += rect(X(-.3), Y(rz + .4), .4 * s, .4 * s, { fill: 'url(#h-conc)', ...cut });
      o += line(X(.1), Y(rz + .4), X(.1), Y(zr(.1)), cut) + line(X(.18), Y(rz + .4), X(.18), Y(zr(.18)), thin);
      o += path(`M${f2(X(-.4))} ${f2(Y(zr(-.4)))}L${f2(X(rl))} ${f2(Y(zr(rl)))}`, { stroke: '#111', strokeWidth: 1.6, fill: 'none' }) + path(`M${f2(X(-.4))} ${f2(Y(zr(-.4) - .08))}L${f2(X(rl))} ${f2(Y(zr(rl) - .08))}`, { stroke: '#111', strokeWidth: .6, fill: 'none' });
      for (let x = .1; x < rl; x += 1.45) o += rect(X(x - .07), Y(zr(x) - .08), .14 * s, .14 * s, { fill: '#fff', ...cut });
      for (let x = .1; x < rl - 1.4; x += 1.45) {
        const xa = x, xb = x + 1.45, za = zr(xa) - .25, zb = zr(xb) - .25, mid = (xa + xb) / 2;
        o += path(`M${f2(X(xa))} ${f2(Y(za))}Q${f2(X(mid))} ${f2(Y((za + zb) / 2 - .55))} ${f2(X(xb))} ${f2(Y(zb))}`, { fill: 'none', stroke: '#444', strokeWidth: .5 });
        for (let q = 1; q < 4; q++) { const tt = q / 4, bx = (1 - tt) * (1 - tt) * xa + 2 * (1 - tt) * tt * mid + tt * tt * xb, bz = (1 - tt) * (1 - tt) * za + 2 * (1 - tt) * tt * ((za + zb) / 2 - .55) + tt * tt * zb; o += circ(X(bx), Y(bz) + 6, 5, { fill: '#fff', stroke: '#444', strokeWidth: .5 }); }
      }
      o += lineFig(X(1.4), Y(rz + .02), 1.72 * s, { pose: 2 }) + lineFig(X(3.6), Y(rz + .02), 1.6 * s, { pose: 0 }) + rect(X(1.2), Y(rz + .46), 3.2 * s, .06 * s, { fill: '#fff', ...thin });
      { const sx = X(2.2), sy = Y(zr(2.2)) - 16; o += path(`M${f2(sx)} ${f2(sy)}h40v-8z`, { fill: '#fff', stroke: '#222', strokeWidth: .6 }) + text(sx + 44, sy - 2, '1', { fontSize: 8, fontFamily: MONO }) + text(sx + 20, sy + 10, '20', { fontSize: 8, fontFamily: MONO, textAnchor: 'middle' }); }
      levelTag(zr(-.4), `최고 높이 = +${mm(zr(-.4))}`);
    } else {
      o += rect(X(0), Y(rz + 1.1), T * s, 1.1 * s, { fill: 'url(#h-conc)', ...cut }) + rect(X(-.06), Y(rz + 1.16), (T + .12) * s, .06 * s, { fill: '#111' });
      o += rect(X(T), Y(rz + .3), (xr + 1) * s, .22 * s, { fill: 'url(#zig)', ...thin }) + rect(X(T), Y(rz + .36), (xr + 1) * s, .06 * s, { fill: 'url(#h-gravel)', ...thin });
    }
    NT += note(X(xl) + 6, Y(rz + 1.4), ['지붕: 구배 몰탈 최대 t = 80mm', '(배수 구배 1/80) 표면수는 건물 후면', '집수 지점으로 배수'], X(-.1), Y(rz + .2), { w: 175 });
    // right break line
    const pts = []; for (let z = -gu - 1.2; z <= Htot + .4; z += .5) pts.push([X(xr) + (Math.round(z / .5) % 2 ? 5 : -5), Y(z)]);
    o += rect(X(xr), 0, SW, SH, { fill: '#fff' }) + pline(pts, { fill: 'none', stroke: '#222', strokeWidth: .8 }) + NT;
    o += rect(0, SH - 64, SW, 64, { fill: '#fff' });
    o += text(40, 56, 'DETAIL SECTION', { fontSize: 11, fontFamily: MONO, letterSpacing: '.14em', fill: '#666' }) + text(40, 84, `상세 단면 투시 · 외벽 ${Math.round(T * 1000)}mm`, { fontSize: 20, fontWeight: 800 });
    o += block(SW, SH, '상세 단면 (외피·슬래브 구성)', scaleTxt(s), 'A-502');
    return out('상세 단면', `${n}F + 옥상 · 외벽 ${Math.round(T * 1000)}mm · 슬래브 ${Math.round(fu * 1000)}mm`, SW, SH, o, defs, {
      type: 'detailed architectural section perspective',
      parts: [
        ['도면 유형', `black-and-white detailed section perspective through the street edge of a ${n}-storey ${USE_EN[G.use]}, scale about 1:30, fine technical line art`],
        ['구성', `ground workshop with shopfront, ${n - 1} upper floors${terr ? ' with cantilevered planted terraces' : ''}, ${roofT === 'glass' ? 'rooftop glass pavilion with timber purlins and string lights' : 'flat roof with parapet'}`],
        ['외벽', 'wall build-up: ' + wallL.map(l => `${matEn(l.name, l.h)} ${l.t}mm`).join(', ')],
        ['슬래브', `floor build-up FFL/FSL/USL: ${FLOOR_UP.map(l => l[0] + ' ' + l[1] + 'mm').join(', ')}; ground slab on hardcore with damp proof membrane`],
        ['표현', 'standard hatches (concrete stipple with triangles, zigzag insulation, rubble hardcore), level markers FFL FSL USL, annotation text blocks with leader lines, drainage slope symbols, horizontal-line hatched sky with white outlined clouds'],
        ['점경', 'outlined people working at benches, shelves with jars, pegboard tools, potted plants on terraces, neighbouring gable house and parked car across the street'],
      ],
      neg: ['color', 'shading gradients', 'perspective distortion', 'messy lines', 'wrong layer order'],
      ko: `레퍼런스 2번처럼 선화로 그린 상세 단면입니다. 외벽 레이어는 '부위 프리셋'의 외벽 구성을 그대로 씁니다.`,
    });
  };
})();
