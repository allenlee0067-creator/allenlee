/* =========================================================
   Arch AI Drawing Kit — AI render
   Sends the current drawing (geometry) + the user's reference boards
   (style) to an image model and shows the finished board.
   Keys stay in this browser and go only to the chosen provider.
   ========================================================= */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const DEFAULT_MODEL = { gemini: 'gemini-2.5-flash-image', openai: 'gpt-image-1' };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { } },
  };

  // What "reference quality" means for each tab when no reference image is given.
  const REF_STYLE = {
    diagram: 'a Bjarke Ingels Group (BIG) style diagram board: crisp white isometric volumes with thin black outlines, one bold accent color for operation arrows, bright green planted roofs with small trees, tiny people, clean sans-serif step titles, generous white space, vector-sharp print quality',
    plan: 'an award-winning architecture competition site plan: solid black poché walls, grayscale landscape with hand-drawn scribbled tree canopies and soft cast shadows, fine paving and lawn textures, detailed thin-line furniture, small precise annotations, crisp print quality',
    elev: 'a refined watercolor-collage facade elevation: realistic red brick with brick-by-brick color variation, deep window reveals with shadows, sheer white curtains, slim black Juliet balcony railings, arched ground floor openings with people inside, a pale translucent tree silhouette, flat gray people silhouettes, paired with a fine black line section strip with level annotations',
    section: 'an award-winning competition-board section perspective: dark maroon-brown poché slabs, walls and earth, saturated red accent floors and escalators, warm sepia paper tone, extremely detailed interiors packed with people, furniture, trees and objects, receding one-point perspective, pale skyline behind, soft watercolor clouds and birds, delicate level annotations on the left',
    detail: 'a meticulous black-and-white technical line-art detailed section perspective at 1:20: uniform fine black lines on white, material hatches (concrete stipple with triangles, zigzag insulation, rubble hardcore), annotated build-up text blocks with leader lines, outlined people working, furniture and plants, horizontal-line hatched sky with white outlined clouds',
  };
  const refs = {}; // tab -> [{name, dataUrl}]
  let edited = false;

  function curTab() { try { return cur; } catch (e) { return 'diagram'; } }

  function buildPrompt() {
    const t = curTab(), r = window.__lastResult;
    if (!r) return '';
    const p = r.prompt, nRefs = (refs[t] || []).length;
    const content = p.parts.map(([, v]) => v).join('; ');
    const lines = [
      `Image 1 is a precise architectural drawing produced by CAD-like software (${r.title}). Redraw it as a finished, publication-quality ${p.type}.`,
      'Keep the exact geometry of image 1: every wall, slab, opening, window, stair, level line and proportion stays in the same place. Do not add or remove floors, rooms, windows or bays. Keep the same framing and aspect ratio.',
      nRefs
        ? `${nRefs === 1 ? 'Image 2 is a style reference only' : `Images 2 to ${nRefs + 1} are style references only`}: match its graphic style, color palette, line weights, textures, lighting, entourage and density of detail as closely as possible, but do not copy the building shown in it.`
        : `Target style: ${REF_STYLE[t]}.`,
      `Content to preserve: ${content}.`,
      'Add richness the drawing lacks: material texture, soft shadows, more people and objects in plausible places, atmospheric depth, as on an award-winning competition board.',
      'Text: keep existing labels legible and in place, or remove them; never invent gibberish text. Output one image only, no added frame or watermark.',
    ];
    return lines.join('\n\n');
  }
  function fillPrompt(force) {
    if (force || !edited) { $('#ai-prompt').value = buildPrompt(); edited = false; }
    const n = (refs[curTab()] || []).length;
    $('#ai-meta').textContent = n ? `레퍼런스 ${n}장 사용` : '레퍼런스 없음 · 탭별 기본 스타일 사용';
  }

  // ---------- reference images ----------
  const fileToDataUrl = (file, maxSide = 1536) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', .9));
      };
      img.onerror = () => rej(new Error('이미지를 읽을 수 없습니다: ' + file.name));
      img.src = fr.result;
    };
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(file);
  });
  async function addFiles(files) {
    const t = curTab(), list = refs[t] = refs[t] || [];
    for (const f of [...files].filter(f => f.type.startsWith('image/'))) {
      if (list.length >= 4) break;
      try { list.push({ name: f.name, dataUrl: await fileToDataUrl(f) }); } catch (e) { status(e.message, true); }
    }
    drawRefs(); fillPrompt();
  }
  function drawRefs() {
    const list = refs[curTab()] || [];
    $('#ai-refs').innerHTML = list.map((r, i) => `<figure><img src="${r.dataUrl}" alt=""><button type="button" data-i="${i}" aria-label="삭제">×</button></figure>`).join('');
    $('#ai-refs').querySelectorAll('button').forEach(b => b.onclick = () => { list.splice(+b.dataset.i, 1); drawRefs(); fillPrompt(); });
  }

  // ---------- providers ----------
  const b64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = () => rej(fr.error); fr.readAsDataURL(blob); });
  const dataUrlParts = u => { const m = /^data:([^;]+);base64,(.*)$/.exec(u); return { mime: m[1], data: m[2] }; };
  const dataUrlToBlob = u => { const { mime, data } = dataUrlParts(u); const bin = atob(data), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); };

  async function callGemini(key, model, prompt, png, refList) {
    const parts = [{ text: prompt }, { inline_data: { mime_type: 'image/png', data: await b64(png) } }];
    refList.forEach(r => { const { mime, data } = dataUrlParts(r.dataUrl); parts.push({ inline_data: { mime_type: mime, data } }); });
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((j.error && j.error.message) || `Gemini 오류 ${res.status}`);
    const out = [];
    (j.candidates || []).forEach(c => ((c.content && c.content.parts) || []).forEach(p => { const d = p.inlineData || p.inline_data; if (d && d.data) out.push(`data:${d.mimeType || d.mime_type || 'image/png'};base64,${d.data}`); }));
    if (!out.length) {
      const why = (j.candidates && j.candidates[0] && (j.candidates[0].finishReason || '')) || (j.promptFeedback && j.promptFeedback.blockReason) || '';
      const txt = (j.candidates || []).flatMap(c => ((c.content && c.content.parts) || []).map(p => p.text).filter(Boolean)).join(' ').slice(0, 200);
      throw new Error(`이미지가 오지 않았습니다 ${why ? '(' + why + ')' : ''} ${txt}`.trim());
    }
    return out;
  }
  async function callOpenAI(key, model, prompt, png, refList, w, h) {
    const fd = new FormData();
    fd.append('model', model);
    fd.append('prompt', prompt);
    fd.append('image[]', png, 'drawing.png');
    refList.forEach((r, i) => fd.append('image[]', dataUrlToBlob(r.dataUrl), `reference-${i + 1}.jpg`));
    fd.append('size', w > h * 1.15 ? '1536x1024' : h > w * 1.15 ? '1024x1536' : '1024x1024');
    fd.append('quality', 'high');
    fd.append('n', '1');
    const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((j.error && j.error.message) || `OpenAI 오류 ${res.status}`);
    const out = (j.data || []).map(d => d.b64_json ? `data:image/png;base64,${d.b64_json}` : d.url).filter(Boolean);
    if (!out.length) throw new Error('이미지가 오지 않았습니다');
    return out;
  }

  // ---------- run ----------
  function status(msg, err) { const el = $('#ai-status'); el.innerHTML = msg; el.classList.toggle('err', !!err); }
  let busy = false;
  async function run() {
    if (busy) return;
    const prov = $('#ai-prov').value, model = $('#ai-model').value.trim() || DEFAULT_MODEL[prov], key = $('#ai-key').value.trim();
    if (!key) { status('API 키를 먼저 넣으세요.', true); $('#ai-key').focus(); return; }
    const r = window.__lastResult; if (!r) return;
    busy = true; $('#ai-go').disabled = true;
    const t0 = Date.now(), tick = setInterval(() => status(`<span class="spin"></span> 렌더 중… ${Math.round((Date.now() - t0) / 1000)}초 (보통 20–90초)`), 500);
    try {
      const png = await window.sheetPng(2048), list = refs[curTab()] || [], prompt = $('#ai-prompt').value.trim() || buildPrompt();
      const imgs = prov === 'gemini' ? await callGemini(key, model, prompt, png, list) : await callOpenAI(key, model, prompt, png, list, r.w || 1000, r.h || 700);
      const stamp = new Date().toTimeString().slice(0, 8);
      imgs.forEach((u, i) => {
        const fig = document.createElement('figure');
        const name = `${(G.project || 'drawing').replace(/[^\w가-힣-]+/g, '_')}_${curTab()}_ai_${stamp.replace(/:/g, '')}${imgs.length > 1 ? '_' + (i + 1) : ''}.png`;
        fig.innerHTML = `<img src="${u}" alt="AI 렌더 결과"><figcaption><span>${r.title} · ${model} · ${stamp}</span><a href="${u}" download="${name}">저장</a></figcaption>`;
        $('#ai-out').prepend(fig);
      });
      status(`완료 · ${Math.round((Date.now() - t0) / 1000)}초. 마음에 안 들면 한 번 더 실행하세요 (매번 결과가 다릅니다).`);
    } catch (e) {
      const msg = /Failed to fetch|NetworkError/i.test(e.message) ? '네트워크 오류: AI 서비스에 연결하지 못했습니다. 키와 인터넷 연결을 확인하세요.' : e.message;
      status('실패: ' + msg.replace(/[<>]/g, ''), true);
    } finally { clearInterval(tick); busy = false; $('#ai-go').disabled = false; }
  }

  // ---------- wiring ----------
  const baseRender = window.render;
  window.render = function () { baseRender(); try { window.__lastResult = last; } catch (e) { } drawRefs(); fillPrompt(); };
  document.addEventListener('DOMContentLoaded', () => {
    const prov = store.get('arch-ai-prov') || 'gemini';
    $('#ai-prov').value = prov;
    $('#ai-model').value = store.get('arch-ai-model-' + prov) || DEFAULT_MODEL[prov];
    $('#ai-key').value = store.get('arch-ai-key-' + prov) || '';
    $('#ai-remember').checked = store.get('arch-ai-remember') !== '0';
    $('#ai-prov').addEventListener('change', () => {
      const p = $('#ai-prov').value; store.set('arch-ai-prov', p);
      $('#ai-model').value = store.get('arch-ai-model-' + p) || DEFAULT_MODEL[p];
      $('#ai-key').value = store.get('arch-ai-key-' + p) || '';
    });
    $('#ai-model').addEventListener('change', () => store.set('arch-ai-model-' + $('#ai-prov').value, $('#ai-model').value.trim() || null));
    const saveKey = () => store.set('arch-ai-key-' + $('#ai-prov').value, $('#ai-remember').checked ? ($('#ai-key').value.trim() || null) : null);
    $('#ai-key').addEventListener('change', saveKey);
    $('#ai-remember').addEventListener('change', () => { store.set('arch-ai-remember', $('#ai-remember').checked ? '1' : '0'); saveKey(); });
    $('#ai-prompt').addEventListener('input', () => { edited = true; });
    $('#ai-reset').addEventListener('click', () => fillPrompt(true));
    const drop = $('#ai-drop'), file = $('#ai-file');
    drop.addEventListener('click', () => file.click());
    file.addEventListener('change', () => { addFiles(file.files); file.value = ''; });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('on'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('on'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('on'); addFiles(e.dataTransfer.files); });
    $('#ai-go').addEventListener('click', run);
    // the AI panel sits outside the sidebar, so its inputs must not trigger drawing re-renders
  });
})();
