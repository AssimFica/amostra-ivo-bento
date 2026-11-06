// Aula de Prova: a câmara conta os agachamentos bem feitos e corrige o movimento.
// A deteção do corpo (MediaPipe Pose Landmarker) corre no próprio telemóvel; nenhum vídeo sai do aparelho.

const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODELO = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const DURACAO = 45;           // segundos da prova
const ANG_CIMA = 155;         // joelho quase esticado
const ANG_DESCE = 140;        // começou a descer
const ANG_FUNDO = 105;        // amplitude boa (anca perto da linha do joelho)
const ANG_MEIO = 135;         // desceu, mas pouco

const $ = s => document.querySelector(s);
const st = { objetivo: null, idade: null, sexo: null, cintura: null, treinos: null, saude: false, reps: 0 };

// ---------- navegação ----------
function mostra(id) {
  document.querySelectorAll('.ecra').forEach(e => e.classList.toggle('ativo', e.id === id));
  window.scrollTo(0, 0);
}
document.querySelectorAll('[data-volta]').forEach(b => b.addEventListener('click', () => mostra(b.dataset.volta)));
document.querySelectorAll('[data-fecha]').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.fecha).classList.remove('ativo')));
document.querySelectorAll('.folha').forEach(f => f.addEventListener('click', e => { if (e.target === f) f.classList.remove('ativo'); }));

function grupo(sel, chave, depois) {
  const botoes = document.querySelectorAll(sel + ' button');
  botoes.forEach(b => b.addEventListener('click', () => {
    botoes.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    st[chave] = b.dataset.v;
    depois && depois();
  }));
}

// ---------- o desafio de um amigo (?d=27&de=Rui) ----------
const q = new URLSearchParams(location.search);
const desafio = (() => {
  const d = parseInt(q.get('d'), 10);
  const de = (q.get('de') || '').trim().slice(0, 24);
  return Number.isFinite(d) && d > 0 && d < 200 ? { reps: d, nome: de || 'O seu amigo' } : null;
})();
if (desafio) {
  const b = $('#banner-desafio');
  const n = document.createElement('b'); n.textContent = desafio.nome;
  const r = document.createElement('b'); r.textContent = desafio.reps;
  b.append(n, document.createTextNode(' fez '), r, document.createTextNode(' agachamentos em 45 segundos. Consegue fazer melhor?'));
  b.hidden = false;
}

// ---------- 1 e 2: objetivo e perguntas ----------
document.querySelectorAll('#objetivos .op').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#objetivos .op').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
  st.objetivo = b.dataset.v; $('#b-inicio').disabled = false;
}));
$('#b-inicio').addEventListener('click', () => mostra('e-perguntas'));

function validaPerguntas() {
  const idade = parseInt($('#idade').value, 10);
  st.idade = idade >= 14 && idade <= 90 ? idade : null;
  const c = parseInt($('#cintura').value, 10);
  st.cintura = c >= 50 && c <= 170 ? c : null;
  st.saude = $('#saude').checked;
  $('#alerta-saude').hidden = !st.saude;
  $('#b-perguntas').disabled = !(st.idade && st.sexo && st.treinos !== null);
}
grupo('#sexo', 'sexo', validaPerguntas);
grupo('#treinos', 'treinos', validaPerguntas);
['#idade', '#cintura'].forEach(s => $(s).addEventListener('input', validaPerguntas));
$('#saude').addEventListener('change', validaPerguntas);
$('#b-perguntas').addEventListener('click', () => { mostra('e-prep'); carregaModelo().catch(() => {}); });

// ---------- som e voz ----------
let audio = null, somLigado = true, voz = null;
function preparaSom() {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) { audio = null; }
  if ('speechSynthesis' in window) {
    const escolhe = () => {
      const vs = speechSynthesis.getVoices();
      voz = vs.find(v => /^pt[-_]PT/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null;
    };
    escolhe(); speechSynthesis.onvoiceschanged = escolhe;
    const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); // desbloqueia no iPhone
  }
}
function bip(alto) {
  if (!audio || !somLigado) return;
  const o = audio.createOscillator(), g = audio.createGain();
  o.frequency.value = alto ? 1320 : 880; o.type = 'sine';
  g.gain.setValueAtTime(.0001, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(.25, audio.currentTime + .01);
  g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .16);
  o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + .18);
}
let falaAte = 0, falaTimer = null;
function fala(txt, forcar) {
  const agora = performance.now();
  if (!forcar && agora < falaAte) return;
  falaAte = agora + 2400;
  $('#fala-txt').textContent = txt;
  $('#fala').classList.add('mostra');
  clearTimeout(falaTimer); falaTimer = setTimeout(() => $('#fala').classList.remove('mostra'), 2200);
  if (somLigado && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt.replace(/[«»]/g, ''));
    u.lang = 'pt-PT'; if (voz) u.voice = voz; u.rate = 1.05;
    speechSynthesis.speak(u);
  }
}
$('#b-som').addEventListener('click', e => {
  somLigado = !somLigado; e.currentTarget.setAttribute('aria-pressed', String(somLigado));
  e.currentTarget.textContent = somLigado ? 'Som' : 'Mudo';
  if (!somLigado && 'speechSynthesis' in window) speechSynthesis.cancel();
});

// ---------- o modelo ----------
let landmarker = null, carregando = null;
function carregaModelo() {
  if (carregando) return carregando;
  carregando = (async () => {
    const { PoseLandmarker, FilesetResolver } = await import(MP + '/vision_bundle.mjs');
    const ficheiros = await FilesetResolver.forVisionTasks(MP + '/wasm');
    const opcoes = delegate => ({
      baseOptions: { modelAssetPath: MODELO, delegate },
      runningMode: 'VIDEO', numPoses: 1,
      minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5, minTrackingConfidence: .5,
    });
    try { landmarker = await PoseLandmarker.createFromOptions(ficheiros, opcoes('GPU')); }
    catch (e) { landmarker = await PoseLandmarker.createFromOptions(ficheiros, opcoes('CPU')); }
    return landmarker;
  })();
  carregando.catch(() => { carregando = null; });
  return carregando;
}

// ---------- a prova ----------
const video = $('#video'), tela = $('#tela'), ctx = tela.getContext('2d');
let stream = null, correr = false, fase = 'parado', modoToque = false;
let fim = 0, vistoSeguido = 0, ultimoT = -1;
const sq = { estado: 'cima', minAng: 180, maxInclina: 0, ang: null };

function reinicia() {
  st.reps = 0; $('#reps').textContent = '0'; $('#tempo').textContent = '0:' + DURACAO;
  $('#barra').style.width = '0'; sq.estado = 'cima'; sq.minAng = 180; sq.maxInclina = 0; sq.ang = null;
  vistoSeguido = 0; fase = 'enquadrar'; falaAte = 0;
}
function estado(txt, ok) { const e = $('#estado'); e.textContent = txt; e.classList.toggle('ok', !!ok); e.hidden = !txt; }

$('#b-camara').addEventListener('click', async () => {
  preparaSom();
  const erro = $('#erro-camara'); erro.hidden = true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    erro.textContent = 'Este navegador não deixa usar a câmara. Abra o link no Safari ou no Chrome (no Instagram: menu ··· e «Abrir no navegador»).';
    erro.hidden = false; return;
  }
  const b = $('#b-camara'); b.disabled = true; b.textContent = 'A ligar…';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } }, audio: false });
    video.srcObject = stream; await video.play();
    modoToque = false; $('#toque').classList.remove('ativo');
    $('#camara').classList.add('ativo'); reinicia();
    estado('A carregar a deteção do corpo…');
    await carregaModelo();
    estado('Afaste-se até se ver da cabeça aos pés');
    correr = true; requestAnimationFrame(ciclo);
  } catch (e) {
    paraCamara();
    erro.textContent = e && e.name === 'NotAllowedError'
      ? 'A câmara não foi autorizada. Autorize-a nas definições do navegador e tente de novo, ou use a demonstração sem câmara.'
      : 'Não foi possível ligar a câmara ou carregar a deteção. Tente de novo, ou use a demonstração sem câmara.';
    erro.hidden = false;
  } finally { b.disabled = false; b.textContent = 'Ligar a câmara'; }
});

$('#b-toques').addEventListener('click', () => {
  preparaSom();
  modoToque = true; $('#camara').classList.add('ativo'); $('#toque').classList.add('ativo');
  reinicia(); ctx.clearRect(0, 0, tela.width, tela.height);
  estado('Demonstração: toque no ecrã a cada agachamento');
  contagemDecrescente();
});
$('#toque').addEventListener('pointerdown', () => {
  if (fase !== 'prova') return;
  if ((st.reps + 1) % 7 === 0 && !$('#toque').dataset.meio) { $('#toque').dataset.meio = '1'; fala('Desce mais um pouco, até a anca passar o joelho.'); return; }
  delete $('#toque').dataset.meio;
  contaRep();
});
$('#b-sair').addEventListener('click', () => { paraCamara(); mostra('e-prep'); });

function paraCamara() {
  correr = false; fase = 'parado';
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  video.srcObject = null;
  $('#camara').classList.remove('ativo'); $('#grande').hidden = true;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function contagemDecrescente() {
  fase = 'contagem'; const g = $('#grande'); let n = 3;
  estado(modoToque ? 'Demonstração: toque no ecrã a cada agachamento' : 'Vejo-o da cabeça aos pés', true);
  fala('Vamos lá. Três, dois, um.', true);
  g.hidden = false; g.textContent = n; bip(false);
  const t = setInterval(() => {
    n -= 1;
    if (n > 0) { g.textContent = n; bip(false); return; }
    clearInterval(t); g.hidden = true; bip(true);
    fase = 'prova'; fim = performance.now() + DURACAO * 1000;
    if (modoToque) requestAnimationFrame(relogioToque);
  }, 1000);
}
function relogioToque() { if (fase !== 'prova') return; atualizaRelogio(); requestAnimationFrame(relogioToque); }

let disse10 = false;
function atualizaRelogio() {
  const falta = Math.max(0, (fim - performance.now()) / 1000);
  const s = Math.ceil(falta);
  $('#tempo').textContent = '0:' + String(s).padStart(2, '0');
  $('#barra').style.width = ((1 - falta / DURACAO) * 100).toFixed(1) + '%';
  if (s === 10 && !disse10) { disse10 = true; fala('Últimos dez segundos. Não pare!', true); }
  if (falta <= 0) terminaProva();
}

function contaRep() {
  st.reps += 1; $('#reps').textContent = st.reps; bip(true);
  const frases = { 3: 'Isso mesmo. Mantenha o ritmo.', 8: 'Bom. Peito para cima.', 13: 'Está a ir muito bem.', 18: 'Continue, respire.', 24: 'Excelente ritmo!', 30: 'Isto já é nível de estúdio!' };
  if (frases[st.reps]) fala(frases[st.reps]);
  if (desafio && st.reps === desafio.reps + 1) fala('Passou o ' + desafio.nome + '!', true);
}

function terminaProva() {
  if (fase === 'fim') return;
  fase = 'fim'; disse10 = false;
  fala('Terminou. Muito bem!', true);
  setTimeout(() => { paraCamara(); mostraResultado(); }, 900);
}

// ---------- o corpo ----------
const LIG = [[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[11,13],[13,15],[12,14],[14,16],[27,31],[28,32]];
function angulo(a, b, c, k) {
  const abx = (a.x - b.x) * k, aby = a.y - b.y, cbx = (c.x - b.x) * k, cby = c.y - b.y;
  const cos = (abx * cbx + aby * cby) / (Math.hypot(abx, aby) * Math.hypot(cbx, cby) || 1);
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
}
const vis = p => p && (p.visibility === undefined ? 1 : p.visibility);

function ciclo() {
  if (!correr) return;
  if (video.readyState >= 2 && video.currentTime !== ultimoT && landmarker) {
    ultimoT = video.currentTime;
    let lm = null;
    try { lm = landmarker.detectForVideo(video, performance.now()).landmarks[0] || null; } catch (e) { lm = null; }
    trata(lm);
  }
  if (fase === 'prova') atualizaRelogio();
  requestAnimationFrame(ciclo);
}

function trata(lm) {
  desenha(lm);
  const k = (video.videoWidth || 1) / (video.videoHeight || 1);
  const inteiro = lm && vis(lm[0]) > .5 && (vis(lm[27]) > .5 || vis(lm[28]) > .5)
    && lm[0].y > 0 && Math.max(lm[27].y, lm[28].y) < 1.02;
  if (fase === 'enquadrar') {
    vistoSeguido = inteiro ? vistoSeguido + 1 : 0;
    if (!lm) estado('Não o vejo. Ponha-se à frente da câmara');
    else if (!inteiro) estado('Afaste-se: preciso de ver a cabeça e os pés');
    else estado('Vejo-o. Fique assim um segundo…', true);
    if (vistoSeguido > 18) contagemDecrescente();
    return;
  }
  if (fase !== 'prova') return;
  if (!inteiro) { estado('Afaste-se um pouco: os pés saíram da imagem'); return; }
  estado('');

  // o lado mais visível (ou a média, se os dois se veem)
  const lados = [[23,25,27,11],[24,26,28,12]].filter(([h,j,t]) => vis(lm[h]) > .5 && vis(lm[j]) > .5 && vis(lm[t]) > .5);
  if (!lados.length) return;
  const angs = lados.map(([h,j,t]) => angulo(lm[h], lm[j], lm[t], k));
  const bruto = angs.reduce((a, b) => a + b, 0) / angs.length;
  sq.ang = sq.ang === null ? bruto : sq.ang * .55 + bruto * .45;
  const [h, j, , o] = lados[0];
  const ancaAbaixo = lm[h].y >= lm[j].y - .02;
  const inclina = Math.abs(Math.atan2((lm[o].x - lm[h].x) * k, lm[h].y - lm[o].y)) * 180 / Math.PI;

  if (sq.estado === 'cima' && sq.ang < ANG_DESCE) { sq.estado = 'baixo'; sq.minAng = sq.ang; sq.maxInclina = inclina; sq.fundo = ancaAbaixo; }
  else if (sq.estado === 'baixo') {
    sq.minAng = Math.min(sq.minAng, sq.ang); sq.maxInclina = Math.max(sq.maxInclina, inclina); sq.fundo = sq.fundo || ancaAbaixo;
    if (sq.ang > ANG_CIMA) {
      sq.estado = 'cima';
      if (sq.minAng <= ANG_FUNDO || sq.fundo) {
        contaRep();
        if (sq.maxInclina > 55) fala('Peito para cima, costas direitas.');
      } else if (sq.minAng < ANG_MEIO) {
        fala('Desce mais um pouco, até a anca passar o joelho.');
      }
    }
  }
}

function desenha(lm) {
  const w = tela.clientWidth, h = tela.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (tela.width !== Math.round(w * dpr)) { tela.width = Math.round(w * dpr); tela.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  if (!lm || !video.videoWidth) return;
  const vw = video.videoWidth, vh = video.videoHeight, s = Math.max(w / vw, h / vh);
  const ox = (w - vw * s) / 2, oy = (h - vh * s) / 2;
  const P = p => [p.x * vw * s + ox, p.y * vh * s + oy];
  const boa = fase === 'prova' && sq.estado === 'baixo' && (sq.minAng <= ANG_FUNDO || sq.fundo);
  ctx.lineCap = 'round'; ctx.lineWidth = 7;
  ctx.strokeStyle = boa ? '#7DC242' : 'rgba(255,255,255,.85)';
  for (const [a, b] of LIG) {
    if (vis(lm[a]) < .5 || vis(lm[b]) < .5) continue;
    const [x1, y1] = P(lm[a]), [x2, y2] = P(lm[b]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.fillStyle = '#7DC242';
  for (const i of [23, 24, 25, 26, 27, 28]) {
    if (vis(lm[i]) < .5) continue;
    const [x, y] = P(lm[i]); ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- resultado ----------
function esperado(idade, sexo) { return Math.max(12, (sexo === 'm' ? 38 : 33) - .3 * (idade - 25)); }
function calcula() {
  const exp = esperado(st.idade, st.sexo);
  const razao = st.reps / exp;
  let adj = Math.max(-12, Math.min(12, -(razao - 1) * 12));
  adj += st.treinos === '0' ? 2 : st.treinos === '3' ? -2 : 0;
  if (st.cintura) {
    const [alto, medio] = st.sexo === 'm' ? [102, 94] : [88, 80];
    adj += st.cintura > alto ? 3 : st.cintura > medio ? 1.5 : 0;
  }
  const idadeF = Math.round(Math.max(18, Math.min(85, st.idade + adj)));
  const nivel = razao < .6 ? 1 : razao < .85 ? 2 : razao < 1.1 ? 3 : razao < 1.35 ? 4 : 5;
  const dec = Math.min(70, Math.floor(st.idade / 10) * 10);
  const media = Math.round(esperado(dec + 5, st.sexo));
  return { idadeF, nivel, razao, dec, media };
}
const FOCO = {
  peso: ['resistência', 'treinos curtos e intensos, para gastar mais em menos tempo'],
  forca: ['força das pernas', 'agachamentos com pausa e trabalho de tronco'],
  voltar: ['regularidade', 'três treinos curtos por semana, para criar o hábito'],
  costas: ['tronco e mobilidade da anca', 'exercícios de pilates clínico para proteger as costas'],
};
let res = null;
function mostraResultado() {
  res = calcula();
  $('#r-reps').textContent = st.reps;
  $('#r-idade-f').textContent = res.idadeF;
  $('#r-idade').textContent = st.idade;
  $('#r-titulo').textContent = res.idadeF < st.idade ? 'Está mais novo do que a idade' : res.idadeF === st.idade ? 'Está à medida da idade' : 'Há margem para ganhar anos';
  $('#r-nivel').textContent = res.nivel;
  document.querySelectorAll('#r-nivel-barra i').forEach((i, n) => i.classList.toggle('on', n < res.nivel));
  const linhas = [{ t: 'Você', v: st.reps, c: 'eu' }, { t: res.dec + ' a ' + (res.dec + 9) + ' anos', v: res.media, c: '' }];
  if (desafio) linhas.push({ t: desafio.nome, v: desafio.reps, c: 'amigo' });
  const max = Math.max(...linhas.map(l => l.v), 1);
  const cmp = $('#r-comparar'); cmp.textContent = '';
  for (const l of linhas) {
    const d = document.createElement('div'); d.className = 'lin ' + l.c;
    const a = document.createElement('span'); a.textContent = l.t;
    const b = document.createElement('span'); b.className = 'b';
    const bi = document.createElement('span'); bi.style.width = (l.v / max * 100).toFixed(0) + '%'; b.append(bi);
    const c = document.createElement('b'); c.textContent = l.v;
    d.append(a, b, c); cmp.append(d);
  }
  const [foco, como] = FOCO[st.objetivo] || FOCO.voltar;
  const t = $('#r-trabalhar'); t.textContent = '';
  const fb = document.createElement('b'); fb.textContent = 'O ponto a trabalhar: ' + foco + '.';
  t.append(fb, document.createTextNode(' O seu plano começa por ' + como + '.'));
  if (desafio) {
    const ganhou = st.reps > desafio.reps;
    fala(ganhou ? 'Ganhou o desafio!' : 'Quase. Desafie de volta!', true);
  }
  mostra('e-resultado');
}

// ---------- lugares livres (horário do «Pre Stage», segunda a quarta) ----------
const HORARIO = [
  { dia: 1, h: '18:00', aula: 'Crosstraining' }, { dia: 1, h: '19:00', aula: 'Crosstraining' }, { dia: 1, h: '19:50', aula: 'Crosstraining' },
  { dia: 2, h: '12:45', aula: 'Crosstraining' }, { dia: 2, h: '19:00', aula: 'Crosstraining' }, { dia: 2, h: '20:00', aula: 'Pilates clínico' },
  { dia: 3, h: '19:00', aula: 'Crosstraining' }, { dia: 3, h: '19:15', aula: 'Running Club' }, { dia: 3, h: '19:50', aula: 'Crosstraining' },
];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
function proximas() {
  const agora = new Date(), lista = [];
  for (let d = 0; d < 8; d++) {
    const dia = new Date(agora); dia.setDate(agora.getDate() + d);
    for (const a of HORARIO.filter(x => x.dia === dia.getDay())) {
      const [hh, mm] = a.h.split(':').map(Number);
      const quando = new Date(dia); quando.setHours(hh, mm, 0, 0);
      if (quando - agora < 2 * 3600e3) continue;
      const vagas = (dia.getDate() * 7 + hh + mm) % 4 + 1;
      lista.push({ ...a, quando, vagas, rot: d === 0 ? 'hoje' : d === 1 ? 'amanhã' : DIAS[dia.getDay()] + ', ' + dia.getDate() });
    }
  }
  const prefere = st.objetivo === 'costas' ? 'Pilates clínico' : 'Crosstraining';
  lista.sort((a, b) => (a.aula === prefere ? 0 : 1) - (b.aula === prefere ? 0 : 1) || a.quando - b.quando);
  // até três aulas, de preferência em dias diferentes
  const escolha = [], dias = new Set();
  for (const a of lista.filter(x => x.aula !== 'Running Club')) {
    const d = a.quando.toDateString();
    if (dias.has(d)) continue; dias.add(d); escolha.push(a); if (escolha.length === 3) break;
  }
  for (const a of lista.filter(x => x.aula !== 'Running Club')) { if (escolha.length >= 3) break; if (!escolha.includes(a)) escolha.push(a); }
  return escolha.sort((a, b) => a.quando - b.quando);
}
let escolhida = null;
const telOk = v => /^9\d{8}$/.test(v.replace(/\D/g, '').replace(/^351/, ''));
function validaVaga() { $('#b-confirmar').disabled = !(escolhida && telOk($('#tel-vaga').value)); }
$('#b-vagas').addEventListener('click', () => {
  const l = $('#lista-vagas'); l.textContent = ''; escolhida = null;
  for (const a of proximas()) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'vaga'; b.setAttribute('aria-pressed', 'false');
    const t = document.createElement('b'); t.textContent = a.aula + ', ' + a.rot + ' ' + a.h;
    const s = document.createElement('span'); s.textContent = a.vagas + (a.vagas === 1 ? ' lugar livre' : ' lugares livres') + ' · nível ' + Math.max(1, (res?.nivel || 2) - 1) + ' a ' + Math.min(5, (res?.nivel || 2) + 1);
    const e = document.createElement('em'); e.textContent = 'Escolher';
    b.append(t, s, e);
    b.addEventListener('click', () => { l.querySelectorAll('.vaga').forEach(x => x.setAttribute('aria-pressed', String(x === b))); escolhida = a; validaVaga(); });
    l.append(b);
  }
  $('#f-vagas').classList.add('ativo');
});
$('#tel-vaga').addEventListener('input', validaVaga);
$('#b-confirmar').addEventListener('click', () => {
  $('#f-vagas').classList.remove('ativo');
  $('#f-aula').textContent = escolhida.aula;
  $('#f-quando').textContent = escolhida.rot.charAt(0).toUpperCase() + escolhida.rot.slice(1) + ', às ' + escolhida.h;
  mostra('e-feito');
});

// ---------- plano e desafio ----------
$('#b-plano').addEventListener('click', () => {
  const [foco, como] = FOCO[st.objetivo] || FOCO.voltar;
  $('#p-plano').textContent = '3 treinos de 15 minutos por semana, em casa, com vídeos do Ivo. Começa pelo ' + foco + ': ' + como + '. Ao 14.º dia, repete a prova para ver a diferença.';
  $('#ok-plano').hidden = true; $('#f-plano').classList.add('ativo');
});
$('#b-enviar-plano').addEventListener('click', () => {
  if (!telOk($('#tel-plano').value)) { $('#tel-plano').focus(); return; }
  $('#ok-plano').hidden = false;
});

function linkDesafio() {
  const nome = $('#meu-nome').value.trim().slice(0, 24);
  const u = new URL(location.href); u.search = '';
  u.searchParams.set('d', st.reps); if (nome) u.searchParams.set('de', nome);
  return { url: u.toString(), texto: 'Fiz ' + st.reps + ' agachamentos em 45 segundos na Aula de Prova do Ivo Bento. Faz melhor?' };
}
$('#b-desafiar').addEventListener('click', () => { $('#txt-desafio').textContent = '«' + linkDesafio().texto + '»'; $('#ok-desafio').hidden = true; $('#f-desafio').classList.add('ativo'); });
$('#b-partilhar').addEventListener('click', async () => {
  const { url, texto } = linkDesafio();
  try {
    if (navigator.share) { await navigator.share({ title: 'Aula de Prova', text: texto, url }); return; }
    await navigator.clipboard.writeText(texto + ' ' + url); $('#ok-desafio').hidden = false;
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    $('#ok-desafio').textContent = texto + ' ' + url; $('#ok-desafio').hidden = false;
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
