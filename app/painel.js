// Área de cliente: Início, Liga Premium, Run Club (corridas tipo Strava) e Perfil.
import { MESES, META_MES, PREMIOS, carrega, guarda, registaEntrada, codigoValido, tabela, diasDoMes, nivel, ordinal, hojeISO } from './liga-dados.js';
import { sessao, sai, iniciais, guardaPendente, tiraPendente } from './sessao.js';
import { PERCURSOS, CORRIDAS } from './corridas-dados.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };

// ---------- sessão: sem sessão vai para a entrada; o QR lido antes fica guardado ----------
const qs = new URLSearchParams(location.search);
if (qs.get('entrada')) { guardaPendente(codigoValido(qs.get('entrada'))); history.replaceState(null, '', location.pathname + location.hash); }
const S = sessao();
if (!S) { location.replace('entrar.html'); await new Promise(() => {}); }

const L = carrega();
// cada cliente tem a sua Liga: o sócio de exemplo começa com dois treinos este mês, um cliente novo começa do zero
if (L.dono !== S.tel) {
  L.dono = S.tel; L.nome = S.nome;
  if (S.exemplo) { const h = new Date(); L.entradas = [4, 2].map(a => { const d = new Date(h); d.setDate(h.getDate() - a); return d; }).filter(d => d.getMonth() === h.getMonth()).map(d => hojeISO(d)); L.anoAntes = 47; }
  else { L.entradas = []; L.anoAntes = 0; }
  guarda(L);
} else if (L.nome !== S.nome) { L.nome = S.nome; guarda(L); }
const hoje = new Date(), ANO = hoje.getFullYear(), MES = hoje.getMonth(), DIA = hoje.getDate();
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
const primeiro = (S.nome || '').split(' ')[0];

// ---------- formatos ----------
const km = m => (m / 1000).toFixed(2).replace('.', ',');
const km1 = m => (m / 1000).toFixed(1).replace('.', ',');
const mmss = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
const dur = s => s >= 3600 ? Math.floor(s / 3600) + 'h' + String(Math.floor(s / 60) % 60).padStart(2, '0') : Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
const ritmo = (s, m) => m > 0 ? mmss(s / (m / 1000)) : '–:––';
const DIAS_SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const quandoTxt = d => { const dd = Math.round((new Date(hojeISO()) - new Date(hojeISO(d))) / 864e5); return (dd === 0 ? 'hoje' : dd === 1 ? 'ontem' : DIAS_SEM[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()].slice(0, 3)) + ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

// ---------- corridas ----------
const CHAVE_G = 'ivo-corridas-gravadas';
const gravadas = () => { try { return JSON.parse(localStorage.getItem(CHAVE_G)) || []; } catch (e) { return []; } };
function todas() {
  const base = S.exemplo ? CORRIDAS.map(c => {
    const p = PERCURSOS[c.perc], q = new Date(); q.setDate(q.getDate() - c.dias); const [h, m] = c.hora.split(':'); q.setHours(+h, +m, 0, 0);
    return { ...c, coords: p.coords, perfil: p.perfil, dist: p.dist, subida: p.subida, percurso: p.nome, quando: q, club: c.titulo.includes('Club') };
  }) : [];
  const g = gravadas().map(c => ({ ...c, quando: new Date(c.t), gravada: true }));
  return [...g, ...base].sort((a, b) => b.quando - a.quando);
}
function miniMapa(coords, w = 104, h = 78) {
  if (!coords || coords.length < 2) return '<svg viewBox="0 0 ' + w + ' ' + h + '"></svg>';
  const lat0 = coords[0][0] * Math.PI / 180, k = Math.cos(lat0);
  const xs = coords.map(c => c[1] * k), ys = coords.map(c => -c[0]);
  const mnx = Math.min(...xs), mxx = Math.max(...xs), mny = Math.min(...ys), mxy = Math.max(...ys);
  const esc = Math.min((w - 16) / (mxx - mnx || 1), (h - 16) / (mxy - mny || 1));
  const ox = (w - (mxx - mnx) * esc) / 2, oy = (h - (mxy - mny) * esc) / 2;
  const P = i => [(xs[i] - mnx) * esc + ox, (ys[i] - mny) * esc + oy];
  const d = coords.map((_, i) => (i ? 'L' : 'M') + P(i).map(v => v.toFixed(1)).join(' ')).join('');
  const [sx, sy] = P(0), [ex, ey] = P(coords.length - 1);
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="#7DC242" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + sx + '" cy="' + sy + '" r="3.4" fill="#F4F4F0"/><circle cx="' + ex + '" cy="' + ey + '" r="3.4" fill="#C9AE3C"/></svg>';
}
const doMes = c => c.quando.getFullYear() === ANO && c.quando.getMonth() === MES;

// ---------- navegação por separadores ----------
const VISTAS = ['inicio', 'liga', 'corridas', 'perfil'];
function vai() {
  const v = VISTAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'inicio';
  $$('.vista').forEach(x => x.classList.toggle('ativo', x.id === 'v-' + v));
  $$('.abas a').forEach(a => a.classList.toggle('ativo', a.dataset.v === v));
  window.scrollTo(0, 0);
}
addEventListener('hashchange', vai);
$$('[data-fecha]').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.fecha).classList.remove('ativo')));
$$('.folha').forEach(f => f.addEventListener('click', e => { if (e.target === f) f.classList.remove('ativo'); }));

// ---------- início ----------
const HORARIO = [[1,'18:00','CrossTraining'],[1,'19:00','CrossTraining'],[1,'19:50','CrossTraining'],[2,'12:45','CrossTraining'],[2,'19:00','CrossTraining'],[2,'20:00','Pilates Clínico'],[3,'19:00','CrossTraining'],[3,'19:15','Running Club'],[3,'19:50','CrossTraining'],[4,'12:45','CrossTraining'],[4,'19:00','CrossTraining'],[4,'19:50','CrossTraining'],[5,'07:00','CrossTraining'],[5,'19:00','CrossTraining'],[5,'20:00','Pilates Clínico'],[6,'09:00','CrossTraining'],[6,'10:00','CrossKids'],[6,'11:00','Pilates Clínico']];
function proximaAula() {
  const n = new Date();
  for (let d = 0; d < 8; d++) {
    const dia = new Date(n); dia.setDate(n.getDate() + d);
    for (const a of HORARIO.filter(x => x[0] === dia.getDay())) { const [h, m] = a[1].split(':'); const t = new Date(dia); t.setHours(+h, +m, 0, 0); if (t > n) return { t, a, d }; }
  }
  return null;
}
function desenhaInicio() {
  $('#hoje').textContent = DIAS_SEM[hoje.getDay()] + ', ' + DIA + ' de ' + MESES[MES];
  $('#t-ola').textContent = (S.novo ? 'Bem-vindo, ' : 'Olá, ') + primeiro;
  const ja = L.entradas.includes(hojeISO());
  $('#b-entrada').classList.toggle('feita', ja);
  $('#eb-t').textContent = ja ? 'Entrada de hoje registada' : 'Registar a entrada de hoje';
  $('#eb-s').textContent = ja ? 'Bom treino. Amanhã há mais.' : 'Lê o QR à porta, ou toca aqui';
  const eu = tabela(L, ANO, MES, DIA).find(x => x.eu);
  $('#i-mes').textContent = MESES[MES]; $('#i-lugar').textContent = ordinal(eu.lugar); $('#i-treinos').textContent = plural(eu.n, 'treino', 'treinos');
  const doMesC = todas().filter(doMes);
  $('#i-km').textContent = km1(doMesC.reduce((a, c) => a + c.dist, 0)); $('#i-corr').textContent = plural(doMesC.length, 'corrida', 'corridas');
  const p = proximaAula();
  if (p) { $('#i-aula').textContent = p.a[2] + ' · ' + p.a[1]; $('#i-aula-q').textContent = p.d === 0 ? 'hoje' : p.d === 1 ? 'amanhã' : DIAS_SEM[p.t.getDay()]; }
  const u = todas()[0], c = $('#i-ultima'); c.innerHTML = '';
  if (u) {
    c.innerHTML = miniMapa(u.coords, 120, 86);
    const t = el('div'); t.append(el('span', 'c-rot', 'Última corrida'), el('b', '', km(u.dist) + ' km'), el('span', '', ritmo(u.dur, u.dist) + ' /km · ' + quandoTxt(u.quando)));
    c.classList.remove('sem'); c.append(t); c.onclick = e => { e.preventDefault(); location.hash = 'corridas'; setTimeout(() => abreCorrida(u), 60); };
  } else {
    const t = el('div'); t.append(el('span', 'c-rot', 'Run Club'), el('b', '', 'Primeira corrida?'), el('span', '', 'Grava-a com o GPS do telemóvel, ou liga o teu Strava.'));
    c.classList.add('sem'); c.append(t);
  }
}

// ---------- liga ----------
const premioDe = (lugar, n) => lugar === 1 ? PREMIOS[0].o_que.toLowerCase() : lugar <= 3 ? PREMIOS[1].o_que.toLowerCase() : n >= META_MES ? 'o «Mês completo» e entrada no sorteio da t-shirt' : null;
function linhas(ol, lista) {
  ol.textContent = ''; let ant = 0;
  for (const x of lista.filter(x => x.lugar <= 8 || x.eu)) {
    if (x.lugar - ant > 1) ol.append(el('li', 'corte', '·  ·  ·'));
    const li = el('li', (x.lugar <= 3 ? 'top ' : '') + (x.eu ? 'eu' : ''));
    li.append(el('span', 'p', ordinal(x.lugar)), el('span', '', x.eu ? x.nome + ' (tu)' : x.nome), el('span', 'n', x.v !== undefined ? x.v : x.n));
    ol.append(li); ant = x.lugar;
  }
}
function desenhaLiga() {
  const lista = tabela(L, ANO, MES, DIA), eu = lista.find(x => x.eu), falta = diasDoMes(ANO, MES) - DIA;
  linhas($('#l-tabela'), lista);
  $('#l-mes').textContent = MESES[MES] + ' ' + ANO; $('#l-faltam').textContent = falta ? 'faltam ' + plural(falta, 'dia', 'dias') : 'último dia';
  $('#l-lugar').textContent = ordinal(eu.lugar); $('#l-treinos').textContent = plural(eu.n, 'treino', 'treinos'); $('#l-total').textContent = lista.length;
  const px = $('#l-prox'); px.textContent = '';
  if (eu.lugar === 1) px.textContent = 'Estás em 1.º lugar. Mantém o ritmo até ao fim do mês.';
  else { const a = lista[eu.lugar - 2], b = el('b', '', plural(Math.max(1, a.n - eu.n), 'treino', 'treinos')); px.append('Estás a ', b, ' de passar ' + a.nome + ' e subir para ' + ordinal(eu.lugar - 1) + '.'); }
  $('#l-meta').textContent = Math.min(eu.n, META_MES) + ' de ' + META_MES; $('#l-prog').style.width = Math.min(100, eu.n / META_MES * 100) + '%';
  const cal = $('#l-cal'); cal.textContent = '';
  ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].forEach(d => cal.append(el('span', 'sem', d)));
  for (let i = 0; i < (new Date(ANO, MES, 1).getDay() + 6) % 7; i++) cal.append(el('span', 'd vazio'));
  const pref = ANO + '-' + String(MES + 1).padStart(2, '0') + '-';
  for (let d = 1; d <= diasDoMes(ANO, MES); d++) cal.append(el('span', 'd' + (L.entradas.includes(pref + String(d).padStart(2, '0')) ? ' feito' : '') + (d === DIA ? ' hoje' : '') + (d > DIA ? ' futuro' : ''), d));
  const pl = $('#l-premios'); pl.textContent = '';
  PREMIOS.forEach(p => { const li = el('li'); li.append(el('b', '', p.quem), el('span', '', p.o_que)); pl.append(li); });
  const g = premioDe(eu.lugar, eu.n);
  $('#l-sms-q').textContent = diasDoMes(ANO, MES) + ' de ' + MESES[MES] + ', 21:00';
  $('#l-sms').textContent = cap(MESES[MES]) + ' fechou. Fizeste ' + plural(eu.n, 'treino', 'treinos') + ' e ficaste em ' + ordinal(eu.lugar) + ' lugar entre ' + lista.length + ' sócios.' + (g ? ' Ganhaste ' + g + '.' : ' Faltaram ' + plural(META_MES - eu.n, 'treino', 'treinos') + ' para o «Mês completo».');
  const tot = L.anoAntes + L.entradas.length, nv = nivel(tot);
  $('#l-selo').textContent = nv.atual.nome; const np = $('#l-nivel'); np.textContent = '';
  np.append(el('b', '', 'Nível ' + nv.atual.nome + ' · ' + plural(tot, 'treino', 'treinos') + ' este ano.'), nv.prox ? ' Faltam ' + (nv.prox.min - tot) + ' para o nível ' + nv.prox.nome + '.' : ' É o nível mais alto.');
}

// ---------- corridas ----------
const CLUBE = [['Sandra M.', 62], ['Rui T.', 54], ['Joana P.', 47], ['Diogo R.', 41], ['Catarina R.', 33], ['André T.', 28], ['Érica C.', 21], ['Hugo L.', 14]];
function desenhaCorridas() {
  const tc = todas(), mes = tc.filter(doMes);
  $('#r-km').textContent = km1(mes.reduce((a, c) => a + c.dist, 0)); $('#r-n').textContent = mes.length;
  const seg = mes.reduce((a, c) => a + c.dur, 0); $('#r-t').textContent = Math.floor(seg / 3600) + 'h' + String(Math.floor(seg / 60) % 60).padStart(2, '0');
  // 8 semanas
  const seg0 = new Date(hoje); seg0.setHours(0, 0, 0, 0); seg0.setDate(seg0.getDate() - ((seg0.getDay() + 6) % 7));
  const sem = Array.from({ length: 8 }, (_, i) => { const a = new Date(seg0); a.setDate(a.getDate() - 7 * (7 - i)); const b = new Date(a); b.setDate(b.getDate() + 7); return { a, v: tc.filter(c => c.quando >= a && c.quando < b).reduce((s, c) => s + c.dist, 0) / 1000 }; });
  const mx = Math.max(10, ...sem.map(s => s.v)), sv = $('#r-semanas'); let h = '';
  sem.forEach((s, i) => {
    const bh = s.v / mx * 78, x = 8 + i * 39;
    h += '<rect x="' + x + '" y="' + (92 - bh) + '" width="26" height="' + Math.max(2, bh) + '" rx="5" fill="' + (i === 7 ? '#7DC242' : 'rgba(125,194,66,.35)') + '"/>';
    if (s.v) h += '<text x="' + (x + 13) + '" y="' + (86 - bh) + '" text-anchor="middle">' + s.v.toFixed(0) + '</text>';
    h += '<text x="' + (x + 13) + '" y="110" text-anchor="middle">' + s.a.getDate() + '/' + (s.a.getMonth() + 1) + '</text>';
  });
  sv.innerHTML = h;
  // recordes
  let r5 = null, longe = 0, alto = 0;
  for (const c of tc) {
    longe = Math.max(longe, c.dist); alto = Math.max(alto, c.subida || 0);
    const cheios = c.parciais ? c.parciais.slice(0, Math.floor(c.dist / 1000)) : [];
    for (let i = 0; i + 5 <= cheios.length; i++) { const t = cheios.slice(i, i + 5).reduce((a, b) => a + b, 0); if (r5 === null || t < r5) r5 = t; }
  }
  const rc = $('#r-recordes'); rc.textContent = '';
  [['Melhor 5 km', r5 ? dur(r5) : '–'], ['Mais longe', longe ? km1(longe) + ' km' : '–'], ['Maior subida', alto ? '+' + alto + ' m' : '–']].forEach(([a, b]) => { const d = el('div'); d.append(el('span', '', a), el('b', '', b)); rc.append(d); });
  // clube
  $('#r-mes').textContent = MESES[MES];
  const f = DIA / diasDoMes(ANO, MES), meuKm = mes.reduce((a, c) => a + c.dist, 0) / 1000;
  const lista = CLUBE.map(([n, k]) => ({ nome: n, v: Math.round(k * f) + ' km', k: k * f })).concat([{ nome: S.nome.split(' ')[0] + ' ' + (S.nome.split(' ')[1] || '').charAt(0) + '.', v: meuKm.toFixed(0) + ' km', k: meuKm, eu: true }])
    .sort((a, b) => b.k - a.k).map((x, i) => ({ ...x, lugar: i + 1 }));
  linhas($('#r-tabela'), lista);
  // lista
  const ls = $('#r-lista'); ls.textContent = '';
  if (!tc.length) {
    const v = el('div', 'vazio-corr'); v.append(el('b', '', 'Ainda sem corridas'), el('span', '', 'Grava a primeira com o GPS do telemóvel, ou liga o teu Strava.')); ls.append(v);
  }
  for (const c of tc) {
    const b = el('button', 'corr'); b.type = 'button'; b.innerHTML = miniMapa(c.coords);
    const t = el('div', 'ct'); t.append(el('span', 'cq', quandoTxt(c.quando)), el('b', '', c.titulo));
    const n = el('div', 'cn'); [[km(c.dist), ' km'], [ritmo(c.dur, c.dist), ' /km'], [dur(c.dur), '']].forEach(([v, u]) => { const s = el('span'); s.append(el('strong', '', v), u); n.append(s); });
    t.append(n); if (c.club) t.append(el('span', 'cq club', 'Treino do Run Club · conta para a tabela'));
    b.append(t); b.addEventListener('click', () => abreCorrida(c)); ls.append(b);
  }
}

// ---------- detalhe, com o mapa ----------
let mapaD = null, camadaD = null;
const tiles = () => L_.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, className: 'mapa-escuro', attribution: '© OpenStreetMap' });
const L_ = window.L;
function abreCorrida(c) {
  $('#d-quando').textContent = quandoTxt(c.quando); $('#t-corrida').textContent = c.titulo;
  const num = $('#d-num'); num.textContent = '';
  [['Distância', km(c.dist) + ' km'], ['Tempo', dur(c.dur)], ['Ritmo', ritmo(c.dur, c.dist) + ' /km'], ['Subida', c.subida ? '+' + c.subida + ' m' : '–'], ['FC média', c.fc ? c.fc + ' bpm' : '–'], ['Percurso', c.percurso || 'Gravada na app']].forEach(([a, b]) => { const d = el('div'); d.append(el('b', '', b), el('span', '', a)); num.append(d); });
  $('#d-subida').textContent = c.subida ? '+' + c.subida + ' m' : 'sem dados';
  const alt = $('#d-alt');
  if (c.perfil && c.perfil.length > 1) {
    const mxD = c.perfil[c.perfil.length - 1][0], hs = c.perfil.map(p => p[1]), mn = Math.min(...hs), mx = Math.max(...hs);
    const P = p => [(p[0] / mxD * 320).toFixed(1), (84 - (p[1] - mn) / ((mx - mn) || 1) * 70).toFixed(1)];
    const linha = c.perfil.map((p, i) => (i ? 'L' : 'M') + P(p).join(' ')).join('');
    alt.innerHTML = '<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7DC242" stop-opacity=".55"/><stop offset="1" stop-color="#7DC242" stop-opacity="0"/></linearGradient></defs><path d="' + linha + 'L320 90L0 90Z" fill="url(#ga)"/><path d="' + linha + '" fill="none" stroke="#7DC242" stroke-width="2"/><text x="4" y="12" fill="#A3A8A2" font-size="10">' + mx + ' m</text><text x="4" y="86" fill="#A3A8A2" font-size="10">' + mn + ' m</text>';
  } else alt.innerHTML = '<text x="160" y="50" text-anchor="middle" fill="#A3A8A2" font-size="12">Altimetria disponível com o Strava ou o Garmin</text>';
  const pc = $('#d-parc'); pc.textContent = '';
  const ps = c.parciais || [], cheios = ps.slice(0, Math.floor(c.dist / 1000)), melhor = Math.min(...cheios), pior = Math.max(...ps.map((p, i) => i < cheios.length ? p : p / ((c.dist / 1000) % 1 || 1)));
  ps.forEach((p, i) => {
    const frac = i < cheios.length ? 1 : (c.dist / 1000) % 1 || 1, porKm = p / frac;
    const li = el('li', p === melhor && i < cheios.length ? 'melhor' : '');
    const b = el('span', 'pb'), bi = el('span'); bi.style.width = Math.max(18, (melhor / porKm) * 100).toFixed(0) + '%'; b.append(bi);
    li.append(el('span', '', frac < 1 ? (i + frac).toFixed(1).replace('.', ',') : String(i + 1)), b, el('b', '', mmss(porKm)));
    pc.append(li);
  });
  $('#f-corrida').classList.add('ativo');
  if (!L_) { $('#d-mapa').textContent = 'O mapa não carregou.'; return; }
  setTimeout(() => {
    if (!mapaD) { mapaD = L_.map('d-mapa', { zoomControl: false, attributionControl: true }); tiles().addTo(mapaD); }
    if (camadaD) camadaD.remove();
    camadaD = L_.layerGroup([
      L_.polyline(c.coords, { color: '#7DC242', weight: 4.5, opacity: .95 }),
      L_.circleMarker(c.coords[0], { radius: 6, color: '#0A0B0A', weight: 2, fillColor: '#F4F4F0', fillOpacity: 1 }),
      L_.circleMarker(c.coords[c.coords.length - 1], { radius: 6, color: '#0A0B0A', weight: 2, fillColor: '#C9AE3C', fillOpacity: 1 }),
    ]).addTo(mapaD);
    mapaD.invalidateSize(); mapaD.fitBounds(L_.latLngBounds(c.coords), { padding: [24, 24] });
  }, 60);
}

// ---------- gravar uma corrida com o GPS ----------
const R = { pontos: [], dist: 0, seg: 0, parciais: [], ultimoKm: 0, pausa: false, vigia: null, relogio: null, lock: null, simul: null, ultimoT: 0 };
let mapaG = null, linhaG = null, eu = null;
function hav(a, b) { const r = 6371000, t1 = a[0] * Math.PI / 180, t2 = b[0] * Math.PI / 180, dl = (b[0] - a[0]) * Math.PI / 180, dn = (b[1] - a[1]) * Math.PI / 180; const x = Math.sin(dl / 2) ** 2 + Math.cos(t1) * Math.cos(t2) * Math.sin(dn / 2) ** 2; return 2 * r * Math.asin(Math.sqrt(x)); }
function mostraNum() {
  $('#g-t').textContent = dur(R.seg); $('#g-d').textContent = km(R.dist);
  $('#g-r').textContent = R.dist > 30 ? ritmo(R.seg, R.dist) : '–:––';
}
function ponto(lat, lng) {
  const p = [lat, lng];
  if (R.pontos.length) {
    const d = hav(R.pontos[R.pontos.length - 1], p); if (d < 4) return;
    R.dist += d;
    while (R.dist >= (R.ultimoKm + 1) * 1000) { R.ultimoKm += 1; R.parciais.push(Math.round(R.seg - R.parciais.reduce((a, b) => a + b, 0))); }
  }
  R.pontos.push(p);
  if (mapaG) { linhaG.addLatLng(p); eu.setLatLng(p); mapaG.panTo(p, { animate: true }); }
  mostraNum();
}
async function abreGravar() {
  Object.assign(R, { pontos: [], dist: 0, seg: 0, parciais: [], ultimoKm: 0, pausa: false });
  $('#gravar').classList.add('ativo'); $('#g-pausa').textContent = 'Pausa'; mostraNum();
  const est = $('#g-estado'); est.textContent = 'À procura do GPS…'; est.classList.remove('ok');
  if (L_ && !mapaG) {
    mapaG = L_.map('g-mapa', { zoomControl: false }); tiles().addTo(mapaG);
    linhaG = L_.polyline([], { color: '#7DC242', weight: 5 }).addTo(mapaG);
    eu = L_.marker([41.2184, -8.4127], { icon: L_.divIcon({ className: '', html: '<div class="ponto-eu"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(mapaG);
  }
  if (mapaG) { linhaG.setLatLngs([]); mapaG.setView([41.2184, -8.4127], 16); setTimeout(() => mapaG.invalidateSize(), 60); }
  try { if ('wakeLock' in navigator) R.lock = await navigator.wakeLock.request('screen'); } catch (e) { R.lock = null; }
  R.ultimoT = performance.now();
  R.relogio = setInterval(() => { const n = performance.now(); if (!R.pausa && !R.simul) R.seg += (n - R.ultimoT) / 1000; R.ultimoT = n; mostraNum(); }, 500);
  if (!navigator.geolocation) { est.textContent = 'Este navegador não tem GPS. Usa a simulação.'; return; }
  R.vigia = navigator.geolocation.watchPosition(pos => {
    if (R.pausa || R.simul) return;
    if (pos.coords.accuracy > 35) { est.textContent = 'GPS fraco (±' + Math.round(pos.coords.accuracy) + ' m). Vai para céu aberto.'; return; }
    est.textContent = 'A gravar · GPS ±' + Math.round(pos.coords.accuracy) + ' m'; est.classList.add('ok');
    ponto(pos.coords.latitude, pos.coords.longitude);
  }, err => { est.textContent = err.code === 1 ? 'Sem autorização para o GPS. Autoriza nas definições, ou usa a simulação.' : 'Sem sinal de GPS. Tenta lá fora, ou usa a simulação.'; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
}
function paraTudo() {
  if (R.vigia !== null && navigator.geolocation) navigator.geolocation.clearWatch(R.vigia);
  clearInterval(R.relogio); clearInterval(R.simul); R.vigia = null; R.simul = null;
  try { R.lock && R.lock.release(); } catch (e) { /* nada */ } R.lock = null;
}
$('#b-gravar').addEventListener('click', abreGravar);
$('#g-pausa').addEventListener('click', () => { R.pausa = !R.pausa; $('#g-pausa').textContent = R.pausa ? 'Continuar' : 'Pausa'; $('#g-estado').textContent = R.pausa ? 'Em pausa' : 'A gravar'; });
$('#g-fim').addEventListener('click', () => {
  paraTudo(); $('#gravar').classList.remove('ativo');
  if (R.dist < 100) { alertaG('A corrida tinha menos de 100 metros e não foi guardada.'); return; }
  const resto = Math.round(R.seg - R.parciais.reduce((a, b) => a + b, 0)); if (R.dist % 1000 > 50) R.parciais.push(resto);
  const nova = { t: Date.now(), titulo: 'Corrida gravada', coords: R.pontos.map(p => [+p[0].toFixed(5), +p[1].toFixed(5)]), dist: Math.round(R.dist), dur: Math.round(R.seg), parciais: R.parciais, subida: 0 };
  const g = gravadas(); g.unshift(nova); try { localStorage.setItem(CHAVE_G, JSON.stringify(g.slice(0, 50))); } catch (e) { /* cheio */ }
  desenhaCorridas(); desenhaInicio(); abreCorrida({ ...nova, quando: new Date(nova.t), gravada: true });
});
function alertaG(t) { const v = el('div', 'vazio-corr'); v.append(el('b', '', 'Não guardada'), el('span', '', t)); const ls = $('#r-lista'); ls.prepend(v); setTimeout(() => v.remove(), 5000); }
$('#g-simular').addEventListener('click', () => {
  if (R.simul) return;
  if (R.vigia !== null && navigator.geolocation) navigator.geolocation.clearWatch(R.vigia); R.vigia = null;
  const cs = PERCURSOS.vila.coords; let i = 0;
  $('#g-estado').textContent = 'Simulação · Volta à vila, 25× mais rápido'; $('#g-estado').classList.add('ok');
  R.simul = setInterval(() => {
    if (R.pausa) return;
    if (i >= cs.length) { clearInterval(R.simul); R.simul = 1; $('#g-estado').textContent = 'Simulação terminada: carrega em Terminar'; return; }
    const antes = R.pontos.length ? R.pontos[R.pontos.length - 1] : null;
    if (antes) R.seg += hav(antes, cs[i]) / 1000 * (322 + Math.sin(i / 9) * 14);
    ponto(cs[i][0], cs[i][1]); i++;
  }, 180);
});

// ---------- entrada no estúdio ----------
function festa(antes) {
  desenhaLiga(); desenhaInicio();
  const e = tabela(L, ANO, MES, DIA).find(x => x.eu);
  $('#festa-n').textContent = e.n; $('#festa-t').textContent = ordinal(e.n) + ' treino de ' + MESES[MES];
  $('#festa-subiu').textContent = e.lugar < antes ? 'Subiste para ' + ordinal(e.lugar) + ' lugar' : 'Estás em ' + ordinal(e.lugar) + ' lugar';
  $('#festa-txt').textContent = e.n >= META_MES ? 'Já tens o «Mês completo». Agora é subir na tabela.' : 'Faltam ' + plural(META_MES - e.n, 'treino', 'treinos') + ' para o «Mês completo».';
  const f = $('#festa'); f.querySelectorAll('.confete').forEach(c => c.remove());
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) for (let i = 0; i < 36; i++) { const c = el('span', 'confete'); c.style.left = Math.random() * 100 + '%'; c.style.background = i % 3 ? '#7DC242' : '#C9AE3C'; c.style.animationDelay = Math.random() * .6 + 's'; c.style.animationDuration = 1.8 + Math.random() * 1.4 + 's'; f.append(c); }
  f.classList.add('ativo'); try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate([30, 40, 60]); } catch (e2) { /* nada */ }
}
function entraHoje() {
  const antes = tabela(L, ANO, MES, DIA).find(x => x.eu).lugar;
  if (!registaEntrada(L)) return 'Já registaste a entrada de hoje. Até amanhã!';
  $('#f-entrada').classList.remove('ativo'); festa(antes); return null;
}
const erroE = t => { const e = $('#erro-codigo'); e.textContent = t; e.hidden = false; $('#f-entrada').classList.add('ativo'); };
$('#b-entrada').addEventListener('click', () => { if (L.entradas.includes(hojeISO())) return; $('#codigo').value = ''; $('#erro-codigo').hidden = true; $('#f-entrada').classList.add('ativo'); setTimeout(() => $('#codigo').focus(), 50); });
$('#b-codigo').addEventListener('click', () => {
  const c = $('#codigo').value.replace(/\D/g, '');
  if (c.length !== 4) return erroE('O código tem 4 números. Está por baixo do QR, no ecrã da entrada.');
  if (!codigoValido(c)) return erroE('Este código já mudou. Os códigos mudam a cada 30 segundos: escreve o que está agora no ecrã.');
  const m = entraHoje(); if (m) erroE(m);
});
$('#b-simular').addEventListener('click', () => { const m = entraHoje(); if (m) erroE(m); });
$('#b-festa').addEventListener('click', () => $('#festa').classList.remove('ativo'));
$('#b-strava').addEventListener('click', () => $('#f-strava').classList.add('ativo'));

// ---------- perfil ----------
function desenhaPerfil() {
  $('#avatar').textContent = iniciais(S.nome); $('#p-av').textContent = iniciais(S.nome);
  $('#t-perfil').textContent = S.nome;
  const d = S.desde ? new Date(S.desde) : new Date();
  $('#p-desde').textContent = 'Sócio desde ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  $('#p-tel').textContent = (S.tel || '').replace(/(\d{3})(\d{3})(\d{3})/, '$1 ••• $3');
  $('#p-mods').textContent = (S.modalidades && S.modalidades.length) ? S.modalidades.join(', ') : '–';
  $('#p-ano').textContent = plural(L.anoAntes + L.entradas.length, 'treino', 'treinos');
}
$('#b-sair').addEventListener('click', () => { sai(); location.replace('entrar.html'); });

// ---------- arranque ----------
desenhaInicio(); desenhaLiga(); desenhaCorridas(); desenhaPerfil(); vai();
const pend = tiraPendente();
if (pend) { if (pend.valida) { const m = entraHoje(); if (m) erroE(m); } else erroE('O código do QR já tinha mudado. Lê-o de novo no ecrã da entrada.'); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
